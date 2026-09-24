// lib/litechat/services/admin-settings.service.ts
import sql from '@/lib/db/admin';

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
  try {
    const rows = await sql<AdminUser[]>`
      SELECT id, email, name, avatar_url, nickname, online_status,
             default_welcome, offline_reply, online_start_time, online_end_time
      FROM public.admin_users
      WHERE id = ${adminId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('获取管理员设置失败:', error);
    return null;
  }
}

/**
 * 更新管理员个人设置
 */
export async function updateAdminSettings(
  adminId: string,
  settings: Partial<AdminSettings>
): Promise<AdminUser> {
  try {
    const rows = await sql<AdminUser[]>`
      UPDATE public.admin_users
      SET avatar_url = ${settings.avatar_url ?? null},
          nickname = ${settings.nickname ?? null},
          online_status = ${settings.online_status ?? null},
          default_welcome = ${settings.default_welcome ?? null},
          offline_reply = ${settings.offline_reply ?? null},
          online_start_time = ${settings.online_start_time ?? null},
          online_end_time = ${settings.online_end_time ?? null},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${adminId}
      RETURNING id, email, name, avatar_url, nickname, online_status,
                default_welcome, offline_reply, online_start_time, online_end_time
    `;
    if (!rows[0]) throw new Error('管理员不存在');
    return rows[0];
  } catch (error) {
    console.error('更新管理员设置失败:', error);
    throw error;
  }
}

/**
 * 获取所有管理员列表（用于会话分配）
 */
export async function getAllAdmins(siteId: string = DEFAULT_SITE_ID) {
  try {
    const rows = await sql<any[]>`
      SELECT id, email, name, nickname, avatar_url, online_status
      FROM public.admin_users
      WHERE site_id = ${siteId}
      ORDER BY name ASC
    `;
    return rows;
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    throw error;
  }
}