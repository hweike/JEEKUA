// lib/auth/admin-check.ts
import 'server-only';
import { getCurrentUser } from '@/lib/auth/jwt';
import sql from '@/lib/db/admin';

export interface AdminAuthSuccess {
  admin: { id: string; email: string; name: string };
  user: { id: string; username: string; role?: string };
}

export interface AdminAuthFailure {
  error: string;
  status: number;
}

export type AdminAuth = AdminAuthSuccess | AdminAuthFailure;

/**
 * 统一的管理员验证
 * 1. 验证 JWT（middleware 也做过，但 route handler 需要拿 user.id）
 * 2. 查 admin_users 表确认是管理员
 */
export async function verifyAdminAuth(): Promise<AdminAuth> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: '未登录', status: 401 };
  }

  try {
    const rows = await sql<{ id: string; email: string; name: string }[]>`
      SELECT id, email, name FROM public.admin_users
      WHERE id = ${user.id}
      LIMIT 1
    `;
    if (!rows[0]) {
      return { error: '无权访问，需要管理员权限', status: 403 };
    }
    return {
      admin: rows[0],
      user: { id: user.id, username: user.username, role: user.role },
    };
  } catch (error) {
    console.error('[verifyAdminAuth] 查询管理员失败:', error);
    return { error: '数据库查询失败', status: 500 };
  }
}

/**
 * 类型守卫
 */
export function isAdminAuthSuccess(auth: AdminAuth): auth is AdminAuthSuccess {
  return 'admin' in auth;
}