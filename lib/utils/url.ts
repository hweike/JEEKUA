// lib/utils/url.ts
import { NextRequest } from 'next/server';

/**
 * 从请求中获取 Base URL
 */
export function getBaseUrl(request: NextRequest): string {
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  const host = request.headers.get('host') || 'localhost:3000';
  return `${protocol}://${host}`;
}

/**
 * 获取站点默认语言
 * 优先从 cookie 获取，否则从 Accept-Language 获取，默认 en
 */
export function getDefaultLocale(request: NextRequest): string {
  // 1. 从 cookie 获取用户选择的语言
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookieLocale) return cookieLocale;
  
  // 2. 从 Accept-Language 头获取浏览器语言
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferred = acceptLanguage.split(',')[0]?.split('-')[0];
    if (preferred && ['zh', 'en', 'es', 'fr', 'de', 'ja', 'ko'].includes(preferred)) {
      return preferred;
    }
  }
  
  // 3. 默认返回 en
  return 'en';
}

/**
 * 生成分享链接
 */
export function generateShareUrl(
  request: NextRequest,
  path: string,
  token: string
): string {
  const baseUrl = getBaseUrl(request);
  const locale = getDefaultLocale(request);
  return `${baseUrl}/${locale}${path}/${token}`;
}