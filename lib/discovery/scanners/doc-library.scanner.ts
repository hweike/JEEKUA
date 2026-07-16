import { upsertPage } from '../register';
import { readR2Json } from './utils';
import { mapDocLibraryToPageData } from '../mappers/doc-library.mapper';
import type { ProgressCallback } from './types';

/**
 * 扫描文档库（全局共享，不区分语言）
 * 数据源：docs/libs.json（R2）
 * 注册到 pages 表时，使用固定 locale = 'global'，避免重复
 */
export async function scanDocLibraries(locale: string, onProgress?: ProgressCallback): Promise<void> {
  // 注意：虽然传入 locale，但实际使用固定值 'global'
  const targetLocale = 'global';
  onProgress?.(`📁 从 R2 读取文档库数据: docs/libs.json (全局，locale=${targetLocale})`, 'info');
  const key = 'docs/libs.json';
  let libraries: any[];
  try {
    libraries = await readR2Json(key, []);
  } catch (error: any) {
    onProgress?.(`❌ 读取 R2 文件失败: ${error.message}`, 'error');
    throw error;
  }

  const total = libraries.length;
  onProgress?.(`📊 发现 ${total} 个文档库`, 'info');

  let processed = 0,
    success = 0,
    failed = 0;

  for (const lib of libraries) {
    const id = lib.id;
    if (!id) {
      onProgress?.(`⚠️ 文档库缺少 id，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }
    const slug = lib.slug;
    if (!slug) {
      onProgress?.(`⚠️ 文档库 ${lib.name || id} 缺少 slug，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }

    try {
      const pageData = mapDocLibraryToPageData(lib);
      await upsertPage(pageData, targetLocale);
      success++;
      onProgress?.(`  ✅ 文档库: ${lib.name} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'info');
    } catch (err: any) {
      failed++;
      onProgress?.(`  ❌ 文档库: ${lib.name} (${id}) 失败: ${err.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'error');
    }
    processed++;
  }

  onProgress?.(`✅ 文档库扫描完成: 总共 ${total}，成功 ${success}，失败 ${failed} (locale=${targetLocale})`, 'info');
}