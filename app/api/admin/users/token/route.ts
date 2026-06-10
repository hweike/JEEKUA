import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase/client';
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

  // 处理平台凭据 (type=platform&platform=alibaba)
  if (type === 'platform' && platform) {
    const { data, error } = await supabase
      .from('user_platform_credentials')
      .select('credential')
      .eq('user_id', user.id)
      .eq('platform', platform)
      .maybeSingle();
    if (error) return errorResponse('查询失败', 500);
    return NextResponse.json({ credential: data?.credential || '' });
  }

  // 默认返回 api_token（兼容旧逻辑）
  const { data: adminUser, error: fetchError } = await supabase
    .from('admin_users')
    .select('api_token, api_token_expires_at')
    .eq('id', user.id)
    .single();
  if (fetchError && fetchError.code !== 'PGRST116') return errorResponse('查询失败', 500);

  let token = adminUser?.api_token;
  if (!token) {
    token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    const { error: updateError } = await supabase
      .from('admin_users')
      .update({ api_token: token, api_token_expires_at: expiresAt.toISOString() })
      .eq('id', user.id);
    if (updateError) return errorResponse('生成 token 失败', 500);
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
    const { error } = await supabase
      .from('user_platform_credentials')
      .upsert({
        user_id: user.id,
        platform,
        credential,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,platform' });
    if (error) return errorResponse('保存失败', 500);
    return NextResponse.json({ success: true });
  }

  // 默认刷新 api_token
  const newToken = randomBytes(32).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  const { error } = await supabase
    .from('admin_users')
    .update({ api_token: newToken, api_token_expires_at: expiresAt.toISOString() })
    .eq('id', user.id);
  if (error) return errorResponse('刷新 token 失败', 500);
  return NextResponse.json({ token: newToken });
}