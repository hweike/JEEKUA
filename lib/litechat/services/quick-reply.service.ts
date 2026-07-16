// lib/litechat/services/quick-reply.service.ts
import { supabase } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHAT_SCHEMA = 'chat';

export interface QuickReply {
  id: string;
  site_id: string;
  title: string;
  content: string;
  created_by: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyWithOwner extends QuickReply {
  is_owner: boolean;  // 当前管理员是否为创建者
}

/**
 * 获取所有常用回复语
 * - 按创建者排序：自己的排前面
 * - 标记 is_owner 字段，用于前端控制编辑/删除权限
 */
export async function getQuickReplies(
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReplyWithOwner[]> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .select('*')
    .eq('site_id', siteId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取常用回复语失败:', error);
    throw error;
  }

  // 按创建者排序：自己的排前面
  const sorted = (data || []).sort((a, b) => {
    const aSelf = a.created_by === adminId ? 0 : 1;
    const bSelf = b.created_by === adminId ? 0 : 1;
    if (aSelf !== bSelf) return aSelf - bSelf;
    return a.sort_order - b.sort_order || a.created_at - b.created_at;
  });

  return sorted.map(item => ({
    ...item,
    is_owner: item.created_by === adminId,
  }));
}

/**
 * 创建常用回复语
 * - 自动绑定当前管理员为创建者
 */
export async function createQuickReply(
  title: string,
  content: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReply> {
  const supabaseAdmin = getSupabaseAdminClient();
  const { data, error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .insert({
      site_id: siteId,
      title: title.trim(),
      content: content.trim(),
      created_by: adminId,
      sort_order: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('创建常用回复语失败:', error);
    throw error;
  }
  return data;
}

/**
 * 更新常用回复语
 * - 仅创建者可以更新
 */
export async function updateQuickReply(
  id: string,
  title: string,
  content: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReply> {
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. 先检查是否是创建者
  const { data: existing, error: findError } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .select('created_by')
    .eq('id', id)
    .eq('site_id', siteId)
    .single();

  if (findError || !existing) {
    throw new Error('常用回复语不存在');
  }

  if (existing.created_by !== adminId) {
    throw new Error('无权编辑此常用回复语');
  }

  // 2. 更新
  const { data, error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .update({
      title: title.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('site_id', siteId)
    .select()
    .single();

  if (error) {
    console.error('更新常用回复语失败:', error);
    throw error;
  }
  return data;
}

/**
 * 删除常用回复语
 * - 仅创建者可以删除
 */
export async function deleteQuickReply(
  id: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<void> {
  const supabaseAdmin = getSupabaseAdminClient();

  // 1. 先检查是否是创建者
  const { data: existing, error: findError } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .select('created_by')
    .eq('id', id)
    .eq('site_id', siteId)
    .single();

  if (findError || !existing) {
    throw new Error('常用回复语不存在');
  }

  if (existing.created_by !== adminId) {
    throw new Error('无权删除此常用回复语');
  }

  // 2. 删除
  const { error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('quick_replies')
    .delete()
    .eq('id', id)
    .eq('site_id', siteId);

  if (error) {
    console.error('删除常用回复语失败:', error);
    throw error;
  }
}