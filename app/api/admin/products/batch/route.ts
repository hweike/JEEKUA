import { NextRequest, NextResponse } from 'next/server';
import { readProduct, writeProduct, deleteProduct } from '@/lib/products/mdParser';
import {
  upsertProductIndex,
  getProductIndex,
  getProductLineIdFromCategory,
  deleteProductIndex,
  getChildrenProducts,
  searchAllProducts,
} from '@/lib/products/indexDb';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';

async function getAllExistingProductIds(locale: string): Promise<Set<string>> {
  let allItems: any[] = [];
  let page = 1;
  const size = 1000;
  let hasMore = true;
  while (hasMore) {
    const { items, total } = await searchAllProducts(locale, undefined, undefined, undefined, page, size);
    allItems = allItems.concat(items);
    if (page * size >= total) hasMore = false;
    page++;
  }
  return new Set(allItems.map(item => item.productId));
}

export async function PUT(request: NextRequest) {
  try {
    const { action, ids, locale, status, categoryId, seriesId, templateId } = await request.json();
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 });
    }
    if (!locale) {
      return NextResponse.json({ error: 'locale required' }, { status: 400 });
    }

    // 批量更新状态
    if (action === 'status') {
      if (!status) return NextResponse.json({ error: 'status required' }, { status: 400 });
      for (const productId of ids) {
        const product = await readProduct(locale, productId);
        if (!product) continue;
        product.status = status;
        await writeProduct(locale, productId, product, product.content || '');
        const index = await getProductIndex(productId);
        if (index) {
          await upsertProductIndex({
            ...index,
            status,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return NextResponse.json({ message: '状态更新成功' });
    }

    // 批量修改归属分类
    if (action === 'category') {
      if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 });
      const productLineId = await getProductLineIdFromCategory(locale, categoryId);
      if (!productLineId) return NextResponse.json({ error: '无效的分类，无法确定产品线' }, { status: 400 });
      for (const productId of ids) {
        const product = await readProduct(locale, productId);
        if (!product) continue;
        product.categoryId = categoryId;
        product.seriesId = seriesId || '';
        product.productLineId = productLineId;
        await writeProduct(locale, productId, product, product.content || '');
        const index = await getProductIndex(productId);
        if (index) {
          await upsertProductIndex({
            ...index,
            categoryId,
            seriesId: seriesId || null,
            productLineId,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return NextResponse.json({ message: '修改归属分类成功' });
    }

    // 批量修改页面模板
    if (action === 'template') {
      if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });
      for (const productId of ids) {
        const product = await readProduct(locale, productId);
        if (!product) continue;
        product.templateId = templateId;
        await writeProduct(locale, productId, product, product.content || '');
        const index = await getProductIndex(productId);
        if (index) {
          await upsertProductIndex({
            ...index,
            templateId,
            updatedAt: new Date().toISOString(),
          });
        }
      }
      return NextResponse.json({ message: '页面模板更新成功' });
    }

    // 批量复制产品
    if (action === 'duplicate') {
      const existingIds = await getAllExistingProductIds(locale);
      const duplicatedParentIds: string[] = [];

      for (const productId of ids) {
        const originalParent = await readProduct(locale, productId);
        if (!originalParent || originalParent.parent_product_id) continue;

        const newParentId = await generateUniqueProductId(async () => Array.from(existingIds));
        existingIds.add(newParentId);

        const newParent = JSON.parse(JSON.stringify(originalParent));
        delete newParent.id;
        newParent.productId = newParentId;
        newParent.status = 'draft';
        newParent.createdAt = new Date().toISOString();
        newParent.updatedAt = new Date().toISOString();
        newParent.parent_product_id = '';

        if (newParent.variants && Array.isArray(newParent.variants)) {
          const newVariants = [];
          for (const variant of newParent.variants) {
            const newVariantId = await generateUniqueProductId(async () => Array.from(existingIds));
            existingIds.add(newVariantId);
            newVariants.push({ ...variant, id: newVariantId });
          }
          newParent.variants = newVariants;
        }

        await writeProduct(locale, newParentId, newParent, originalParent.content || '');

        const originalParentIndex = await getProductIndex(productId);
        if (originalParentIndex) {
          const newParentIndex = {
            ...originalParentIndex,
            productId: newParentId,
            sku: newParent.sku,
            product_name: newParent.product_name,
            status: newParent.status,
            parent_product_id: null,
            createdAt: newParent.createdAt,
            updatedAt: newParent.updatedAt,
          };
          await upsertProductIndex(newParentIndex);
        }

        if (originalParent.variants && originalParent.variants.length > 0) {
          for (let i = 0; i < originalParent.variants.length; i++) {
            const originalVariant = originalParent.variants[i];
            const newVariantId = newParent.variants[i].id;
            const originalVariantIndex = await getProductIndex(originalVariant.id);
            if (originalVariantIndex) {
              const newVariantIndex = {
                ...originalVariantIndex,
                productId: newVariantId,
                sku: newParent.variants[i].sku,
                product_name: newParent.variants[i].product_name,
                status: 'draft',
                parent_product_id: newParentId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
              await upsertProductIndex(newVariantIndex);
            } else {
              await upsertProductIndex({
                productId: newVariantId,
                locale,
                productLineId: newParent.productLineId,
                categoryId: newParent.categoryId,
                seriesId: newParent.seriesId,
                parent_product_id: newParentId,
                sku: newParent.variants[i].sku,
                product_name: newParent.variants[i].product_name,
                brand: newParent.brand,
                price_tiers: [],
                currency: newParent.currency,
                availability: 'in_stock',
                min_order_quantity: 1,
                main_image_url: newParent.variants[i].main_image_url || '',
                attributes: newParent.variants[i].attributes || {},
                slug: newParent.variants[i].slug,
                status: 'draft',
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              });
            }
          }
        }

        duplicatedParentIds.push(newParentId);
      }

      return NextResponse.json({
        message: `成功复制 ${duplicatedParentIds.length} 个产品及所有变体`,
        duplicatedIds: duplicatedParentIds,
      });
    }

    // 批量删除产品（增强错误处理）
    if (action === 'delete') {
      let deletedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const productId of ids) {
        try {
          // 删除变体索引
          const children = await getChildrenProducts(productId);
          for (const child of children) {
            try {
              await deleteProductIndex(child.productId);
              deletedCount++;
            } catch (err: any) {
              console.error(`删除变体索引失败: ${child.productId}`, err);
              errors.push(`变体 ${child.productId}: ${err.message}`);
              failedCount++;
            }
          }
          // 删除父产品 MD 文件和索引
          await deleteProduct(locale, productId);
          try {
            await deleteProductIndex(productId);
            deletedCount++;
          } catch (err: any) {
            console.error(`删除父产品索引失败: ${productId}`, err);
            errors.push(`父产品 ${productId}: ${err.message}`);
            failedCount++;
          }
        } catch (err: any) {
          console.error(`处理产品 ${productId} 删除时出错`, err);
          errors.push(`产品 ${productId}: ${err.message}`);
          failedCount++;
        }
      }

      const message = `成功删除 ${deletedCount} 个产品，失败 ${failedCount} 个`;
      if (failedCount > 0) {
        console.error('删除失败详情:', errors);
        return NextResponse.json({ message, errors, success: false }, { status: 207 }); // 207 Multi-Status
      }
      return NextResponse.json({ message, success: true });
    }

    return NextResponse.json({ error: '无效的 action' }, { status: 400 });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}