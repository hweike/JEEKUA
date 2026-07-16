// lib/discovery/scanners/doc.scanner.ts
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { upsertPage, SITE_ID } from '../register';
import { getPrivateStorage } from '@/lib/storage/factory';
import { readR2Json } from './utils';
import { mapDocToPageData } from '../mappers/doc.mapper';
import type { ProgressCallback } from './types';

const storage = getPrivateStorage();

/**
 * 扫描文档
 * 数据源：
 * - 索引：数据库 documents 表
 * - 内容：R2 docs/${locale}/${lib_id}/${file}
 */
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

  // 获取总数
  const { count: totalCount, error: countError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', SITE_ID)
    .eq('locale', locale);

  if (countError) {
    onProgress?.(`❌ 获取文档总数失败: ${countError.message}`, 'error');
    throw countError;
  }
  onProgress?.(`📊 总共 ${totalCount || 0} 篇文档，分页处理中`, 'info');

  while (true) {
    const { data: docs, error } = await supabase
      .from('documents')
      .select('*')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('order_index', { ascending: true });

    if (error) {
      onProgress?.(`❌ 查询文档表失败: ${error.message}`, 'error');
      throw error;
    }
    if (!docs || docs.length === 0) break;

    // 查询当前批次已存在的 pages
    const docIds = docs.map(d => d.id);
    const pageIds = docIds.map(id => `doc:${id}`);
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

      // 跳过逻辑
      const existing = pageMap.get(pageId);
      if (existing && existing.updatedAt >= docUpdatedAt) {
        skipped++;
        onProgress?.(`  ⏭️ 跳过: ${doc.title} (${docId}) [进度: ${processed}/${total} 成功:${success} 失败:${failed} 跳过:${skipped}]`, 'info');
        processed++;
        continue;
      }

      // 读取 MD 内容
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

      // 使用 mapper 构建 PageData，传入合并后的数据
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