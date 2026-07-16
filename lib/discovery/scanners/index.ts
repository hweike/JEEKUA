// lib/discovery/scanners/index.ts
import { scanProductLines } from './product-line.scanner';
import { scanProductCategories } from './product-category.scanner';
import { scanProducts } from './product.scanner';
import { scanBlogCategories } from './blog-category.scanner';
import { scanBlogPosts } from './blog-post.scanner';
import { scanDocLibraries } from './doc-library.scanner';
import { scanDocs } from './doc.scanner';
import { scanVideoCategories } from './video-category.scanner';
import { scanVideos } from './video.scanner';
import { scanStaticPages } from './static-page.scanner';
import type { ProgressCallback } from './types';

// 占位函数：固定页面仅保留 inquiry（其他固定页面如 home, blog 已在其他模块处理）
async function addFixedPages(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 添加固定页面: inquiry (占位，暂未实现)`, 'info');
  // TODO: 后续可在此添加 inquiry 页面注册逻辑
}

/**
 * 主入口：扫描指定语言的所有页面类型
 */
export async function scanAllForLocale(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`🚀 开始扫描站点 ${locale}`, 'info');
  await scanProductLines(locale, onProgress);
  await scanProducts(locale, onProgress);
  await scanProductCategories(locale, onProgress);
  await scanBlogCategories(locale, onProgress);
  await scanBlogPosts(locale, onProgress);
  await scanDocLibraries(locale, onProgress);
  await scanDocs(locale, onProgress);
  await scanVideoCategories(locale, onProgress);
  await scanVideos(locale, onProgress);
  await scanStaticPages(locale, onProgress);
  await addFixedPages(locale, onProgress);
  onProgress?.(`✅ 站点 ${locale} 扫描完成`, 'info');
}