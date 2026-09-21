// app/layout.tsx
import { headers } from 'next/headers';
import { locales } from '@/i18n/config';
import './globals.css';
import { cn } from "@/lib/utils";
import { ToastProvider } from '@/contexts/ToastContext';
import {
  readActiveTheme,
  readThemeFile,
  getCachedThemeCss,
  setCachedThemeCss,
} from '@/lib/theme';
import { Toaster } from 'sonner';
import Script from 'next/script';
import { getSiteSettings } from '@/lib/getSiteSettings';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata() {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // ✅ 后台 / webbuilder：不返回 title，交给 AdminLayout 客户端动态设置
  //    （返回 {} 可避免 Next.js 在路由切换时用固定 title 覆盖 document.title）
  if (pathname.startsWith('/admin') || pathname.startsWith('/webbuilder')) {
    return {};
  }

  // ✅ 前台：用 siteName
  const settings = await getSiteSettings();
  const siteName = settings.siteName || 'JEEKUA TECH';
  return {
    title: {
      default: siteName,
    },
  };
}

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

function extractByPrefix(
  obj: Record<string, any>,
  prefixes: string[]
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      if (typeof value === 'string' && value.trim() !== '') {
        result[key] = value.trim();
      }
    }
  }
  return result;
}

function extractThemeVars(themeData: any): {
  colors: Record<string, string>;
  darkColors: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  borderRadius: Record<string, string>;
  shadows: Record<string, string>;
  animation: Record<string, string>;
  darkMode: 'system' | 'light' | 'dark';
} {
  if (!themeData) {
    return {
      colors: {},
      darkColors: {},
      typography: {},
      spacing: {},
      borderRadius: {},
      shadows: {},
      animation: {},
      darkMode: 'system',
    };
  }

  if (themeData.cssVars) {
    const light = themeData.cssVars.light || {};
    const dark = themeData.cssVars.dark || {};
    const theme = themeData.cssVars.theme || {};

    const lightColors = filterColorVars(light);
    const darkColors = filterColorVars(dark);
    const themeColors = filterColorVars(theme);

    const extractAll = (prefixes: string[]) => ({
      ...extractByPrefix(theme, prefixes),
      ...extractByPrefix(light, prefixes),
      ...extractByPrefix(dark, prefixes),
    });

    const themeTypography = extractAll([
      'font-',
      'text-',
      'line-height',
      'letter-spacing',
      'tracking-',
    ]);
    const themeSpacing = extractAll([
      'spacing',
      'container-padding',
      'section-gap',
      'grid-gap',
      'product-card-padding',
    ]);
    const themeRadius = extractAll([
      'radius',
      'product-card-radius',
      'btn-radius',
      'input-radius',
    ]);
    const themeShadows = extractAll([
      'shadow-',
      'shadow',
      'product-card-shadow',
      'product-card-hover-shadow',
      'dropdown-shadow',
      'btn-shadow',
    ]);
    const themeAnimation = extractAll(['transition-']);

    return {
      colors: { ...lightColors, ...themeColors },
      darkColors: { ...darkColors, ...themeColors },
      typography: {
        ...themeTypography,
        ...(themeData.typography || {}),
      },
      spacing: {
        ...themeSpacing,
        ...(themeData.spacing || {}),
      },
      borderRadius: {
        ...themeRadius,
        ...(themeData.borderRadius || {}),
      },
      shadows: {
        ...themeShadows,
        ...(themeData.shadows || {}),
      },
      animation: {
        ...themeAnimation,
        ...(themeData.animation || {}),
      },
      darkMode: themeData.darkMode || 'system',
    };
  }

  if (themeData.colors !== undefined) {
    return {
      colors: themeData.colors || {},
      darkColors: themeData.darkColors || {},
      typography: themeData.typography || {},
      spacing: themeData.spacing || {},
      borderRadius: themeData.borderRadius || {},
      shadows: themeData.shadows || {},
      animation: themeData.animation || {},
      darkMode: themeData.darkMode || 'system',
    };
  }

  return {
    colors: {},
    darkColors: {},
    typography: {},
    spacing: {},
    borderRadius: {},
    shadows: {},
    animation: {},
    darkMode: 'system',
  };
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

function flattenAllThemeToCss(theme: {
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

const isStaticAsset = (pathname: string): boolean => {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|webp|css|js|json)$/i) !== null
  );
};

