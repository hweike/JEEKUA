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
  siteId: string;
  role?: string;    // 扩展角色字段
}

// ========== 通用 JWT 工具（前后台共用）==========
/**
 * 签名生成 JWT
 */
export async function sign(payload: Record<string, any>, options?: { expiresIn?: string }): Promise<string> {
  const secretKey = getSecretKey();
  const expiresIn = options?.expiresIn || JWT_EXPIRES_IN;
  const jwt = new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn);
  return await jwt.sign(secretKey);
}

/**
 * 验证并解码 JWT
 */
export async function verify(token: string): Promise<any> {
  const secretKey = getSecretKey();
  const { payload } = await jwtVerify(token, secretKey);
  return payload;
}

// ========== 后台管理专用（原有功能，内部调用 sign/verify）==========
export async function setAuthCookie(username: string, userId: string, siteId: string): Promise<void> {
  const token = await sign({ username, id: userId, siteId, role: 'admin' });
  const cookieStore = await cookies();
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24,
  });
}

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
    const payload = await verify(token);
    return payload as JWTPayload;
  } catch (error) {
    console.error('JWT verify error:', error);
    return null;
  }
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('auth_token', '', { maxAge: 0, path: '/' });
}

export async function validateAuth(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }
  return user;
}