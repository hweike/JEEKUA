// lib/discovery/scanners/blog-post.scanner.ts
import matter from 'gray-matter';
import sql from '@/lib/db/admin';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { mapBlogPostToPageData } from '../mappers/blog-post.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

export async function scanBlogPosts(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取博客文章列表 (locale=${locale})`, 'info');

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 1. 获取总数
  let totalCount = 0;
  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.blog_posts
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
    `;
    totalCount = parseInt(countRows[0]?.count || '0', 10);
  } catch (countError: any) {
    onProgress?.(`❌ 获取博客文章总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount} 篇博客文章，分页处理中`, 'info');

  while (true) {
    let posts: any[];
    try {
      posts = await sql<any[]>`
        SELECT * FROM public.blog_posts
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
        ORDER BY updated_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}
      `;
    } catch (error: any) {
      onProgress?.(`❌ 查询博客文章表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!posts || posts.length === 0) break;

    // 2. 查询当前批次的现有 pages
    const postIds = posts.map((p) => p.id);
    const pageIds = postIds.map((id) => `blogPost:${id}`);
    const pageMap = new Map<string, { updatedAt: string; content_hash: string }>();
    try {
      const existingPages = await sql<{ id: string; updatedAt: string; content_hash: string }[]>`
        SELECT id, "updatedAt", content_hash FROM public.pages
        WHERE id IN ${sql(pageIds)}
          AND site_id = ${SITE_ID}
          AND locale = ${locale}
      `;
      for (const p of existingPages) {
        pageMap.set(p.id, { updatedAt: p.updatedAt, content_hash: p.content_hash });
      }
    } catch (pagesError: any) {
      onProgress?.(`⚠️ 查询现有页面失败: ${pagesError.message}，将强制全部重新处理`, 'warning');
    }

    let processed = 0,
      success = 0,
      failed = 0,
      skipped = 0;
    const total = posts.length;

    for (const post of posts) {
      const postId = post.id;
      if (!postId) {
        onProgress?.(`⚠️ 博客文章缺少 id，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }

      const pageId = `blogPost:${postId}`;
      const postUpdatedAt = post.updated_at || new Date().toISOString();

      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= postUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${post.title} (${postId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      // 尝试读取 MD 内容
      const mdKey = `blog/${locale}/posts/${postId}.md`;
      let mdContent: string = '';
      let mdData: any = {};

      try {
        const raw = await storage.read(mdKey, 'utf8');
        const parsed = matter(raw);
        mdData = parsed.data || {};
        mdContent = parsed.content || '';
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.message?.includes('File not found')) {
          onProgress?.(`⚠️ MD 文件不存在: ${mdKey}，将仅使用数据库信息`, 'warning');
        } else {
          onProgress?.(`❌ 读取云存储 MD 文件失败: ${err.message}，将仅使用数据库信息`, 'error');
        }
      }

      try {
        const pageData = mapBlogPostToPageData(post, mdData, mdContent);
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`  ✅ 博客文章: ${pageData.title} (${postId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
      } catch (upsertErr: any) {
        failed++;
        onProgress?.(`  ❌ 博客文章: ${post.title} (${postId}) 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
      }
      processed++;
    }

    totalProcessed += processed;
    totalSuccess += success;
    totalFailed += failed;
    totalSkipped += skipped;
    onProgress?.(`📄 批次 ${page + 1} 完成: 本批 ${total} 条，成功 ${success}，失败 ${failed}，跳过 ${skipped}`, 'info');

    page++;
  }

  onProgress?.(`✅ 博客文章扫描完成: 总处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}，跳过 ${totalSkipped}`, 'info');
}