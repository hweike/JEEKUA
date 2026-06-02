import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { locales } from '@/i18n/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getHeaderConfig, getMenuBySourceId, getFooterConfig, getMultipleMenus } from '@/lib/config-loader';
import { getSiteSettings } from '@/lib/getSiteSettings';
import DetectLanguage from '@/components/DetectLanguage';

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const headersList = await headers();
  const host = headersList.get('host') || '';
  const pathname = headersList.get('x-pathname') || '';
  const baseUrl = `https://${host}`;

  const languages: Record<string, string> = {};
  for (const lng of locales) {
    languages[lng] = `${baseUrl}/${lng}${pathname}`;
  }

  return {
    alternates: {
      languages,
      canonical: `${baseUrl}/${locale}${pathname}`,
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
        {/* 导航栏（背景全宽，内容与主区域对齐） */}
        <div className="sticky top-0 z-50">
          <Navbar
            headerConfig={headerConfig}
            menuData={headerMenuData}
            siteSettings={siteSettings}
            footerConfig={footerConfig}
          />
        </div>
        {/* 主内容区域：不再限制宽度，宽度由子页面内部容器控制，确保与导航栏/页脚内容宽度一致 */}
        <main className="flex-grow w-full py-8 relative z-0">
          {children}
        </main>
        {/* 页脚（背景全宽，内容与主区域对齐） */}
        <Footer
          footerConfig={footerConfig}
          menusMap={footerMenusMap}
          siteSettings={siteSettings}
        />
      </div>
    </NextIntlClientProvider>
  );
}