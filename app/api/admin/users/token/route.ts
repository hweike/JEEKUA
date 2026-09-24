// app/api/admin/users/token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import sql from '@/lib/db/admin';
import { randomBytes } from 'crypto';

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return errorResponse('未授权', 401);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const platform = url.searchParams.get('platform');

  // 处理平台凭据
  if (type === 'platform' && platform) {
    try {
      const rows = await sql<{ credential: string }[]>`
        SELECT credential FROM public.user_platform_credentials
        WHERE user_id = ${user.id}
          AND platform = ${platform}
        LIMIT 1
      `;
      return NextResponse.json({ credential: rows[0]?.credential || '' });
    } catch (error) {
      console.error('查询平台凭据失败:', error);
      return errorResponse('查询失败', 500);
    }
  }

  // 默认返回 api_token
  let adminUser: { api_token: string | null; api_token_expires_at: string | null } | undefined;
  try {
    const rows = await sql<{ api_token: string | null; api_token_expires_at: string | null }[]>`
      SELECT api_token, api_token_expires_at FROM public.admin_users
      WHERE id = ${user.id}
      LIMIT 1
    `;
    adminUser = rows[0];
  } catch (error) {
    console.error('查询 admin_users 失败:', error);
    return errorResponse('查询失败', 500);
  }

  let token = adminUser?.api_token;
  if (!token) {
    token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    try {
      await sql`
        UPDATE public.admin_users
        SET api_token = ${token},
            api_token_expires_at = ${expiresAt.toISOString()}
        WHERE id = ${user.id}
      `;
    } catch (error) {
      console.error('生成 token 失败:', error);
      return errorResponse('生成 token 失败', 500);
    }
  }
  return NextResponse.json({ token });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return errorResponse('未授权', 401);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const platform = url.searchParams.get('platform');

  // 保存/更新平台凭据
  if (type === 'platform' && platform) {
    const { credential } = await request.json();
    if (typeof credential !== 'string') return errorResponse('无效的凭据', 400);
    try {
      await sql`
        INSERT INTO public.user_platform_credentials (user_id, platform, credential, updated_at)
        VALUES (${user.id}, ${platform}, ${credential}, ${new Date().toISOString()})
        ON CONFLICT (user_id, platform)
        DO UPDATE SET
          credential = ${credential},
          updated_at = ${new Date().toISOString()}
      `;
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('保存平台凭据失败:', error);
      return errorResponse('保存失败', 500);
    }
  }

  // 默认刷新 api_token
  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  try {
    await sql`
      UPDATE public.admin_users
      SET api_token = ${newToken},
          api_token_expires_at = ${expiresAt.toISOString()}
      WHERE id = ${user.id}
    `;
  } catch (error) {
    console.error('刷新 token 失败:', error);
    return errorResponse('刷新 token 失败', 500);
  }
  return NextResponse.json({ token: newToken });
}