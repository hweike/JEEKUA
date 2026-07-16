import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { verifyCustomerToken } from '@/lib/account/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// 构建匹配账户路径的正则（含语言前缀）
const accountPathRegex = new RegExp(`^/(?:${locales.join('|')})?/account(/.*)?$`);
const loginPathRegex = new RegExp(`^/(?:${locales.join('|')})?/login$`);

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 静态资源直接放行
  const isStaticAsset =
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/robots.txt';
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // 站点地图直接放行
  if (pathname.startsWith('/sitemap')) {
    return NextResponse.next();
  }

  // ---------- 后台认证保护 ----------
  const isAdminPath = pathname.startsWith('/admin');
  const isAdminApiPath = pathname.startsWith('/api/admin');
  const isWebBuilderPath = pathname.startsWith('/webbuilder');
  const isLoginPage = pathname === '/admin/login';
  const isLoginApi = pathname === '/api/admin/login';

  if ((isAdminPath || isAdminApiPath || isWebBuilderPath) && !isLoginPage && !isLoginApi) {
    const user = await getCurrentUser(request);
    if (!user) {
      if (isAdminApiPath || pathname.startsWith('/webbuilder/api')) {
        return NextResponse.json({ error: '未授权' }, { status: 401 });
      }
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('callback', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ---------- 前台客户账户保护 ----------
  const isCustomerAccount = accountPathRegex.test(pathname);
  const isCustomerLogin = loginPathRegex.test(pathname);

  if (isCustomerAccount && !isCustomerLogin) {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      const localeMatch = pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callback', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyCustomerToken(token);
    if (!payload) {
      const localeMatch = pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callback', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      return response;
    }
  }

  // 后台路径直接跳过多语言中间件
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/webbuilder')) {
    return NextResponse.next();
  }

  // ========== 前台国际化处理 ==========
  const firstSegment = pathname.split('/')[1] || '';
  const locale = locales.includes(firstSegment as any) ? firstSegment : defaultLocale;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-locale', locale);
  requestHeaders.set('x-pathname', pathname);

  const modifiedRequest = new NextRequest(request.url, {
    headers: requestHeaders,
    method: request.method,
  });

  return intlMiddleware(modifiedRequest);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};