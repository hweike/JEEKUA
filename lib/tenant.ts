// lib/tenant.ts
import { supabase } from '@/lib/supabase/client';

/**
 * 获取用户的租户ID和站点ID
 * @param userId 用户ID (admin_users.id)
 * @returns { tenantId: string, siteId: string }
 * @throws 当用户未关联站点或站点未关联租户时抛出错误
 */
export async function getUserTenantAndSite(userId: string): Promise<{ tenantId: string; siteId: string }> {
  // 1. 从 admin_users 获取 site_id
  const { data: user, error: userError } = await supabase
    .from('admin_users')
    .select('site_id')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('获取用户 site_id 失败:', userError);
    throw new Error(`用户 ${userId} 不存在或查询失败`);
  }
  if (!user?.site_id) {
    throw new Error(`用户 ${userId} 未关联站点 (site_id 为空)`);
  }
  const siteId = user.site_id;

  // 2. 通过 sites 表获取 tenant_id
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .select('tenant_id')
    .eq('site_id', siteId)
    .single();

  if (siteError) {
    console.error('获取站点 tenant_id 失败:', siteError);
    throw new Error(`站点 ${siteId} 不存在或查询失败`);
  }
  if (!site?.tenant_id) {
    throw new Error(`站点 ${siteId} 未关联租户 (tenant_id 为空)`);
  }
  const tenantId = site.tenant_id;

  return { tenantId, siteId };
}