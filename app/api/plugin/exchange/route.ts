import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { supabase } from '@/lib/supabase/client';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;

async function verifyAuthToken(authToken: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(authToken, secret);
    return payload.id as string;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authCookie } = await request.json();
    if (!authCookie) {
      return NextResponse.json({ error: 'Missing auth cookie' }, { status: 401 });
    }

    const userId = await verifyAuthToken(authCookie);
    if (!userId) {
      return NextResponse.json({ error: 'Invalid auth cookie' }, { status: 401 });
    }

    // 查询用户的 api_token
    const { data: user, error: fetchError } = await supabase
      .from('admin_users')
      .select('api_token, api_token_expires_at')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Fetch user error:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let token = user?.api_token;
    const now = new Date();

    // 如果 token 不存在或已过期，则生成新的
    if (!token || (user?.api_token_expires_at && new Date(user.api_token_expires_at) < now)) {
      token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30天有效期
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ api_token: token, api_token_expires_at: expiresAt.toISOString() })
        .eq('id', userId);
      if (updateError) {
        console.error('Update token error:', updateError);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
      }
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error('Exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}