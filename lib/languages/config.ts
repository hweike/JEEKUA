// lib/languages/config.ts
// 按电商网站重要性排序（综合全球电商规模、购买力、Temu覆盖市场等因素）
export const LANGUAGES = [
  { code: 'en', nativeName: 'English', zhName: '英语' },          // 1. 全球通用，核心市场
  { code: 'zh', nativeName: '中文', zhName: '中文' },             // 2. 供应链核心+庞大消费群
  { code: 'es', nativeName: 'Español', zhName: '西班牙语' },      // 3. 拉美及欧洲大市场
  { code: 'de', nativeName: 'Deutsch', zhName: '德语' },          // 4. 欧洲经济引擎
  { code: 'ja', nativeName: '日本語', zhName: '日语' },           // 5. 高价值成熟市场
  { code: 'fr', nativeName: 'Français', zhName: '法语' },         // 6. 欧非加覆盖
  { code: 'ar', nativeName: 'العربية', zhName: '阿拉伯语' },      // 7. 高客单价中东
  { code: 'ko', nativeName: '한국어', zhName: '韩语' },           // 8. 全球电商渗透率第一
  { code: 'pt', nativeName: 'Português', zhName: '葡萄牙语' },    // 9. 巴西及葡萄牙
  { code: 'it', nativeName: 'Italiano', zhName: '意大利语' },     // 10. 欧洲重要市场
  { code: 'nl', nativeName: 'Nederlands', zhName: '荷兰语' },     // 11. 高净值枢纽
  { code: 'pl', nativeName: 'Polski', zhName: '波兰语' },         // 12. 中东欧桥头堡
  { code: 'ru', nativeName: 'Русский', zhName: '俄语' },          // 13. 巨大新兴市场
  { code: 'tr', nativeName: 'Türkçe', zhName: '土耳其语' },       // 14. 高增速新兴市场
  { code: 'id', nativeName: 'Bahasa Indonesia', zhName: '印尼语' },// 15. 东南亚最大潜力
  { code: 'vi', nativeName: 'Tiếng Việt', zhName: '越南语' },     // 16. 高增长新兴市场
  { code: 'th', nativeName: 'ไทย', zhName: '泰语' },              // 17. 成熟电商市场
  { code: 'he', nativeName: 'עברית', zhName: '希伯来语' },        // 18. 极小众高净值
  { code: 'sv', nativeName: 'Svenska', zhName: '瑞典语' },        // 19. 北欧高购买力
  { code: 'no', nativeName: 'Norsk', zhName: '挪威语' },          // 20. 北欧高购买力
  { code: 'da', nativeName: 'Dansk', zhName: '丹麦语' },          // 21. 数字化领先
  { code: 'fi', nativeName: 'Suomi', zhName: '芬兰语' },          // 22. 高福利市场
  { code: 'el', nativeName: 'Ελληνικά', zhName: '希腊语' },       // 23. 南欧补充
  { code: 'cs', nativeName: 'Čeština', zhName: '捷克语' },        // 24. 中东欧发达
  { code: 'hu', nativeName: 'Magyar', zhName: '匈牙利语' },       // 25. 中东欧重要
  { code: 'ro', nativeName: 'Română', zhName: '罗马尼亚语' },     // 26. 东欧人口大国
  { code: 'bg', nativeName: 'Български', zhName: '保加利亚语' },  // 27. 东南欧
  { code: 'hr', nativeName: 'Hrvatski', zhName: '克罗地亚语' },   // 28. 巴尔干
  { code: 'sk', nativeName: 'Slovenčina', zhName: '斯洛伐克语' }, // 29. 中欧
  { code: 'sl', nativeName: 'Slovenščina', zhName: '斯洛文尼亚语' },// 30. 高收入小国
  { code: 'lt', nativeName: 'Lietuvių', zhName: '立陶宛语' },     // 31. 波罗的海
  { code: 'lv', nativeName: 'Latviešu', zhName: '拉脱维亚语' },   // 32. 波罗的海
  { code: 'et', nativeName: 'Eesti', zhName: '爱沙尼亚语' },      // 33. 波罗的海
  { code: 'ms', nativeName: 'Bahasa Melayu', zhName: '马来语' },  // 34. 东南亚补充
  { code: 'hi', nativeName: 'हिन्दी', zhName: '印地语' },         // 35. 人口多但电商转化低
  { code: 'ta', nativeName: 'தமிழ்', zhName: '泰米尔语' },        // 36. 购买力有限
  { code: 'uk', nativeName: 'Українська', zhName: '乌克兰语' },   // 37. 受战争影响
  { code: 'sr', nativeName: 'Српски', zhName: '塞尔维亚语' },     // 38. 体量较小
  { code: 'mk', nativeName: 'Македонски', zhName: '马其顿语' },   // 39. 极小众
  { code: 'sq', nativeName: 'Shqip', zhName: '阿尔巴尼亚语' },    // 40. 电商薄弱
  { code: 'ca', nativeName: 'Català', zhName: '加泰罗尼亚语' },   // 41. 地区性语言，被西语覆盖
  { code: 'eu', nativeName: 'Euskara', zhName: '巴斯克语' },      // 42. 极小众，无电商场景
];

export const DEFAULT_LOCALE = 'zh';

export function getLanguageDisplayName(code: string, mode: 'native' | 'zh' = 'native'): string {
  const lang = LANGUAGES.find(l => l.code === code);
  if (!lang) return code;
  return mode === 'native' ? lang.nativeName : lang.zhName;
}