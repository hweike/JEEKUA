// lib/withPageLocale.ts
import { setRequestLocale } from 'next-intl/server';
import { getEnabledLanguages } from '@/lib/languages/settings';

// 用于静态生成页面（所有语言都已知）
export function withStaticLocale<P extends { params: Promise<{ locale: string }> }>(
  PageComponent: (props: P) => Promise<React.ReactElement>
) {
  const generateStaticParams = async () => {
    const enabled = await getEnabledLanguages();
    return enabled.map(locale => ({ locale }));
  };

  const WrappedPage = async (props: P) => {
    const { locale } = await props.params;
    setRequestLocale(locale);
    return PageComponent(props);
  };

  WrappedPage.generateStaticParams = generateStaticParams;
  return WrappedPage;
}

// 用于动态参数页面（不生成静态参数，只设置 locale）
export function withDynamicLocale<P extends { params: Promise<{ locale: string }> }>(
  PageComponent: (props: P) => Promise<React.ReactElement>
) {
  const WrappedPage = async (props: P) => {
    const { locale } = await props.params;
    setRequestLocale(locale);
    return PageComponent(props);
  };
  return WrappedPage;
}