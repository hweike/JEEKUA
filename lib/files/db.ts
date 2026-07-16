import { supabase } from '@/lib/supabase/client';

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
    .eq('file_hash', fileHash)
    .maybeSingle();

  // 正常情况（0 或 1 条结果）
  if (!error) return data || null;

  // 如果返回多行（PostgreSQL 错误码 PGRST116），则取第一条
  if (error.code === 'PGRST116') {
    const { data: multiple, error: multiError } = await supabase
      .from('media_files')
      .select('*')
      .eq('file_hash', fileHash)
      .limit(1);
    if (multiError) throw new Error(multiError.message);
    return multiple?.[0] || null;
  }

  // 其他错误直接抛出
  throw new Error(error.message);
}

export async function getMediaFileById(id: string) {
  const { data, error } = await supabase
    .from('media_files')
    .select('storage_key')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function listMediaFiles(page: number = 1, pageSize: number = 20, search?: string) {
  let query = supabase
    .from('media_files')
    .select('*, references:file_references(id), alt_text', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('display_name', `%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, error, count } = await query.range(from, to);
  if (error) throw new Error(error.message);
  return { files: data || [], total: count || 0 };
}

export async function softDeleteMediaFile(fileId: string) {
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
  const { error } = await supabase.from('file_references').insert(data);
  if (error) throw new Error(error.message);
}

export async function deleteFileReference(referenceId: number) {
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
  const { error } = await supabase
    .from('file_references')
    .upsert(data, { onConflict: 'file_id,reference_type,reference_id' });
  if (error) throw new Error(error.message);
}