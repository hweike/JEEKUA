// i18n/config.ts
export const locales = [
  'en', 'zh', 'es', 'de', 'ja', 'fr', 'ar', 'ko', 'pt', 'it',
  'nl', 'pl', 'ru', 'tr', 'id', 'vi', 'th', 'he', 'sv', 'no',
  'da', 'fi', 'el', 'cs', 'hu', 'ro', 'bg', 'hr', 'sk', 'sl',
  'lt', 'lv', 'et', 'ms', 'hi', 'ta', 'uk', 'sr', 'mk', 'sq',
  'ca', 'eu'
] as const;

export const defaultLocale = 'en';

export type Locale = typeof locales[number];