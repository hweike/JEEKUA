// i18n/config.ts
export const locales = [
  'zh', 'en', 'hi', 'es', 'ar', 'fr', 'pt', 'ru', 'de', 'ja',
  'id', 'ko', 'th', 'tr', 'it', 'vi', 'ta', 'pl', 'uk', 'nl',
  'sv', 'el', 'cs', 'ro', 'hu', 'fi', 'da', 'no', 'he', 'ms',
  'bg', 'hr', 'sk', 'lt', 'sl', 'et', 'lv', 'mk', 'sq', 'sr', 'ca', 'eu'
] as const;

export const defaultLocale = 'zh';

export type Locale = typeof locales[number];