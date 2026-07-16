// lib/discovery/scanners/product-category.scanner.ts
import { upsertPage } from '../register';
import { getProductsStorageKey, readR2Json } from './utils';
import { mapCategoryToPageData, mapSeriesToPageData } from '../mappers/product-category.mapper';
import type { ProgressCallback } from './types';

export async function scanProductCategories(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从 R2 读取产品分类: products/${locale}/categories.json`, 'info');
  const key = getProductsStorageKey(locale);
  let rawData: { categories: any[] };
  try {
    rawData = await readR2Json(key, { categories: [] });
  } catch (error: any) {
    onProgress?.(`❌ 读取 R2 文件失败: ${error.message}`, 'error');
    throw error;
  }
  const categories = rawData.categories || [];
  // 计算总条目数（一级 + 二级）
  let totalItems = 0;
  for (const cat of categories) {
    totalItems++; // 一级分类
    totalItems += (cat.series || []).length; // 二级分类
  }
  onProgress?.(`📊 发现 ${categories.length} 个一级分类，共 ${totalItems} 个条目`, 'info');

  let processed = 0,
    success = 0,
    failed = 0;

  for (const cat of categories) {
    const catId = cat.id;
    if (!catId) {
      onProgress?.(`⚠️ 一级分类缺少 id，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }
    const catSlug = cat.slug;
    if (!catSlug) {
      onProgress?.(`⚠️ 一级分类 ${cat.name || catId} 缺少 slug，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }

    // 处理一级分类
    try {
      const pageData = mapCategoryToPageData(cat);
      await upsertPage(pageData, locale);
      success++;
      onProgress?.(`  ✅ 一级分类: ${cat.name} (/${catSlug}) [进度: ${processed}/${totalItems} 成功:${success} 失败:${failed}]`, 'info');
    } catch (err: any) {
      failed++;
      onProgress?.(`  ❌ 一级分类: ${cat.name} (/${catSlug}) 失败: ${err.message} [进度: ${processed}/${totalItems} 成功:${success} 失败:${failed}]`, 'error');
    }
    processed++;

    // 二级分类
    const series = cat.series || [];
    if (series.length === 0) {
      onProgress?.(`    ℹ️ 一级分类 ${cat.name} 无二级分类`, 'info');
      continue;
    }
    onProgress?.(`    📂 发现 ${series.length} 个二级分类`, 'info');
    for (const sub of series) {
      const subId = sub.id;
      if (!subId) {
        onProgress?.(`      ⚠️ 二级分类缺少 id，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }
      const subSlug = sub.slug;
      if (!subSlug) {
        onProgress?.(`      ⚠️ 二级分类 ${sub.name || subId} 缺少 slug，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }
      try {
        const pageData = mapSeriesToPageData(catId, catSlug, sub);
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`      ✅ 二级分类: ${sub.name} (${pageData.url}) [进度: ${processed}/${totalItems} 成功:${success} 失败:${failed}]`, 'info');
      } catch (err: any) {
        failed++;
        onProgress?.(`      ❌ 二级分类: ${sub.name} (${pageData.url}) 失败: ${err.message} [进度: ${processed}/${totalItems} 成功:${success} 失败:${failed}]`, 'error');
      }
      processed++;
    }
  }
  onProgress?.(`✅ 产品分类扫描完成: 总条目 ${totalItems}，成功 ${success}，失败 ${failed}`, 'info');
}