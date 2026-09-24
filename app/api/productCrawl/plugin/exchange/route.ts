// app/api/productCrawl/plugin/exchange/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import sql from '@/lib/db/admin';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET!;

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
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
    const userId = await getUserIdFromRequest(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: '请先登录独立站' },
        { status: 401 }
      );
    }

    // 查询 api_token
    let user: { api_token: string | null; api_token_expires_at: string | null } | undefined;
    try {
      const rows = await sql<{ api_token: string | null; api_token_expires_at: string | null }[]>`
        SELECT api_token, api_token_expires_at FROM public.admin_users
        WHERE id = ${userId}
        LIMIT 1
      `;
      user = rows[0];
    } catch (error) {
      console.error('Fetch user error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    let token = user.api_token;
    const now = new Date();

    // token 不存在或过期，生成新 token
    if (!token || (user.api_token_expires_at && new Date(user.api_token_expires_at) < now)) {
      token = randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      try {
        await sql`
          UPDATE public.admin_users
          SET api_token = ${token},
              api_token_expires_at = ${expiresAt.toISOString()}
          WHERE id = ${userId}
        `;
      } catch (error) {
        console.error('Update token error:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
      }
    }

    return NextResponse.json({
      token,
      expiresAt: user.api_token_expires_at,
    });
  } catch (error) {
    console.error('Exchange error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}