import { getRequestConfig } from 'next-intl/server';
import { locales, defaultLocale } from './config';

export default getRequestConfig(async ({ locale }) => {
  // 确保 locale 有值，否则使用默认语言
  const safeLocale = locale ?? defaultLocale;
  
  let messages = {};
  try {
    messages = (await import(`../messages/${safeLocale}.json`)).default;
  } catch (error) {
    console.warn(`[i18n] 翻译文件缺失: messages/${safeLocale}.json，将使用空对象`);
    messages = {};
  }
  return {
    locale: safeLocale,
    messages,
  };
});