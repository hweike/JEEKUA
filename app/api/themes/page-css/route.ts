// app/api/themes/page-css/route.ts
import { NextRequest, NextResponse } from 'next/server';
import NodeCache from 'node-cache';
import { readActiveTheme, readThemeFile } from '@/lib/theme';
import { locales } from '@/i18n/config';

// ============================================================
// 内存缓存（5 分钟）
// ============================================================
const cssCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

// ============================================================
// 工具函数
// ============================================================

function isColorValue(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim();
  return (
    v.startsWith('#') ||
    v.startsWith('rgb') ||
    v.startsWith('hsl') ||
    v.startsWith('oklch') ||
    v.startsWith('oklab') ||
    v.startsWith('lab') ||
    v.startsWith('lch') ||
    v.startsWith('color(') ||
    v.startsWith('var(') ||
    v === 'transparent' ||
    v === 'currentColor'
  );
}

function filterColorVars(obj: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && isColorValue(value.trim())) {
      result[key] = value.trim();
    }
  }
  return result;
}

function isValidCssValue(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed === '') return false;
  if (trimmed === 'undefined' || trimmed === 'null' || trimmed === 'NaN') return false;
  if (trimmed === '[object Object]') return false;
  return true;
}

function isValidCssVarName(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key);
}

function flattenThemeToCss(theme: {
  colors?: Record<string, string>;
  typography?: Record<string, string>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  shadows?: Record<string, string>;
  animation?: Record<string, string>;
}): string {
  const lines: string[] = [];
  const flatten = (obj: Record<string, string> | undefined) => {
    if (!obj || typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (!isValidCssVarName(key)) continue;
      if (!isValidCssValue(value)) continue;
      lines.push(`--${key}: ${value.trim()};`);
    }
  };
  flatten(theme.colors);
  flatten(theme.typography);
  flatten(theme.spacing);
  flatten(theme.borderRadius);
  flatten(theme.shadows);
  flatten(theme.animation);
  return lines.join('\n');
}

// ============================================================
// 路径别名
// ============================================================
const PATH_ALIASES: Record<string, string[]> = {
  '/': ['/', '/home'],
  '/products': ['/products', '/product', '/collections'],
  '/blog': ['/blog', '/blogs'],
  '/docs': ['/docs'],
  '/videos': ['/video', '/videos'],
  '/inquiry': ['/inquiry'],
  '/account': ['/account'],
  '/search': ['/search'],
};

// ============================================================
// 核心：生成指定路径的 CSS（可缓存）
// ============================================================
async function generatePageCss(pathname: string): Promise<{
  css: string;
  status: string;
  matched: string;
}> {
  // 1. 跳过后台和静态资源
  if (pathname.startsWith('/admin') || pathname.startsWith('/webbuilder')) {
    return { css: '/* no page override */', status: 'admin-path', matched: '' };
  }

  // 2. 读取激活主题
  const activeThemeMeta = await readActiveTheme();
  if (!activeThemeMeta) {
    return { css: '/* no page override */', status: 'no-active-theme', matched: '' };
  }

  // 3. 读取页面主题文件
  const pageThemeData = await readThemeFile(activeThemeMeta.pageThemePath);
  if (!pageThemeData) {
    return { css: '/* no page override */', status: 'no-page-theme', matched: '' };
  }
  if (!pageThemeData.pages || !Array.isArray(pageThemeData.pages)) {
    return { css: '/* no page override */', status: 'invalid-format', matched: '' };
  }

  // 4. 匹配当前路径
  const pages = pageThemeData.pages;
  const localePrefixRegex = new RegExp(`^/(?:${locales.join('|')})`);
  const pathWithoutLocale = pathname.replace(localePrefixRegex, '') || '/';

  let pageOverride: any = null;
  let matchedPagePath: string | null = null;

  const exactMatch = pages.find((p: any) => p.pagePath === pathWithoutLocale);
  if (exactMatch) {
    pageOverride = exactMatch.overrides || null;
    matchedPagePath = exactMatch.pagePath;
  } else {
    const wildcardPages = pages
      .filter((p: any) => p.pagePath.includes('*'))
      .sort((a: any, b: any) => b.pagePath.length - a.pagePath.length);

    for (const p of wildcardPages) {
      const pattern = p.pagePath.replace('*', '').replace(/\/$/, '');
      const aliases = PATH_ALIASES[pattern] || [pattern];
      const matched = aliases.some((alias: string) => {
        return pathWithoutLocale === alias || pathWithoutLocale.startsWith(alias + '/');
      });
      if (matched) {
        pageOverride = p.overrides || null;
        matchedPagePath = p.pagePath;
        break;
      }
    }
  }

  if (!pageOverride) {
    return { css: '/* no page override */', status: 'no-match', matched: '' };
  }

  // 5. 生成 CSS
  const filteredColors = filterColorVars(pageOverride.colors || {});
  const pageCss = flattenThemeToCss({
    colors: filteredColors,
    typography: pageOverride.typography || {},
    spacing: pageOverride.spacing || {},
    borderRadius: pageOverride.borderRadius || {},
    shadows: pageOverride.shadows || {},
    animation: pageOverride.animation || {},
  });

  if (!pageCss) {
    return { css: '/* no page override */', status: 'empty-css', matched: matchedPagePath || '' };
  }

  return {
    css: `:root { ${pageCss} }`,
    status: 'ok',
    matched: matchedPagePath || '',
  };
}

// ============================================================
// GET /api/themes/page-css?path=/zh/video
// ============================================================
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawPath = searchParams.get('path');
  const pathname = rawPath || '/';

  const cacheKey = `page-css:${pathname}`;

  // 1. 命中缓存
  const cached = cssCache.get<{ css: string; status: string; matched: string }>(cacheKey);
  if (cached) {
    return new NextResponse(cached.css, {
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=10, stale-while-revalidate=60',
        'X-Page-CSS-Status': cached.status,
        'X-Page-CSS-Matched': cached.matched,
        'X-Cache': 'HIT',
      },
    });
  }

  // 2. 计算
  const result = await generatePageCss(pathname);

  // 3. 写缓存
  cssCache.set(cacheKey, result);

  return new NextResponse(result.css, {
    headers: {
      'Content-Type': 'text/css; charset=utf-8',
      'Cache-Control': 'public, max-age=10, stale-while-revalidate=60',
      'X-Page-CSS-Status': result.status,
      'X-Page-CSS-Matched': result.matched,
      'X-Cache': 'MISS',
    },
  });
}