// lib/utils/request.ts
import { NextRequest } from 'next/server';

export async function getSiteId(request: NextRequest): Promise<string> {
  // 从 cookie 获取 site_id
  const siteId = request.cookies.get('site_id')?.value;
  if (siteId) return siteId;
  
  // 从 header 获取
  const headerSiteId = request.headers.get('x-site-id');
  if (headerSiteId) return headerSiteId;
  
  // 默认值
  return process.env.NEXT_PUBLIC_SITE_ID || '000001';
}

export async function getOperator(request: NextRequest): Promise<string> {
  // 从 cookie 获取用户信息
  const userId = request.cookies.get('user_id')?.value;
  if (userId) return userId;
  
  // 从 header 获取
  const headerUserId = request.headers.get('x-user-id');
  if (headerUserId) return headerUserId;
  
  // 从 session 或 token 获取（根据你的认证方式调整）
  // 如果都没有，返回 'system'
  return 'system';
}