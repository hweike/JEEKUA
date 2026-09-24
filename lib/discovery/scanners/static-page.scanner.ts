// lib/discovery/scanners/static-page.scanner.ts
import matter from 'gray-matter';
import sql from '@/lib/db/admin';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { mapStaticPageToPageData } from '../mappers/static-page.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

export async function scanStaticPages(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取静态页面列表 (locale=${locale})`, 'info');

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 获取总数
  let totalCount = 0;
  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.site_pages
      WHERE site_id = ${SITE_ID} AND locale = ${locale}
    `;
    totalCount = parseInt(countRows[0]?.count || '0', 10);
  } catch (countError: any) {
    onProgress?.(`❌ 获取静态页面总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount} 个静态页面，分页处理中`, 'info');

  while (true) {
    let pages: any[];
    try {
      pages = await sql<any[]>`
        SELECT * FROM public.site_pages
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
        ORDER BY updated_at DESC
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}
      `;
    } catch (error: any) {
      onProgress?.(`❌ 查询 site_pages 表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!pages || pages.length === 0) break;

    // 查询当前批次已存在的 pages
    const pageIds = pages.map(p => `page:${p.id}`);
    let pageMap = new Map<string, { updatedAt: string; content_hash: string }>();
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

      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= pageUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${sp.title} (${id}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

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