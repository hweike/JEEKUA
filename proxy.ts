// proxy.ts
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

const countryToLocale: Record<string, string> = {
  US: 'en',
  GB: 'en',
  AU: 'en',
  CA: 'en',
  CN: 'zh',
  HK: 'zh',
  TW: 'zh',
  SG: 'zh',
  ES: 'es',
  MX: 'es',
  AR: 'es',
  DE: 'de',
  AT: 'de',
  CH: 'de',
  JP: 'ja',
  FR: 'fr',
  BE: 'fr',
  SA: 'ar',
  AE: 'ar',
  KR: 'ko',
  BR: 'pt',
  PT: 'pt',
  IT: 'it',
  NL: 'nl',
  PL: 'pl',
  RU: 'ru',
  TR: 'tr',
  ID: 'id',
  VN: 'vi',
  TH: 'th',
  IL: 'he',
  SE: 'sv',
  NO: 'no',
  DK: 'da',
  FI: 'fi',
  GR: 'el',
  CZ: 'cs',
  HU: 'hu',
  RO: 'ro',
  BG: 'bg',
  HR: 'hr',
  SK: 'sk',
  SI: 'sl',
  LT: 'lt',
  LV: 'lv',
  EE: 'et',
  MY: 'ms',
  IN: 'hi',
};

const accountPathRegex = new RegExp(`^/(?:${locales.join('|')})?/account(/.*)?$`);
const loginPathRegex = new RegExp(`^/(?:${locales.join('|')})?/login$`);

/**
 * 创建一个新的 NextRequest，包含自定义 headers
 */
function createRequestWithHeaders(request: NextRequest, headers: Headers): NextRequest {
  const newRequest = new Request(request.url, {
    method: request.method,
    headers: headers,
  });
  return new NextRequest(newRequest);
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ----- 创建自定义请求头 -----
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/webbuilder');
  requestHeaders.set('x-zone', isAdmin ? 'admin' : 'frontend');

  // ============================================================
  // ✅ 静态资源和共享目录
  // ============================================================
  const isStaticAsset =
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/share/') ||
    pathname.startsWith('/fonts/') ||
    pathname === '/robots.txt';
  
  if (isStaticAsset) {
    // ✅ 修复：使用 headers 方法设置自定义请求头
    const response = NextResponse.next();
    // 将自定义请求头添加到响应中，以便后续处理
    requestHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // 2. 站点地图
  if (pathname.startsWith('/sitemap')) {
    const response = NextResponse.next();
    requestHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // ---------- 3. 后台认证 ----------
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
      const response = NextResponse.redirect(loginUrl);
      requestHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  // ---------- 4. 前台客户账户 ----------
  const isCustomerAccount = accountPathRegex.test(pathname);
  const isCustomerLogin = loginPathRegex.test(pathname);

  if (isCustomerAccount && !isCustomerLogin) {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      const localeMatch = pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callback', pathname);
      const response = NextResponse.redirect(loginUrl);
      requestHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const payload = await verifyCustomerToken(token);
    if (!payload) {
      const localeMatch = pathname.match(/^\/([a-z]{2})\//);
      const locale = localeMatch ? localeMatch[1] : defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, request.url);
      loginUrl.searchParams.set('callback', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('token');
      requestHeaders.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }
  }

  // ---------- 5. 后台路径跳过语言中间件 ----------
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/webbuilder')) {
    const response = NextResponse.next();
    requestHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // ---------- 6. 自动语言检测 ----------
  const userSelected = request.cookies.get('user_selected_language')?.value;
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;

  if (!userSelected && !localeCookie) {
    let detectedLocale: string | null = null;

    const country = request.headers.get('cf-ipcountry') || '';
    if (country && countryToLocale[country]) {
      detectedLocale = countryToLocale[country];
    }

    if (!detectedLocale) {
      const acceptLang = request.headers.get('accept-language') || '';
      const lang = acceptLang.split(',')[0]?.split('-')[0] || '';
      if (locales.includes(lang as any)) {
        detectedLocale = lang;
      }
    }

    if (!detectedLocale) {
      detectedLocale = defaultLocale;
    }

    const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}/, '');
    const newPath = `/${detectedLocale}${pathWithoutLocale}`;
    const redirectUrl = new URL(newPath, request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    response.cookies.set('auto_set_language', 'true', { path: '/', maxAge: 60 });
    requestHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // ---------- 7. next-intl 处理 ----------
  const requestWithHeaders = createRequestWithHeaders(request, requestHeaders);
  const response = intlMiddleware(requestWithHeaders);
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|share/|fonts/).*)'],
};