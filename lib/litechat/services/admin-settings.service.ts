// lib/litechat/services/admin-settings.service.ts
import { supabase } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export interface AdminSettings {
  avatar_url?: string;
  nickname?: string;
  online_status: 'online' | 'offline' | 'busy' | 'away';
  default_welcome: string;
  offline_reply: string;
  online_start_time: string;
  online_end_time: string;
}

export interface AdminUser extends AdminSettings {
  id: string;
  email: string;
  name: string;
}

/**
 * 获取当前管理员信息（含设置）
 */
export async function getCurrentAdminSettings(adminId: string): Promise<AdminUser | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, name, avatar_url, nickname, online_status, default_welcome, offline_reply, online_start_time, online_end_time')
    .eq('id', adminId)
    .maybeSingle();

  if (error) {
    console.error('获取管理员设置失败:', error);
    return null;
  }
  return data;
}

/**
 * 更新管理员个人设置
 */
export async function updateAdminSettings(
  adminId: string,
  settings: Partial<AdminSettings>
): Promise<AdminUser> {
  const { data, error } = await supabase
    .from('admin_users')
    .update({
      avatar_url: settings.avatar_url,
      nickname: settings.nickname,
      online_status: settings.online_status,
      default_welcome: settings.default_welcome,
      offline_reply: settings.offline_reply,
      online_start_time: settings.online_start_time,
      online_end_time: settings.online_end_time,
      updated_at: new Date().toISOString(),
    })
    .eq('id', adminId)
    .select('id, email, name, avatar_url, nickname, online_status, default_welcome, offline_reply, online_start_time, online_end_time')
    .single();

  if (error) {
    console.error('更新管理员设置失败:', error);
    throw error;
  }
  return data;
}

/**
 * 获取所有管理员列表（用于会话分配）
 */
export async function getAllAdmins(siteId: string = DEFAULT_SITE_ID) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, name, nickname, avatar_url, online_status')
    .eq('site_id', siteId)  // ✅ 添加 site_id 过滤
    .order('name', { ascending: true });

  if (error) {
    console.error('获取管理员列表失败:', error);
    throw error;
  }
  return data || [];
}