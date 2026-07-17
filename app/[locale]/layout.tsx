// app/[locale]/layout.tsx

import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { locales } from '@/i18n/config';
import Script from 'next/script'; // ✅ 导入 Script 组件
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getHeaderConfig, getMenuBySourceId, getFooterConfig, getMultipleMenus } from '@/lib/config-loader';
import { getSiteSettings } from '@/lib/getSiteSettings';
import DetectLanguage from '@/components/DetectLanguage';
import { getEnabledLanguages } from '@/lib/languages/settings';
import ChatWidgetWrapper from '@/components/litechat/ChatWidgetWrapper';

// 只生成已开通的语言的静态页面，而不是所有 locales
export async function generateStaticParams() {
  const enabled = await getEnabledLanguages();
  return enabled.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // 获取站点配置的域名
  const settings = await getSiteSettings();
  const configuredDomain = settings.websiteUrl?.trim()?.replace(/\/+$/, '');

  // 获取当前请求的路径
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  // 构建 baseUrl：优先使用配置的域名，本地开发时使用 host
  let baseUrl: string;
  if (configuredDomain) {
    baseUrl = configuredDomain;
  } else {
    // 本地开发降级方案
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }

  // 构建当前页面的完整 URL
  const canonicalUrl = `${baseUrl}/${locale}${pathname}`;

  return {
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      locale: locale,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as any)) notFound();

  setRequestLocale(locale);

  // 并行获取配置
  let messages, headerConfig, siteSettings, footerConfig;
  try {
    [messages, headerConfig, siteSettings, footerConfig] = await Promise.all([
      getMessages(),
      getHeaderConfig(locale),
      getSiteSettings(),
      getFooterConfig(locale),
    ]);
  } catch (error) {
    console.error('Failed to load essential config for locale', locale, error);
    notFound();
  }

  // 处理菜单数据
  const headerMenuSourceId = headerConfig?.menu?.menuSourceId;
  let headerMenuData = null;
  let menuMissing = false;

  if (headerMenuSourceId && headerMenuSourceId.trim() !== '') {
    headerMenuData = await getMenuBySourceId(locale, headerMenuSourceId);
    if (!headerMenuData) menuMissing = true;
  } else {
    menuMissing = true;
  }

  const headerMissing = !headerConfig || (!headerConfig.logo && !headerConfig.menu);

  const footerMenuIds = [
    footerConfig?.brandMenu?.column1?.menuId,
    footerConfig?.brandMenu?.column2?.menuId,
    footerConfig?.brandMenu?.column3?.menuId,
  ].filter(Boolean);
  const footerMenusMap = await getMultipleMenus(locale, footerMenuIds);

  return (
    <NextIntlClientProvider messages={messages}>
      <DetectLanguage />
      <div className="min-h-screen flex flex-col">
        {/* 配置缺失提示条 */}
        {(headerMissing || menuMissing) && (
          <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-800 text-sm p-2 text-center">
            {headerMissing && !menuMissing && <span>网站页头尚未设置，请检查页头配置文件。</span>}
            {!headerMissing && menuMissing && <span>网站导航菜单尚未设置，请在页头配置中指定菜单源或创建菜单文件。</span>}
            {headerMissing && menuMissing && <span>网站页头和导航菜单均未设置，请检查配置。</span>}
          </div>
        )}
        {/* 导航栏 */}
        <div className="sticky top-0 z-50">
          <Navbar
            headerConfig={headerConfig}
            menuData={headerMenuData}
            siteSettings={siteSettings}
            footerConfig={footerConfig}
          />
        </div>
        {/* 主内容区域 */}
        <main className="flex-grow w-full pb-8 relative z-0">
          {children}
        </main>
        {/* 页脚 */}
        <Footer
          footerConfig={footerConfig}
          menusMap={footerMenusMap}
          siteSettings={siteSettings}
        />
        {/* 聊天挂件 - 仅在客户端渲染 */}
        <ChatWidgetWrapper />
      </div>

      {/* ✅ Umami 追踪脚本 - 使用 next/script 优化加载 */}
      <Script
        defer
        src="https://umami-jeekuadata.vercel.app/script.js"
        data-website-id="76f2e442-8655-4492-8891-2fa7df2f59f4"
        strategy="afterInteractive"
      />
    </NextIntlClientProvider>
  );
}