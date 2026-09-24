// lib/discovery/scanners/doc.scanner.ts
import matter from 'gray-matter';
import sql from '@/lib/db/admin';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { readR2Json } from './utils';
import { mapDocToPageData } from '../mappers/doc.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

export async function scanDocs(locale: string, onProgress?: ProgressCallback): Promise<void> {
  onProgress?.(`📁 从数据库分页获取文档列表 (locale=${locale})`, 'info');

  // 1. 预先加载文档库映射 (lib_id -> slug)
  let libMap = new Map<string, string>();
  try {
    const libs = await readR2Json<any[]>('docs/libs.json', []);
    for (const lib of libs) {
      if (lib.id && lib.slug) {
        libMap.set(lib.id, lib.slug);
      }
    }
    onProgress?.(`📚 加载文档库映射: ${libMap.size} 个库`, 'info');
  } catch (err: any) {
    onProgress?.(`⚠️ 加载文档库映射失败: ${err.message}，将使用 lib_id 作为 slug`, 'warning');
  }

  const PAGE_SIZE = 100;
  let page = 0;
  let totalProcessed = 0,
    totalSuccess = 0,
    totalFailed = 0,
    totalSkipped = 0;

  // 2. 获取总数
  let totalCount = 0;
  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.documents
      WHERE site_id = ${SITE_ID} AND locale = ${locale}
    `;
    totalCount = parseInt(countRows[0]?.count || '0', 10);
  } catch (countError: any) {
    onProgress?.(`❌ 获取文档总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount} 篇文档，分页处理中`, 'info');

  while (true) {
    let docs: any[];
    try {
      docs = await sql<any[]>`
        SELECT * FROM public.documents
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
        ORDER BY order_index ASC
        LIMIT ${PAGE_SIZE} OFFSET ${page * PAGE_SIZE}
      `;
    } catch (error: any) {
      onProgress?.(`❌ 查询文档表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!docs || docs.length === 0) break;

    // 3. 查询当前批次已存在的 pages
    const docIds = docs.map((d) => d.id);
    const pageIds = docIds.map((id) => `doc:${id}`);
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
    const total = docs.length;

    for (const doc of docs) {
      const docId = doc.id;
      if (!docId) {
        onProgress?.(`⚠️ 文档缺少 id，跳过`, 'warning');
        failed++;
        processed++;
        continue;
      }

      const pageId = `doc:${docId}`;
      const docUpdatedAt = doc.updated_at || new Date().toISOString();

      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= docUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${doc.title} (${docId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      const libSlug = libMap.get(doc.lib_id) || doc.lib_id;
      const mdKey = `docs/${locale}/${doc.lib_id}/${doc.file}`;
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

      const pageData = mapDocToPageData(doc, mdData, libSlug, mdContent);
      try {
        await upsertPage(pageData, locale);
        success++;
        onProgress?.(`  ✅ 文档: ${pageData.title} (${docId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
      } catch (upsertErr: any) {
        failed++;
        onProgress?.(`  ❌ 文档: ${doc.title} (${docId}) 失败: ${upsertErr.message} [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'error');
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

  onProgress?.(`✅ 文档扫描完成: 总处理 ${totalProcessed}，成功 ${totalSuccess}，失败 ${totalFailed}，跳过 ${totalSkipped}`, 'info');
}