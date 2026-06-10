// lib/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
const JWT_EXPIRES_IN = '24h';

function getSecretKey() {
  return new TextEncoder().encode(JWT_SECRET);
}

export interface JWTPayload {
  username: string; // 邮箱
  id: string;
  siteId: string;   // 新增：站点标识
}

/**
 * 生成 JWT 并设置 HttpOnly Cookie
 * @param username 用户邮箱
 * @param userId 用户ID
 * @param siteId 用户所属站点ID
 */
export async function setAuthCookie(username: string, userId: string, siteId: string): Promise<void> {
  const secretKey = getSecretKey();
  const token = await new SignJWT({ username, id: userId, siteId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(secretKey);
  
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

/**
 * 从请求中获取当前用户信息
 */
export async function getCurrentUser(request?: NextRequest): Promise<JWTPayload | null> {
  let token: string | undefined;
  if (request) {
    token = request.cookies.get('auth_token')?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get('auth_token')?.value;
  }
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as JWTPayload;
  } catch (error) {
    console.error('JWT verify error:', error);
    return null;
  }
}

/**
 * 清除 Cookie
 */
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', '', { maxAge: 0, path: '/' });
}

/**
 * 验证 API 请求（中间件辅助）
 */
export async function validateAuth(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  return user;
}