// lib/discovery/scanners/blog-post.scanner.ts
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { mapBlogPostToPageData } from '../mappers/blog-post.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

/**
 * 扫描博客文章
 * 数据源：
 * - 基本信息：数据库 blog_posts 表
 * - 内容：R2 blog/${locale}/posts/${id}.md
 */
export async function scanBlogPosts(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取博客文章列表 (locale=${locale})`, 'info');

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 先获取总数
  const { count: totalCount, error: countError } = await supabase
    .from('blog_posts')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', SITE_ID)
    .eq('locale', locale);

  if (countError) {
    onProgress?.(`❌ 获取博客文章总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount || 0} 篇博客文章，分页处理中`, 'info');

  while (true) {
    const { data: posts, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('updated_at', { ascending: false });

    if (error) {
      onProgress?.(`❌ 查询博客文章表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!posts || posts.length === 0) break;

    // 查询当前批次已存在的 pages，用于跳过逻辑
    const postIds = posts.map(p => p.id);
    const pageIds = postIds.map(id => `blogPost:${id}`);
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

      // 检查是否可跳过
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
          // 内容留空，继续处理
        } else {
          onProgress?.(`❌ 读取云存储 MD 文件失败: ${err.message}，将仅使用数据库信息`, 'error');
          // 内容留空，继续处理
        }
      }

      try {
        // 使用 mapper 构建 PageData，传入数据库记录、MD 元数据和内容
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