// lib/languages/config.ts
export const LANGUAGES = [
  { code: 'zh', nativeName: '中文', zhName: '中文' },
  { code: 'en', nativeName: 'English', zhName: '英语' },
  { code: 'hi', nativeName: 'हिन्दी', zhName: '印地语' },
  { code: 'es', nativeName: 'Español', zhName: '西班牙语' },
  { code: 'ar', nativeName: 'العربية', zhName: '阿拉伯语' },
  { code: 'fr', nativeName: 'Français', zhName: '法语' },
  { code: 'pt', nativeName: 'Português', zhName: '葡萄牙语' },
  { code: 'ru', nativeName: 'Русский', zhName: '俄语' },
  { code: 'de', nativeName: 'Deutsch', zhName: '德语' },
  { code: 'ja', nativeName: '日本語', zhName: '日语' },
  { code: 'id', nativeName: 'Bahasa Indonesia', zhName: '印尼语' },
  { code: 'ko', nativeName: '한국어', zhName: '韩语' },
  { code: 'th', nativeName: 'ไทย', zhName: '泰语' },
  { code: 'tr', nativeName: 'Türkçe', zhName: '土耳其语' },
  { code: 'it', nativeName: 'Italiano', zhName: '意大利语' },
  { code: 'vi', nativeName: 'Tiếng Việt', zhName: '越南语' },
  { code: 'ta', nativeName: 'தமிழ்', zhName: '泰米尔语' },
  { code: 'pl', nativeName: 'Polski', zhName: '波兰语' },
  { code: 'uk', nativeName: 'Українська', zhName: '乌克兰语' },
  { code: 'nl', nativeName: 'Nederlands', zhName: '荷兰语' },
  { code: 'sv', nativeName: 'Svenska', zhName: '瑞典语' },
  { code: 'el', nativeName: 'Ελληνικά', zhName: '希腊语' },
  { code: 'cs', nativeName: 'Čeština', zhName: '捷克语' },
  { code: 'ro', nativeName: 'Română', zhName: '罗马尼亚语' },
  { code: 'hu', nativeName: 'Magyar', zhName: '匈牙利语' },
  { code: 'fi', nativeName: 'Suomi', zhName: '芬兰语' },
  { code: 'da', nativeName: 'Dansk', zhName: '丹麦语' },
  { code: 'no', nativeName: 'Norsk', zhName: '挪威语' },
  { code: 'he', nativeName: 'עברית', zhName: '希伯来语' },
  { code: 'ms', nativeName: 'Bahasa Melayu', zhName: '马来语' },
  { code: 'bg', nativeName: 'Български', zhName: '保加利亚语' },
  { code: 'hr', nativeName: 'Hrvatski', zhName: '克罗地亚语' },
  { code: 'sk', nativeName: 'Slovenčina', zhName: '斯洛伐克语' },
  { code: 'lt', nativeName: 'Lietuvių', zhName: '立陶宛语' },
  { code: 'sl', nativeName: 'Slovenščina', zhName: '斯洛文尼亚语' },
  { code: 'et', nativeName: 'Eesti', zhName: '爱沙尼亚语' },
  { code: 'lv', nativeName: 'Latviešu', zhName: '拉脱维亚语' },
  { code: 'mk', nativeName: 'Македонски', zhName: '马其顿语' },
  { code: 'sq', nativeName: 'Shqip', zhName: '阿尔巴尼亚语' },
  { code: 'sr', nativeName: 'Српски', zhName: '塞尔维亚语' },
  { code: 'ca', nativeName: 'Català', zhName: '加泰罗尼亚语' },
  { code: 'eu', nativeName: 'Euskara', zhName: '巴斯克语' },
];

export const DEFAULT_LOCALE = 'zh';

export function getLanguageDisplayName(code: string, mode: 'native' | 'zh' = 'native'): string {
  const lang = LANGUAGES.find(l => l.code === code);
  if (!lang) return code;
  return mode === 'native' ? lang.nativeName : lang.zhName;
}