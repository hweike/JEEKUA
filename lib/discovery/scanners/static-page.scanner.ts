// lib/discovery/scanners/static-page.scanner.ts
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { mapStaticPageToPageData } from '../mappers/static-page.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

/**
 * 扫描静态页面（site_pages 表 + MD 文件）
 * 数据源：
 * - 元数据：数据库 site_pages 表
 * - 内容：R2 pages/${locale}/${id}.md
 * 注册类型：page 或 policy
 */
export async function scanStaticPages(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取静态页面列表 (locale=${locale})`, 'info');

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 获取总数
  const { count: totalCount, error: countError } = await supabase
    .from('site_pages')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', SITE_ID)
    .eq('locale', locale);

  if (countError) {
    onProgress?.(`❌ 获取静态页面总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount || 0} 个静态页面，分页处理中`, 'info');

  while (true) {
    const { data: pages, error } = await supabase
      .from('site_pages')
      .select('*')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('updated_at', { ascending: false });

    if (error) {
      onProgress?.(`❌ 查询 site_pages 表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!pages || pages.length === 0) break;

    // 查询当前批次已存在的 pages
    const pageIds = pages.map(p => `page:${p.id}`);
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
    const total = pages.length;

    for (const sp of pages) {
      const id = sp.id;
      if (!id) {
        onProgress?.(`⚠️ 静态页面缺少 id，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }

      const pageId = `page:${id}`;
      const pageUpdatedAt = sp.updated_at || new Date().toISOString();

      // 跳过逻辑
      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= pageUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${sp.title} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      // 读取 MD 内容
      const mdKey = `pages/${locale}/${id}.md`;
      let mdContent = '';
      let mdData: any = {};

      try {
        const raw = await storage.read(mdKey, 'utf8');
        const parsed = matter(raw);
        mdData = parsed.data || {};
        mdContent = parsed.content || '';
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.Code === 'NoSuchKey' || err?.message?.includes('File not found')) {
          onProgress?.(`⚠️ MD 文件不存在: ${mdKey}，将使用数据库 content 字段`, 'warning');
          mdContent = sp.content || '';
        } else {
          onProgress?.(`❌ 读取云存储 MD 文件失败: ${err.message}，将使用数据库 content 字段`, 'error');
          mdContent = sp.content || '';
        }
      }

      try {
        // 使用 mapper 构建 PageData，传入数据库记录、MD 元数据和内容
        const pageData = mapStaticPageToPageData(sp, mdData, mdContent);
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`  ✅ 静态页面: ${pageData.title} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
      } catch (upsertErr: any) {
        failed++;
        onProgress?.(`  ❌ 静态页面: ${sp.title} (${id}) 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
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

  onProgress?.(`✅ 静态页面扫描完成: 总处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}，跳过 ${totalSkipped}`, 'info');
}