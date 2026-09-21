// lib/files/db.ts
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function createMediaFile(data: {
  storage_key: string;
  display_name: string;
  mime_type: string;
  size: number;
  file_hash: string;
  width?: number | null;
  height?: number | null;
  source_url?: string | null;
}) {
  const { data: inserted, error } = await supabase
    .from('media_files')
    .insert({
      site_id: DEFAULT_SITE_ID,
      storage_key: data.storage_key,
      display_name: data.display_name,
      mime_type: data.mime_type,
      size: data.size,
      file_hash: data.file_hash,
      width: data.width ?? null,
      height: data.height ?? null,
      source_url: data.source_url ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(`插入 media_files 失败: ${error.message}`);
  return inserted;
}

export async function findMediaFileByHash(fileHash: string) {
  const { data, error } = await supabase
    .from('media_files')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('file_hash', fileHash)
    .maybeSingle();

  if (!error) return data || null;

  if (error.code === 'PGRST116') {
    const { data: multiple, error: multiError } = await supabase
      .from('media_files')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('file_hash', fileHash)
      .limit(1);
    if (multiError) throw new Error(multiError.message);
    return multiple?.[0] || null;
  }

  throw new Error(error.message);
}

export async function getMediaFileById(id: string) {
  const { data, error } = await supabase
    .from('media_files')
    .select('storage_key')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

/**
 * 获取文件列表（支持分页、搜索、分类过滤、引用状态过滤）
 */
export async function listMediaFiles(
  page: number = 1,
  pageSize: number = 20,
  search?: string,
  categoryId?: string | null,
  referenced?: string | null
): Promise<{ files: any[]; total: number }> {
  try {
    // 构建基础查询
    let query = supabase
      .from('media_files')
      .select('id, storage_key, display_name, mime_type, size, created_at, alt_text, category_id')
      .eq('site_id', DEFAULT_SITE_ID)
      .is('deleted_at', null);

    if (search) {
      query = query.ilike('display_name', `%${search}%`);
    }
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // 获取所有符合条件的文件
    const { data: allFiles, error: filesError } = await query;

    if (filesError) {
      console.error('获取文件列表失败:', filesError);
      return { files: [], total: 0 };
    }

    if (!allFiles || allFiles.length === 0) {
      return { files: [], total: 0 };
    }

    // 获取所有引用关系
    const { data: allRefs, error: refError } = await supabase
      .from('file_references')
      .select('file_id');

    if (refError) {
      console.error('获取引用列表失败:', refError);
      return { files: [], total: 0 };
    }

    // 构建引用计数
    const refCountMap: Record<string, number> = {};
    allRefs?.forEach((ref: { file_id: string }) => {
      refCountMap[ref.file_id] = (refCountMap[ref.file_id] || 0) + 1;
    });

    // 为每个文件添加引用计数，并根据引用状态过滤
    let filteredFiles = allFiles.map((file: any) => ({
      ...file,
      referenceCount: refCountMap[file.id] || 0,
    }));

    // 根据引用状态过滤
    if (referenced === 'true') {
      filteredFiles = filteredFiles.filter(f => f.referenceCount > 0);
    } else if (referenced === 'false') {
      filteredFiles = filteredFiles.filter(f => f.referenceCount === 0);
    }

    // 排序（按创建时间降序）
    filteredFiles.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // 分页
    const total = filteredFiles.length;
    const from = (page - 1) * pageSize;
    const to = Math.min(from + pageSize, total);
    const paginatedFiles = filteredFiles.slice(from, to);

    return {
      files: paginatedFiles,
      total,
    };
  } catch (error: any) {
    console.error('listMediaFiles 错误:', error);
    return { files: [], total: 0 };
  }
}

export async function softDeleteMediaFile(fileId: string) {
  // 先检查文件是否属于当前站点
  const { data: file, error: fileError } = await supabase
    .from('media_files')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', fileId)
    .single();
  
  if (fileError) throw new Error(fileError.message);
  if (!file) throw new Error('File not found or access denied');

  const { count, error: countError } = await supabase
    .from('file_references')
    .select('*', { count: 'exact', head: true })
    .eq('file_id', fileId);
  
  if (countError) throw new Error(countError.message);
  if (count && count > 0) {
    throw new Error('Cannot delete file with active references');
  }
  
  const { error } = await supabase
    .from('media_files')
    .update({ deleted_at: new Date().toISOString() })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', fileId);
  
  if (error) throw new Error(error.message);
}

export async function createFileReference(data: {
  file_id: string;
  reference_type: string;
  reference_id: string;
  alt_text?: string | null;
  sort_order?: number;
}) {
  // 验证文件是否属于当前站点
  const { data: file, error: fileError } = await supabase
    .from('media_files')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', data.file_id)
    .single();
  
  if (fileError) throw new Error(fileError.message);
  if (!file) throw new Error('File not found or access denied');

  const { error } = await supabase.from('file_references').insert(data);
  if (error) throw new Error(error.message);
}

export async function deleteFileReference(referenceId: number) {
  // 验证引用是否关联到当前站点的文件
  const { data: ref, error: refError } = await supabase
    .from('file_references')
    .select('file_id')
    .eq('id', referenceId)
    .single();
  
  if (refError) throw new Error(refError.message);
  
  const { data: file, error: fileError } = await supabase
    .from('media_files')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', ref.file_id)
    .single();
  
  if (fileError) throw new Error('File not found or access denied');

  const { error } = await supabase.from('file_references').delete().eq('id', referenceId);
  if (error) throw new Error(error.message);
}

export async function upsertFileReference(data: {
  file_id: string;
  reference_type: string;
  reference_id: string;
  alt_text?: string | null;
  sort_order?: number;
}) {
  // 验证文件是否属于当前站点
  const { data: file, error: fileError } = await supabase
    .from('media_files')
    .select('id')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', data.file_id)
    .single();
  
  if (fileError) throw new Error(fileError.message);
  if (!file) throw new Error('File not found or access denied');

  const { error } = await supabase
    .from('file_references')
    .upsert(data, { onConflict: 'file_id,reference_type,reference_id' });
  if (error) throw new Error(error.message);
}