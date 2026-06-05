// middleware.ts（保持原有代码，不做任何自动检测）
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/config';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 静态资源直接放行
  const isStaticAsset =
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico');
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // 站点地图路径直接放行
  if (pathname.startsWith('/sitemap')) {
    return NextResponse.next();
  }

  // ========== 后台认证保护（JWT） ==========
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

  // 后台路径直接跳过多语言中间件
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/webbuilder')) {
    return NextResponse.next();
  }

  // ========== 前台国际化处理 ==========
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};