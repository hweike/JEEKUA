// lib/discovery/scanners/product.scanner.ts
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { mapProductToPageData, mapVariantToPageData } from '../mappers/product.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

export async function scanProducts(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取父产品列表 (locale=${locale})`, 'info');

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 先获取总数以便显示
  const { count: totalCount, error: countError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .is('parent_product_id', null);

  if (countError) {
    onProgress?.(`❌ 获取产品总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount || 0} 个父产品，分页处理中`, 'info');

  while (true) {
    const { data: parentProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .is('parent_product_id', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      onProgress?.(`❌ 查询产品表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!parentProducts || parentProducts.length === 0) break;

    // 查询当前批次的现有页面
    const productIds = parentProducts.map(p => p.productId);
    const pageIds = productIds.map(id => `product:${id}`);
    const { data: existingPages, error: pagesError } = await supabase
      .from('pages')
      .select('id, updatedAt, content_hash')
      .in('id', pageIds)
      .eq('site_id', SITE_ID)
      .eq('locale', locale);

    const pageMap = new Map<string, { updatedAt: string; content_hash: string }>();
    if (!pagesError && existingPages) {
      for (const p of existingPages) {
        pageMap.set(p.id, { updatedAt: p.updatedAt, content_hash: p.content_hash });
      }
    } else if (pagesError) {
      onProgress?.(`⚠️ 查询现有页面失败: ${pagesError.message}，将强制全部重新处理`, 'warning');
    }

    let processed = 0,
      success = 0,
      failed = 0,
      skipped = 0;
    const total = parentProducts.length;

    for (const product of parentProducts) {
      const productId = product.productId;
      if (!productId) {
        onProgress?.(`⚠️ 产品记录缺少 productId，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }

      const pageId = `product:${productId}`;
      const productUpdatedAt = product.updatedAt || new Date().toISOString();

      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= productUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${product.product_name} (${productId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      const mdKey = `products/${locale}/products/${productId}.md`;
      let mdContent: string = '';
      let mdData: any = {};

      try {
        const raw = await storage.read(mdKey, 'utf8');
        const parsed = matter(raw);
        mdData = parsed.data || {};
        mdContent = parsed.content || '';
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.message?.includes('File not found')) {
          onProgress?.(`⚠️ MD 文件不存在: ${mdKey}，根据数据库生成基础页面`, 'warning');
          // mdData 和 mdContent 保持空，后续使用 product 后备
        } else {
          onProgress?.(`❌ 读取云存储 MD 文件失败: ${err.message}，将使用数据库信息`, 'error');
          // 同样使用空 mdData，product 作为后备
        }
      }

      // 使用 mapper 构建主产品 PageData
      const pageData = mapProductToPageData(
        product,
        mdData,
        mdContent,
        productUpdatedAt
      );

      try {
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`  ✅ 产品: ${pageData.title} (${productId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
      } catch (upsertErr: any) {
        failed++;
        onProgress?.(`  ❌ 产品: ${product.product_name} (${productId}) 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
      }
      processed++;

      // 处理变体（使用 mapper）
      for (const variant of (mdData.variants || [])) {
        const varId = variant.id;
        if (!varId) continue;

        const variantPageData = mapVariantToPageData(
          productId,
          variant,
          mdData,
          productUpdatedAt
        );

        try {
          await upsertPage(variantPageData, locale);
          success++;
          onProgress?.(`    ↪ 变体: ${variantPageData.title} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        } catch (upsertErr: any) {
          failed++;
          onProgress?.(`    ❌ 变体: ${variantPageData.title} 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
        }
      }
    }

    totalProcessed += processed;
    totalSuccess += success;
    totalFailed += failed;
    totalSkipped += skipped;
    onProgress?.(`📄 批次 ${page + 1} 完成: 本批 ${total} 条，成功 ${success}，失败 ${failed}，跳过 ${skipped}`, 'info');

    page++;
  }

  onProgress?.(`✅ 产品扫描完成: 总处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}，跳过 ${totalSkipped}`, 'info');
}