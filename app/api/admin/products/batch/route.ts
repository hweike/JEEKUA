// app/api/admin/products/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { readProduct, writeProduct, deleteProduct } from '@/lib/products/mdParser';
import {
  upsertProductIndex,
  getProductIndex,
  getProductLineIdFromCategory,
  searchAllProducts,
  statusCountCache, // 新增导入
} from '@/lib/products/indexDb';
import { generateUniqueProductId } from '@/lib/utils/idGenerator';
import { updateProduct, deleteProductService } from '@/lib/products/services/product.service';

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
      const results = [];
      for (const productId of ids) {
        try {
          const updated = await updateProduct(locale, productId, { status });
          results.push({ productId, success: true });
        } catch (err: any) {
          console.error(`[批量操作] 产品 ${productId} 失败:`, err);
          results.push({ productId, success: false, error: err.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      const message = `状态更新成功 ${successCount} 个，失败 ${failCount} 个`;
      // 清除状态计数缓存
      statusCountCache.delete(`statusCount_${locale}`);
      return NextResponse.json({ message, results, success: failCount === 0 });
    }

    // 批量修改归属分类
    if (action === 'category') {
      if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 });
      const productLineId = await getProductLineIdFromCategory(locale, categoryId);
      if (!productLineId) return NextResponse.json({ error: '无效的分类，无法确定产品线' }, { status: 400 });
      const results = [];
      for (const productId of ids) {
        try {
          const updated = await updateProduct(locale, productId, {
            categoryId,
            seriesId: seriesId || '',
            productLineId,
          });
          results.push({ productId, success: true });
        } catch (err: any) {
          results.push({ productId, success: false, error: err.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      const message = `修改归属分类成功 ${successCount} 个，失败 ${failCount} 个`;
      // 清除状态计数缓存
      statusCountCache.delete(`statusCount_${locale}`);
      return NextResponse.json({ message, results, success: failCount === 0 });
    }

    // 批量修改页面模板
    if (action === 'template') {
      if (!templateId) return NextResponse.json({ error: 'templateId required' }, { status: 400 });
      const results = [];
      for (const productId of ids) {
        try {
          const updated = await updateProduct(locale, productId, { templateId });
          results.push({ productId, success: true });
        } catch (err: any) {
          results.push({ productId, success: false, error: err.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      const message = `页面模板更新成功 ${successCount} 个，失败 ${failCount} 个`;
      // 清除状态计数缓存
      statusCountCache.delete(`statusCount_${locale}`);
      return NextResponse.json({ message, results, success: failCount === 0 });
    }

    // 批量复制产品（保留路由层逻辑，因为服务层无直接复制功能）
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

        const originalParentIndex = await getProductIndex(productId, locale);
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
            const originalVariantIndex = await getProductIndex(originalVariant.id, locale);
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

      // 清除状态计数缓存
      statusCountCache.delete(`statusCount_${locale}`);
      return NextResponse.json({
        message: `成功复制 ${duplicatedParentIds.length} 个产品及所有变体`,
        duplicatedIds: duplicatedParentIds,
      });
    }

    // 批量删除产品（调用服务层）
    if (action === 'delete') {
      const results = [];
      for (const productId of ids) {
        try {
          await deleteProductService(locale, productId);
          results.push({ productId, success: true });
        } catch (err: any) {
          results.push({ productId, success: false, error: err.message });
        }
      }
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      const message = `成功删除 ${successCount} 个产品，失败 ${failCount} 个`;
      // 清除状态计数缓存
      statusCountCache.delete(`statusCount_${locale}`);
      if (failCount > 0) {
        return NextResponse.json({ message, results, success: false }, { status: 207 });
      }
      return NextResponse.json({ message, results, success: true });
    }

    return NextResponse.json({ error: '无效的 action' }, { status: 400 });
  } catch (error) {
    console.error('Batch update error:', error);
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 });
  }
}