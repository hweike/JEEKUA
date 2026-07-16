// lib/discovery/scanners/video-category.scanner.ts
import { upsertPage } from '../register';
import { readR2Json } from './utils';
import { mapVideoCategoryToPageData } from '../mappers/video-category.mapper';
import type { ProgressCallback } from './types';

/**
 * 扫描视频分类
 * 数据源：videosys/${locale}/categories.json（R2）
 * 格式：对象 { "id": { name, slug, ... } }
 */
export async function scanVideoCategories(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从 R2 读取视频分类: videosys/${locale}/categories.json`, 'info');
  const key = `videosys/${locale}/categories.json`;
  let rawData: Record<string, any>;
  try {
    rawData = await readR2Json(key, {});
  } catch (error: any) {
    onProgress?.(`❌ 读取 R2 文件失败: ${error.message}`, 'error');
    throw error;
  }

  const entries = Object.entries(rawData);
  const total = entries.length;
  onProgress?.(`📊 发现 ${total} 个视频分类`, 'info');

  let processed = 0,
    success = 0,
    failed = 0;

  for (const [id, cat] of entries) {
    if (!id) {
      onProgress?.(`⚠️ 视频分类 id 为空，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }
    const slug = cat.slug;
    if (!slug) {
      onProgress?.(`⚠️ 视频分类 ${cat.name || id} 缺少 slug，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }

    try {
      const pageData = mapVideoCategoryToPageData(cat, id);
      await upsertPage(pageData, locale);
      success++;
      onProgress?.(`  ✅ 视频分类: ${cat.name} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'info');
    } catch (err: any) {
      failed++;
      onProgress?.(`  ❌ 视频分类: ${cat.name} (${id}) 失败: ${err.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'error');
    }
    processed++;
  }

  onProgress?.(`✅ 视频分类扫描完成: 总共 ${total}，成功 ${success}，失败 ${failed}`, 'info');
}