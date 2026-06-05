import { NextRequest, NextResponse } from 'next/server';
import { readProduct, writeProduct, deleteProduct } from '@/lib/products/mdParser';
import {
  upsertProductIndex,
  getProductIndex,
  getProductLineIdFromCategory,
  deleteProductIndex,
  getChildrenProducts,
  searchAllProducts,   // 用于获取所有产品ID（异步）
} from '@/lib/products/indexDb';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';

// 获取所有现存的 productId（用于唯一性校验）- 异步版本
async function getAllExistingProductIds(locale: string): Promise<Set<string>> {
  // 分页获取所有产品，最多 10000 条
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

    // ==================== 批量更新状态 ====================
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

    // ==================== 批量修改归属分类 ====================
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

    // ==================== 批量修改页面模板 ====================
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

    // ==================== 批量复制产品（父产品 + 所有变体） ====================
    if (action === 'duplicate') {
      const existingIds = await getAllExistingProductIds(locale);
      const duplicatedParentIds: string[] = [];

      for (const productId of ids) {
        const originalParent = await readProduct(locale, productId);
        if (!originalParent || originalParent.parent_product_id) continue; // 只复制父产品

        // 生成新父产品ID
        const newParentId = await generateUniqueProductId(async () => Array.from(existingIds));
        existingIds.add(newParentId);

        // 深拷贝父产品数据
        const newParent = JSON.parse(JSON.stringify(originalParent));
        delete newParent.id;
        newParent.productId = newParentId;
        newParent.status = 'draft';
        newParent.createdAt = new Date().toISOString();
        newParent.updatedAt = new Date().toISOString();
        newParent.parent_product_id = '';

        // 复制 variants 数组：为每个变体生成新 ID
        if (newParent.variants && Array.isArray(newParent.variants)) {
          const newVariants = [];
          for (const variant of newParent.variants) {
            const newVariantId = await generateUniqueProductId(async () => Array.from(existingIds));
            existingIds.add(newVariantId);
            newVariants.push({
              ...variant,
              id: newVariantId,
            });
          }
          newParent.variants = newVariants;
        }

        // 写入 MD 文件
        await writeProduct(locale, newParentId, newParent, originalParent.content || '');

        // 复制父产品索引
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

        // 复制每个变体的索引
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
              // 手动创建基础索引
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

    // ==================== 批量删除产品 ====================
    if (action === 'delete') {
      let deletedCount = 0;
      for (const productId of ids) {
        // 删除变体索引（变体无独立 MD，仅删除索引）
        const children = await getChildrenProducts(productId);
        for (const child of children) {
          await deleteProductIndex(child.productId);
          deletedCount++;
        }
        // 删除父产品 MD 文件和索引
        await deleteProduct(locale, productId);
        await deleteProductIndex(productId);
        deletedCount++;
      }
      return NextResponse.json({ message: `成功删除 ${deletedCount} 个产品` });
    }

    return NextResponse.json({ error: '无效的 action' }, { status: 400 });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}