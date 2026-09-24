// app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { locales } from '@/i18n/config';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { getHeaderConfig, getMenuBySourceId, getFooterConfig, getMultipleMenus } from '@/lib/config-loader';
import { getSiteSettings } from '@/lib/getSiteSettings';
import DetectLanguage from '@/components/DetectLanguage';
import { getEnabledLanguages } from '@/lib/languages/settings';
import ChatWidgetWrapper from '@/components/litechat/ChatWidgetWrapper';
import RtlSupport from '@/components/RtlSupport';
import PageThemeStyle from '@/components/front/PageThemeStyle';

export async function generateStaticParams() {
  const enabled = await getEnabledLanguages();
  return enabled.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    return {
      title: 'Site',
      robots: 'noindex, follow',
    };
  }

  const { locale } = resolvedParams;

  const settings = await getSiteSettings();
  const configuredDomain = settings.websiteUrl?.trim()?.replace(/\/+$/, '');

  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  let baseUrl: string;
  if (configuredDomain) {
    baseUrl = configuredDomain;
  } else {
    const host = headersList.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    baseUrl = `${protocol}://${host}`;
  }

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
  // ✅ 防御性检查：构建时 Next.js 可能传入 undefined
  const resolvedParams = await params;
  if (!resolvedParams?.locale) {
    notFound();
  }

  const { locale } = resolvedParams;
  if (!locales.includes(locale as any)) notFound();

  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const translationMissing = Object.keys(messages).length === 0;
  if (translationMissing) {
    console.warn(`[LocaleLayout] 翻译文件缺失或为空: messages/${locale}.json`);
  }

  let headerConfig, siteSettings, footerConfig;

  try {
    [headerConfig, siteSettings, footerConfig] = await Promise.all([
      getHeaderConfig(locale),
      getSiteSettings(),
      getFooterConfig(locale),
    ]);
  } catch (error) {
    console.error('Failed to load essential config for locale', locale, error);
    notFound();
  }

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
    <NextIntlClientProvider messages={messages} locale={locale}>
      <PageThemeStyle />

      <RtlSupport locale={locale} />
      <DetectLanguage />
      <div className="min-h-screen flex flex-col">
        {translationMissing && (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-700 text-sm p-2 text-center">
            ⚠️ 当前语言（<strong>{locale}</strong>）缺少多语言翻译文件，请创建 <code>messages/{locale}.json</code>。
          </div>
        )}

        {(headerMissing || menuMissing) && (
          <div className="bg-yellow-100 border-b border-yellow-300 text-yellow-800 text-sm p-2 text-center">
            {headerMissing && !menuMissing && <span>网站页头尚未设置，请检查页头配置文件。</span>}
            {!headerMissing && menuMissing && <span>网站导航菜单尚未设置，请在页头配置中指定菜单源或创建菜单文件。</span>}
            {headerMissing && menuMissing && <span>网站页头和导航菜单均未设置，请检查配置。</span>}
          </div>
        )}

        <div className="sticky top-0 z-50">
          <Navbar
            headerConfig={headerConfig}
            menuData={headerMenuData}
            siteSettings={siteSettings}
            footerConfig={footerConfig}
          />
        </div>

        <main className="flex-grow w-full relative z-0 pb-8 md:pb-12 lg:pb-16">
          {children}
        </main>

        <Footer
          footerConfig={footerConfig}
          menusMap={footerMenusMap}
          siteSettings={siteSettings}
        />
        <ChatWidgetWrapper />
      </div>
    </NextIntlClientProvider>
  );
}