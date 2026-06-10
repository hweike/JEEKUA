// lib/auth/users.ts
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase/client';

export interface User {
  id: string;
  email: string;
  name: string;
  englishName: string;
  passwordHash: string;
  createdAt: string;
  mustChangePassword: boolean;
  role: 'super' | 'admin';
  siteId: string; // 新增：站点标识
}

/**
 * 获取当前站点的 site_id
 * 优先从环境变量读取，否则使用默认值 '000001'
 */
function getCurrentSiteId(): string {
  return process.env.NEXT_PUBLIC_SITE_ID || '000001';
}

async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * 读取当前站点的用户列表
 * @param siteId 可选，不传则使用当前站点
 */
export async function getUsers(siteId?: string): Promise<User[]> {
  const targetSiteId = siteId || getCurrentSiteId();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('site_id', targetSiteId)
    .order('createdAt', { ascending: true });
  if (error) {
    console.error('获取用户列表失败:', error);
    // 如果是表不存在或数据为空，且当前站点为默认站点，则尝试初始化默认管理员
    if (targetSiteId === getCurrentSiteId() && (error.code === 'PGRST116' || (data && data.length === 0))) {
      return await initDefaultAdmin();
    }
    return [];
  }
  return (data || []) as User[];
}

/**
 * 初始化默认超级管理员（仅当当前站点且无用户时调用）
 */
async function initDefaultAdmin(): Promise<User[]> {
  const defaultAdmin: User = {
    id: '1',
    email: 'admin@admin.com',
    name: '超级管理员',
    englishName: 'Admin',
    passwordHash: await hashPassword('admin123'),
    createdAt: new Date().toISOString(),
    mustChangePassword: true,
    role: 'super',
    siteId: getCurrentSiteId(),
  };
  const { error } = await supabase.from('admin_users').insert(defaultAdmin);
  if (error) {
    console.error('初始化默认管理员失败:', error);
    return [];
  }
  return [defaultAdmin];
}

/**
 * 保存用户列表（已废弃，保留仅为兼容）
 */
async function saveUsers(_users: User[]): Promise<void> {
  console.warn('saveUsers is deprecated in Supabase version; use dedicated create/update/delete operations instead.');
}

/**
 * 根据邮箱查找当前站点的用户
 * @param email 邮箱
 * @param siteId 可选，不传则使用当前站点
 */
export async function findUserByEmail(email: string, siteId?: string): Promise<User | undefined> {
  const targetSiteId = siteId || getCurrentSiteId();
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('site_id', targetSiteId)
    .maybeSingle();
  if (error) {
    console.error('查找用户失败:', error);
    return undefined;
  }
  return data as User | undefined;
}

/**
 * 添加新用户（当前站点）
 * @param email 邮箱
 * @param name 姓名
 * @param englishName 英文名
 * @param plainPassword 明文密码
 * @param siteId 可选，不传则使用当前站点
 */
export async function addUser(
  email: string,
  name: string,
  englishName: string,
  plainPassword: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 检查当前站点的用户数量是否已达上限（最多3个）
  const { count, error: countError } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', targetSiteId);
  if (countError) {
    console.error('统计用户数失败:', countError);
    return { success: false, error: '系统错误' };
  }
  if (count !== null && count >= 3) {
    return { success: false, error: '最多只能创建 3 个管理员账号' };
  }

  // 检查邮箱是否已存在于当前站点（全局唯一性由数据库保证，但此处仍加上站点过滤）
  const existing = await findUserByEmail(email, targetSiteId);
  if (existing) {
    return { success: false, error: '邮箱已存在' };
  }

  const passwordHash = await hashPassword(plainPassword);
  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    englishName,
    passwordHash,
    createdAt: new Date().toISOString(),
    mustChangePassword: true,
    role: 'admin',
    siteId: targetSiteId,
  };

  const { error: insertError } = await supabase
    .from('admin_users')
    .insert(newUser);
  if (insertError) {
    console.error('添加用户失败:', insertError);
    return { success: false, error: '添加失败' };
  }
  return { success: true };
}

/**
 * 删除用户（当前站点的用户，且不能删除最后一个）
 * @param id 用户ID
 * @param siteId 可选，不传则使用当前站点
 */
export async function deleteUser(id: string, siteId?: string): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 获取当前站点的用户总数
  const { count, error: countError } = await supabase
    .from('admin_users')
    .select('*', { count: 'exact', head: true })
    .eq('site_id', targetSiteId);
  if (countError) {
    console.error('统计用户数失败:', countError);
    return { success: false, error: '系统错误' };
  }
  if (count !== null && count <= 1) {
    return { success: false, error: '至少保留一个管理员账号' };
  }

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('id', id)
    .eq('site_id', targetSiteId);
  if (error) {
    console.error('删除用户失败:', error);
    return { success: false, error: '删除失败' };
  }
  return { success: true };
}

/**
 * 更新密码（当前站点的用户）
 * @param email 用户邮箱
 * @param newPasswordHash 新密码哈希
 * @param siteId 可选，不传则使用当前站点
 */
export async function updatePassword(email: string, newPasswordHash: string, siteId?: string): Promise<void> {
  const targetSiteId = siteId || getCurrentSiteId();
  const { error } = await supabase
    .from('admin_users')
    .update({
      passwordHash: newPasswordHash,
      mustChangePassword: false,
    })
    .eq('email', email)
    .eq('site_id', targetSiteId);
  if (error) {
    console.error('更新密码失败:', error);
  }
}

/**
 * 更新用户个人信息（当前站点的用户）
 * @param email 当前邮箱
 * @param data 要更新的数据（姓名、英文名、新邮箱）
 * @param siteId 可选，不传则使用当前站点
 */
export async function updateUserProfile(
  email: string,
  data: { name: string; englishName: string; email: string },
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 如果邮箱改变，需要检查新邮箱是否已被当前站点的其他用户使用
  if (data.email !== email) {
    const existing = await findUserByEmail(data.email, targetSiteId);
    if (existing) {
      return { success: false, error: '新邮箱已被占用' };
    }
  }

  const { error } = await supabase
    .from('admin_users')
    .update({
      name: data.name,
      englishName: data.englishName,
      email: data.email,
    })
    .eq('email', email)
    .eq('site_id', targetSiteId);
  if (error) {
    console.error('更新用户信息失败:', error);
    return { success: false, error: '更新失败' };
  }
  return { success: true };
}