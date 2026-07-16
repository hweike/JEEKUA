// lib/discovery/scanners/blog-category.scanner.ts
import { upsertPage } from '../register';
import { readR2Json } from './utils';
import { mapBlogCategoryToPageData } from '../mappers/blog-category.mapper';
import type { ProgressCallback } from './types';

/**
 * 扫描博客分类数据
 * 数据源：blog/${locale}/categories.json（R2）
 */
export async function scanBlogCategories(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从 R2 读取博客分类: blog/${locale}/categories.json`, 'info');
  const key = `blog/${locale}/categories.json`;
  let rawData: any[];
  try {
    rawData = await readR2Json(key, []);
  } catch (error: any) {
    onProgress?.(`❌ 读取 R2 文件失败: ${error.message}`, 'error');
    throw error;
  }

  const categories = rawData || [];
  const total = categories.length;
  onProgress?.(`📊 发现 ${total} 个博客分类`, 'info');

  let processed = 0,
    success = 0,
    failed = 0;

  for (const cat of categories) {
    const id = cat.id;
    if (!id) {
      onProgress?.(`⚠️ 博客分类缺少 id，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }
    const slug = cat.slug;
    if (!slug) {
      onProgress?.(`⚠️ 博客分类 ${cat.title || id} 缺少 slug，跳过`, 'warning');
      failed++;
      processed++;
      continue;
    }

    try {
      const pageData = mapBlogCategoryToPageData(cat);
      await upsertPage(pageData, locale);
      success++;
      onProgress?.(`  ✅ 博客分类: ${cat.title} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'info');
    } catch (err: any) {
      failed++;
      onProgress?.(`  ❌ 博客分类: ${cat.title} (${id}) 失败: ${err.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed}]`, 'error');
    }
    processed++;
  }

  onProgress?.(`✅ 博客分类扫描完成: 总共 ${total}，成功 ${success}，失败 ${failed}`, 'info');
}