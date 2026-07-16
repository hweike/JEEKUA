// lib/discovery/scanners/product-line.scanner.ts
import { upsertPage } from '../register';
import { getProductsStorageKey, readR2Json } from './utils';
import { mapProductLineToPageData } from '../mappers/product-line.mapper';
import type { ProgressCallback } from './types';

export async function scanProductLines(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从 R2 读取产品线数据: products/${locale}/categories.json`, 'info');
  const key = getProductsStorageKey(locale);
  let rawData: { productLines: any[] };
  try {
    rawData = await readR2Json(key, { productLines: [] });
  } catch (error: any) {
    onProgress?.(`❌ 读取 R2 文件失败: ${error.message}`, 'error');
    throw error;
  }
  const productLines = rawData.productLines || [];
  const total = productLines.length;
  onProgress?.(`📊 发现 ${total} 条产品线`, 'info');

  let processed = 0,
    success = 0,
    failed = 0;
  for (const line of productLines) {
    const id = line.id;
    if (!id) {
      onProgress?.(`⚠️ 产品线缺少 id，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }
    const slug = line.slug || id;
    if (!line.slug) {
      onProgress?.(`⚠️ 产品线 ${line.name} 缺少 slug，将使用 id 作为 slug`, 'warning');
    }
    try {
      const pageData = mapProductLineToPageData(line);
      await upsertPage(pageData, locale);
      success++;
      onProgress?.(`  ✅ 产品线: ${line.name} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'info');
    } catch (err: any) {
      failed++;
      onProgress?.(`  ❌ 产品线: ${line.name} (${id}) 失败: ${err.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'error');
    }
    processed++;
  }
  onProgress?.(`✅ 产品线扫描完成: 总共 ${total}，成功 ${success}，失败 ${failed}`, 'info');
}