// lib/auth/users.ts
import bcrypt from 'bcryptjs';
import sql from '@/lib/db/admin';

export interface User {
  id: string;
  email: string;
  name: string;
  englishName: string;
  passwordHash: string;
  createdAt: string;
  mustChangePassword: boolean;
  role: 'super' | 'admin';
  siteId: string;
}

function getCurrentSiteId(): string {
  return process.env.NEXT_PUBLIC_SITE_ID || '000001';
}

async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * 数据库行 → User 对象（camelCase 映射）
 */
function rowToUser(row: any): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    englishName: row.englishName,
    passwordHash: row.passwordHash,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : String(row.createdAt),
    mustChangePassword: row.mustChangePassword,
    role: row.role as 'super' | 'admin',
    siteId: row.site_id,
  };
}

/**
 * 读取当前站点的用户列表
 */
export async function getUsers(siteId?: string): Promise<User[]> {
  const targetSiteId = siteId || getCurrentSiteId();
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.admin_users
      WHERE site_id = ${targetSiteId}
      ORDER BY "createdAt" ASC
    `;
    if (rows.length === 0 && targetSiteId === getCurrentSiteId()) {
      return await initDefaultAdmin();
    }
    return rows.map(rowToUser);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    if (targetSiteId === getCurrentSiteId()) {
      return await initDefaultAdmin();
    }
    return [];
  }
}

/**
 * 初始化默认超级管理员
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

  try {
    await sql`
      INSERT INTO public.admin_users (
        id, email, name, "englishName", "passwordHash",
        "createdAt", "mustChangePassword", role, site_id
      ) VALUES (
        ${defaultAdmin.id},
        ${defaultAdmin.email},
        ${defaultAdmin.name},
        ${defaultAdmin.englishName},
        ${defaultAdmin.passwordHash},
        ${defaultAdmin.createdAt},
        ${defaultAdmin.mustChangePassword},
        ${defaultAdmin.role},
        ${defaultAdmin.siteId}
      )
    `;
    return [defaultAdmin];
  } catch (error) {
    console.error('初始化默认管理员失败:', error);
    return [];
  }
}

/**
 * 保存用户列表（已废弃）
 */
async function saveUsers(_users: User[]): Promise<void> {
  console.warn('saveUsers is deprecated; use dedicated create/update/delete operations instead.');
}

/**
 * 根据邮箱查找当前站点的用户
 */
export async function findUserByEmail(email: string, siteId?: string): Promise<User | undefined> {
  const targetSiteId = siteId || getCurrentSiteId();
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.admin_users
      WHERE email = ${email}
        AND site_id = ${targetSiteId}
      LIMIT 1
    `;
    return rows[0] ? rowToUser(rows[0]) : undefined;
  } catch (error) {
    console.error('查找用户失败:', error);
    return undefined;
  }
}

/**
 * 添加新用户（当前站点，最多 3 个）
 */
export async function addUser(
  email: string,
  name: string,
  englishName: string,
  plainPassword: string,
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 1. 检查数量上限
  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.admin_users
      WHERE site_id = ${targetSiteId}
    `;
    const count = parseInt(countRows[0]?.count || '0', 10);
    if (count >= 3) {
      return { success: false, error: '最多只能创建 3 个管理员账号' };
    }
  } catch (error) {
    console.error('统计用户数失败:', error);
    return { success: false, error: '系统错误' };
  }

  // 2. 检查邮箱
  const existing = await findUserByEmail(email, targetSiteId);
  if (existing) {
    return { success: false, error: '邮箱已存在' };
  }

  // 3. 插入
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

  try {
    await sql`
      INSERT INTO public.admin_users (
        id, email, name, "englishName", "passwordHash",
        "createdAt", "mustChangePassword", role, site_id
      ) VALUES (
        ${newUser.id},
        ${newUser.email},
        ${newUser.name},
        ${newUser.englishName},
        ${newUser.passwordHash},
        ${newUser.createdAt},
        ${newUser.mustChangePassword},
        ${newUser.role},
        ${newUser.siteId}
      )
    `;
    return { success: true };
  } catch (error) {
    console.error('添加用户失败:', error);
    return { success: false, error: '添加失败' };
  }
}

/**
 * 删除用户（不能删除最后一个）
 */
export async function deleteUser(id: string, siteId?: string): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 1. 检查剩余数量
  try {
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.admin_users
      WHERE site_id = ${targetSiteId}
    `;
    const count = parseInt(countRows[0]?.count || '0', 10);
    if (count <= 1) {
      return { success: false, error: '至少保留一个管理员账号' };
    }
  } catch (error) {
    console.error('统计用户数失败:', error);
    return { success: false, error: '系统错误' };
  }

  // 2. 删除
  try {
    await sql`
      DELETE FROM public.admin_users
      WHERE id = ${id}
        AND site_id = ${targetSiteId}
    `;
    return { success: true };
  } catch (error) {
    console.error('删除用户失败:', error);
    return { success: false, error: '删除失败' };
  }
}

/**
 * 更新密码
 */
export async function updatePassword(email: string, newPasswordHash: string, siteId?: string): Promise<void> {
  const targetSiteId = siteId || getCurrentSiteId();
  try {
    await sql`
      UPDATE public.admin_users
      SET "passwordHash" = ${newPasswordHash},
          "mustChangePassword" = false,
          updated_at = ${new Date().toISOString()}
      WHERE email = ${email}
        AND site_id = ${targetSiteId}
    `;
  } catch (error) {
    console.error('更新密码失败:', error);
  }
}

/**
 * 更新用户个人信息
 */
export async function updateUserProfile(
  email: string,
  data: { name: string; englishName: string; email: string },
  siteId?: string
): Promise<{ success: boolean; error?: string }> {
  const targetSiteId = siteId || getCurrentSiteId();

  // 1. 如果邮箱改变，检查新邮箱是否已被占用
  if (data.email !== email) {
    const existing = await findUserByEmail(data.email, targetSiteId);
    if (existing) {
      return { success: false, error: '新邮箱已被占用' };
    }
  }

  // 2. 更新
  try {
    await sql`
      UPDATE public.admin_users
      SET name = ${data.name},
          "englishName" = ${data.englishName},
          email = ${data.email},
          updated_at = ${new Date().toISOString()}
      WHERE email = ${email}
        AND site_id = ${targetSiteId}
    `;
    return { success: true };
  } catch (error) {
    console.error('更新用户信息失败:', error);
    return { success: false, error: '更新失败' };
  }
}