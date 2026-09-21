// app/api/productCrawl/plugin/exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * 从请求中提取用户ID（Cookie自动认证）
 */
async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  // 方式1：从 HttpOnly Cookie 读取（最安全）
  const authCookie = request.cookies.get('auth_token')?.value;
  if (authCookie) {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(authCookie, secret);
      return payload.id as string;
    } catch {
      return null;
    }
  }
  
  // 方式2：从 Authorization header 读取（兼容）
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    try {
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload.id as string;
    } catch {
      return null;
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // 自动从请求中识别用户，不需要前端传参
    const userId = await getUserIdFromRequest(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录独立站' },
        { status: 401 }
      );
    }

    // 查询或生成 api_token
    const { data: user, error: fetchError } = await supabase
      .from('admin_users')
      .select('api_token, api_token_expires_at')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch user error:', fetchError);
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      );
    }

    let token = user?.api_token;
    const now = new Date();

    // 如果 token 不存在或已过期，自动生成新的
    if (!token || (user?.api_token_expires_at && new Date(user.api_token_expires_at) < now)) {
      token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ 
          api_token: token, 
          api_token_expires_at: expiresAt.toISOString() 
        })
        .eq('id', userId);
      
      if (updateError) {
        console.error('Update token error:', updateError);
        return NextResponse.json(
          { error: 'Failed to generate token' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ 
      token,
      expiresAt: user?.api_token_expires_at
    });
    
  } catch (error) {
    console.error('Exchange error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}