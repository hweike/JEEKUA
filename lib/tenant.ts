// lib/tenant.ts
import sql from '@/lib/db/admin';

/**
 * 获取用户的租户ID和站点ID
 */
export async function getUserTenantAndSite(userId: string): Promise<{ tenantId: string; siteId: string }> {
  // 1. 从 admin_users 获取 site_id
  let siteId: string;
  try {
    const rows = await sql<{ site_id: string | null }[]>`
      SELECT site_id FROM public.admin_users
      WHERE id = ${userId}
      LIMIT 1
    `;
    if (!rows[0]) {
      throw new Error(`用户 ${userId} 不存在`);
    }
    if (!rows[0].site_id) {
      throw new Error(`用户 ${userId} 未关联站点 (site_id 为空)`);
    }
    siteId = rows[0].site_id;
  } catch (error: any) {
    console.error('获取用户 site_id 失败:', error);
    throw new Error(error.message || `用户 ${userId} 不存在或查询失败`);
  }

  // 2. 通过 sites 表获取 tenant_id
  try {
    const rows = await sql<{ tenant_id: string | null }[]>`
      SELECT tenant_id FROM public.sites
      WHERE site_id = ${siteId}
      LIMIT 1
    `;
    if (!rows[0]) {
      throw new Error(`站点 ${siteId} 不存在`);
    }
    if (!rows[0].tenant_id) {
      throw new Error(`站点 ${siteId} 未关联租户 (tenant_id 为空)`);
    }
    return { tenantId: rows[0].tenant_id, siteId };
  } catch (error: any) {
    console.error('获取站点 tenant_id 失败:', error);
    throw new Error(error.message || `站点 ${siteId} 不存在或查询失败`);
  }
}