// ============================================================
// RootLayout
// ============================================================
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();

  let pathname = headersList.get('x-pathname') || '/';
  let zone = headersList.get('x-zone') || '';

  if (!zone || (zone !== 'admin' && zone !== 'frontend')) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/webbuilder')) {
      zone = 'admin';
    } else {
      zone = 'frontend';
    }
  }

  let locale = headersList.get('x-locale') || 'zh';
  if (!locales.includes(locale as any)) locale = 'zh';

  let lightCss = '';
  let darkCss = '';
  let darkMode = 'system';
  let hasTheme = false;

  if (zone === 'frontend' && !isStaticAsset(pathname)) {
    const activeThemeMeta = await readActiveTheme();

    if (activeThemeMeta) {
      // ✅ 先查缓存
      const cached = getCachedThemeCss(activeThemeMeta.id);
      if (cached) {
        lightCss = cached.lightCss;
        darkCss = cached.darkCss;
        darkMode = cached.darkMode;
        hasTheme = cached.hasTheme;
      } else {
        // 缓存未命中：生成 CSS 并写回缓存
        const rawGlobalTheme = await readThemeFile(activeThemeMeta.globalThemePath);
        const globalTheme = extractThemeVars(rawGlobalTheme);

        lightCss = flattenAllThemeToCss({
          colors: globalTheme.colors || {},
          typography: globalTheme.typography || {},
          spacing: globalTheme.spacing || {},
          borderRadius: globalTheme.borderRadius || {},
          shadows: globalTheme.shadows || {},
          animation: globalTheme.animation || {},
        });

        darkCss = flattenAllThemeToCss({
          colors: globalTheme.darkColors || {},
          typography: globalTheme.typography || {},
          spacing: globalTheme.spacing || {},
          borderRadius: globalTheme.borderRadius || {},
          shadows: globalTheme.shadows || {},
          animation: globalTheme.animation || {},
        });

        darkMode = globalTheme.darkMode || 'system';
        hasTheme = true;

        setCachedThemeCss(activeThemeMeta.id, { lightCss, darkCss, darkMode, hasTheme });
      }
    }
  }

  let htmlClass = cn(
    "font-sans",
    zone === 'admin' ? 'admin-zone' : null
  );

  if (zone === 'frontend' && darkMode === 'dark') {
    htmlClass = cn(htmlClass, 'dark');
  }

  const themeScript = `
    (function() {
      const zone = ${JSON.stringify(zone)};
      if (zone === 'admin') return;

      const darkMode = ${JSON.stringify(darkMode)};
      const setDarkClass = (isDark) => {
        if (isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
      };
      if (darkMode === 'dark') {
        setDarkClass(true);
      } else if (darkMode === 'light') {
        setDarkClass(false);
      } else if (darkMode === 'system') {
        const darkModeMedia = window.matchMedia('(prefers-color-scheme: dark)');
        setDarkClass(darkModeMedia.matches);
        darkModeMedia.addEventListener('change', (e) => setDarkClass(e.matches));
      }
    })();
  `;

  return (
    <html lang={locale} suppressHydrationWarning className={htmlClass}>
      <body suppressHydrationWarning>
        {zone === 'frontend' && hasTheme && (
          <>
            <style id="theme-light" dangerouslySetInnerHTML={{ __html: `:root { ${lightCss} }` }} />
            <style id="theme-dark" dangerouslySetInnerHTML={{ __html: `.dark { ${darkCss} }` }} />
          </>
        )}

        <ToastProvider>
          {children}
        </ToastProvider>
        <Toaster position="top-right" richColors />
        <Script
          id="theme-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
      </body>
    </html>
  );
}