// lib/discovery/scanners/video.scanner.ts
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { readR2Json } from './utils';
import { mapVideoToPageData } from '../mappers/video.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

/**
 * 扫描视频
 * 数据源：
 * - 索引：数据库 videos 表
 * - 内容：R2 videosys/${locale}/${id}.md（可选）
 * - 分类映射：从 videosys/${locale}/categories.json 加载 (category_key -> slug)
 */
export async function scanVideos(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取视频列表 (locale=${locale})`, 'info');

  // 1. 加载分类映射 (category_key -> slug)
  const catKey = `videosys/${locale}/categories.json`;
  let catMap = new Map<string, string>();
  try {
    const cats = await readR2Json<Record<string, any>>(catKey, {});
    for (const [key, val] of Object.entries(cats)) {
      if (val.slug) {
        catMap.set(key, val.slug);
      }
    }
    onProgress?.(`📚 加载视频分类映射: ${catMap.size} 个分类`, 'info');
  } catch (err: any) {
    onProgress?.(`⚠️ 加载视频分类映射失败: ${err.message}，将使用 category_key 作为 slug`, 'warning');
  }

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 获取总数
  const { count: totalCount, error: countError } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', SITE_ID)
    .eq('locale', locale);

  if (countError) {
    onProgress?.(`❌ 获取视频总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount || 0} 个视频，分页处理中`, 'info');

  while (true) {
    const { data: videos, error } = await supabase
      .from('videos')
      .select('*')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('order_index', { ascending: true });

    if (error) {
      onProgress?.(`❌ 查询视频表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!videos || videos.length === 0) break;

    // 查询当前批次已存在的 pages
    const videoIds = videos.map(v => v.id);
    const pageIds = videoIds.map(id => `video:${id}`);
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
    const total = videos.length;

    for (const video of videos) {
      const videoId = video.id;
      if (!videoId) {
        onProgress?.(`⚠️ 视频缺少 id，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }

      const pageId = `video:${videoId}`;
      const videoUpdatedAt = video.updated_at || new Date().toISOString();

      // 跳过逻辑
      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= videoUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${video.title} (${videoId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      // 读取 MD 内容
      const mdKey = `videosys/${locale}/${videoId}.md`;
      let mdContent = '';
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

      // 获取分类 slug
      const categorySlug = catMap.get(video.category_key) || video.category_key || 'default';

      // 使用 mapper 构建 PageData
      const pageData = mapVideoToPageData(video, mdData, mdContent, categorySlug);

      try {
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`  ✅ 视频: ${pageData.title} (${videoId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
      } catch (upsertErr: any) {
        failed++;
        onProgress?.(`  ❌ 视频: ${video.title} (${videoId}) 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
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

  onProgress?.(`✅ 视频扫描完成: 总处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}，跳过 ${totalSkipped}`, 'info');
}