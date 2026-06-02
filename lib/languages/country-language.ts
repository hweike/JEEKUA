// ==================== 语言列表（与 config.ts 保持一致） ====================
import { LANGUAGES } from './config';

export const languages = LANGUAGES;

// ==================== 国家列表（含 code, 原生名称, 中文名称） ====================
export const countries = [
  { code: 'CN', nativeName: 'China', zhName: '中国' },
  { code: 'US', nativeName: 'United States', zhName: '美国' },
  { code: 'JP', nativeName: 'Japan', zhName: '日本' },
  { code: 'DE', nativeName: 'Germany', zhName: '德国' },
  { code: 'GB', nativeName: 'United Kingdom', zhName: '英国' },
  { code: 'FR', nativeName: 'France', zhName: '法国' },
  { code: 'IN', nativeName: 'India', zhName: '印度' },
  { code: 'CA', nativeName: 'Canada', zhName: '加拿大' },
  { code: 'IT', nativeName: 'Italy', zhName: '意大利' },
  { code: 'AU', nativeName: 'Australia', zhName: '澳大利亚' },
  { code: 'KR', nativeName: 'South Korea', zhName: '韩国' },
  { code: 'RU', nativeName: 'Russia', zhName: '俄罗斯' },
  { code: 'BR', nativeName: 'Brazil', zhName: '巴西' },
  { code: 'MX', nativeName: 'Mexico', zhName: '墨西哥' },
  { code: 'ES', nativeName: 'Spain', zhName: '西班牙' },
  { code: 'NL', nativeName: 'Netherlands', zhName: '荷兰' },
  { code: 'CH', nativeName: 'Switzerland', zhName: '瑞士' },
  { code: 'SE', nativeName: 'Sweden', zhName: '瑞典' },
  { code: 'NO', nativeName: 'Norway', zhName: '挪威' },
  { code: 'DK', nativeName: 'Denmark', zhName: '丹麦' },
  { code: 'FI', nativeName: 'Finland', zhName: '芬兰' },
  { code: 'PL', nativeName: 'Poland', zhName: '波兰' },
  { code: 'TR', nativeName: 'Turkey', zhName: '土耳其' },
  { code: 'TH', nativeName: 'Thailand', zhName: '泰国' },
  { code: 'VN', nativeName: 'Vietnam', zhName: '越南' },
  { code: 'MY', nativeName: 'Malaysia', zhName: '马来西亚' },
  { code: 'SG', nativeName: 'Singapore', zhName: '新加坡' },
  { code: 'ID', nativeName: 'Indonesia', zhName: '印度尼西亚' },
  { code: 'PH', nativeName: 'Philippines', zhName: '菲律宾' },
  { code: 'ZA', nativeName: 'South Africa', zhName: '南非' },
  { code: 'EG', nativeName: 'Egypt', zhName: '埃及' },
  { code: 'NG', nativeName: 'Nigeria', zhName: '尼日利亚' },
  { code: 'AR', nativeName: 'Argentina', zhName: '阿根廷' },
  { code: 'CL', nativeName: 'Chile', zhName: '智利' },
  { code: 'CO', nativeName: 'Colombia', zhName: '哥伦比亚' },
  { code: 'PE', nativeName: 'Peru', zhName: '秘鲁' },
  { code: 'IL', nativeName: 'Israel', zhName: '以色列' },
  { code: 'SA', nativeName: 'Saudi Arabia', zhName: '沙特阿拉伯' },
  { code: 'AE', nativeName: 'United Arab Emirates', zhName: '阿联酋' },
  { code: 'QA', nativeName: 'Qatar', zhName: '卡塔尔' },
  { code: 'PK', nativeName: 'Pakistan', zhName: '巴基斯坦' },
  { code: 'BD', nativeName: 'Bangladesh', zhName: '孟加拉国' },
  { code: 'KZ', nativeName: 'Kazakhstan', zhName: '哈萨克斯坦' },
  { code: 'UA', nativeName: 'Ukraine', zhName: '乌克兰' },
  { code: 'RO', nativeName: 'Romania', zhName: '罗马尼亚' },
  { code: 'BE', nativeName: 'Belgium', zhName: '比利时' },
  { code: 'AT', nativeName: 'Austria', zhName: '奥地利' },
  { code: 'IE', nativeName: 'Ireland', zhName: '爱尔兰' },
  { code: 'NZ', nativeName: 'New Zealand', zhName: '新西兰' },
  { code: 'PT', nativeName: 'Portugal', zhName: '葡萄牙' },
  { code: 'GR', nativeName: 'Greece', zhName: '希腊' },
  { code: 'CZ', nativeName: 'Czech Republic', zhName: '捷克' },
  { code: 'HU', nativeName: 'Hungary', zhName: '匈牙利' },
  { code: 'SK', nativeName: 'Slovakia', zhName: '斯洛伐克' },
  { code: 'SI', nativeName: 'Slovenia', zhName: '斯洛文尼亚' },
  { code: 'HR', nativeName: 'Croatia', zhName: '克罗地亚' },
  { code: 'RS', nativeName: 'Serbia', zhName: '塞尔维亚' },
  { code: 'BG', nativeName: 'Bulgaria', zhName: '保加利亚' },
  { code: 'LT', nativeName: 'Lithuania', zhName: '立陶宛' },
  { code: 'LV', nativeName: 'Latvia', zhName: '拉脱维亚' },
  { code: 'EE', nativeName: 'Estonia', zhName: '爱沙尼亚' },
  { code: 'IS', nativeName: 'Iceland', zhName: '冰岛' },
  { code: 'LU', nativeName: 'Luxembourg', zhName: '卢森堡' },
  { code: 'MC', nativeName: 'Monaco', zhName: '摩纳哥' },
  { code: 'AD', nativeName: 'Andorra', zhName: '安道尔' },
  { code: 'MT', nativeName: 'Malta', zhName: '马耳他' },
  { code: 'CY', nativeName: 'Cyprus', zhName: '塞浦路斯' },
  { code: 'BH', nativeName: 'Bahrain', zhName: '巴林' },
  { code: 'KW', nativeName: 'Kuwait', zhName: '科威特' },
  { code: 'OM', nativeName: 'Oman', zhName: '阿曼' },
  { code: 'JO', nativeName: 'Jordan', zhName: '约旦' },
  { code: 'LB', nativeName: 'Lebanon', zhName: '黎巴嫩' },
  { code: 'LK', nativeName: 'Sri Lanka', zhName: '斯里兰卡' },
  { code: 'MM', nativeName: 'Myanmar', zhName: '缅甸' },
  { code: 'KH', nativeName: 'Cambodia', zhName: '柬埔寨' },
  { code: 'LA', nativeName: 'Laos', zhName: '老挝' },
  { code: 'BN', nativeName: 'Brunei', zhName: '文莱' },
  { code: 'MN', nativeName: 'Mongolia', zhName: '蒙古' },
  { code: 'NP', nativeName: 'Nepal', zhName: '尼泊尔' },
  { code: 'BT', nativeName: 'Bhutan', zhName: '不丹' },
  { code: 'MV', nativeName: 'Maldives', zhName: '马尔代夫' },
  { code: 'AF', nativeName: 'Afghanistan', zhName: '阿富汗' },
  { code: 'AL', nativeName: 'Albania', zhName: '阿尔巴尼亚' },
  { code: 'DZ', nativeName: 'Algeria', zhName: '阿尔及利亚' },
  { code: 'AO', nativeName: 'Angola', zhName: '安哥拉' },
  { code: 'AG', nativeName: 'Antigua and Barbuda', zhName: '安提瓜和巴布达' },
  { code: 'AM', nativeName: 'Armenia', zhName: '亚美尼亚' },
  { code: 'AZ', nativeName: 'Azerbaijan', zhName: '阿塞拜疆' },
  { code: 'BS', nativeName: 'Bahamas', zhName: '巴哈马' },
  { code: 'BB', nativeName: 'Barbados', zhName: '巴巴多斯' },
  { code: 'BY', nativeName: 'Belarus', zhName: '白俄罗斯' },
  { code: 'BZ', nativeName: 'Belize', zhName: '伯利兹' },
  { code: 'BJ', nativeName: 'Benin', zhName: '贝宁' },
  { code: 'BO', nativeName: 'Bolivia', zhName: '玻利维亚' },
  { code: 'BA', nativeName: 'Bosnia and Herzegovina', zhName: '波斯尼亚和黑塞哥维那' },
  { code: 'BW', nativeName: 'Botswana', zhName: '博茨瓦纳' },
  { code: 'BF', nativeName: 'Burkina Faso', zhName: '布基纳法索' },
  { code: 'BI', nativeName: 'Burundi', zhName: '布隆迪' },
  { code: 'CV', nativeName: 'Cape Verde', zhName: '佛得角' },
  { code: 'CM', nativeName: 'Cameroon', zhName: '喀麦隆' },
  { code: 'CF', nativeName: 'Central African Republic', zhName: '中非' },
  { code: 'TD', nativeName: 'Chad', zhName: '乍得' },
  { code: 'KM', nativeName: 'Comoros', zhName: '科摩罗' },
  { code: 'CG', nativeName: 'Congo (Brazzaville)', zhName: '刚果（布）' },
  { code: 'CD', nativeName: 'Congo (Kinshasa)', zhName: '刚果（金）' },
  { code: 'CR', nativeName: 'Costa Rica', zhName: '哥斯达黎加' },
  { code: 'CI', nativeName: "Côte d'Ivoire", zhName: '科特迪瓦' },
  { code: 'CU', nativeName: 'Cuba', zhName: '古巴' },
  { code: 'DJ', nativeName: 'Djibouti', zhName: '吉布提' },
  { code: 'DM', nativeName: 'Dominica', zhName: '多米尼克' },
  { code: 'DO', nativeName: 'Dominican Republic', zhName: '多米尼加' },
  { code: 'TL', nativeName: 'Timor-Leste', zhName: '东帝汶' },
  { code: 'EC', nativeName: 'Ecuador', zhName: '厄瓜多尔' },
  { code: 'SV', nativeName: 'El Salvador', zhName: '萨尔瓦多' },
  { code: 'GQ', nativeName: 'Equatorial Guinea', zhName: '赤道几内亚' },
  { code: 'ER', nativeName: 'Eritrea', zhName: '厄立特里亚' },
  { code: 'ET', nativeName: 'Ethiopia', zhName: '埃塞俄比亚' },
  { code: 'FJ', nativeName: 'Fiji', zhName: '斐济' },
  { code: 'GA', nativeName: 'Gabon', zhName: '加蓬' },
  { code: 'GM', nativeName: 'Gambia', zhName: '冈比亚' },
  { code: 'GE', nativeName: 'Georgia', zhName: '格鲁吉亚' },
  { code: 'GH', nativeName: 'Ghana', zhName: '加纳' },
  { code: 'GD', nativeName: 'Grenada', zhName: '格林纳达' },
  { code: 'GT', nativeName: 'Guatemala', zhName: '危地马拉' },
  { code: 'GN', nativeName: 'Guinea', zhName: '几内亚' },
  { code: 'GW', nativeName: 'Guinea-Bissau', zhName: '几内亚比绍' },
  { code: 'GY', nativeName: 'Guyana', zhName: '圭亚那' },
  { code: 'HT', nativeName: 'Haiti', zhName: '海地' },
  { code: 'HN', nativeName: 'Honduras', zhName: '洪都拉斯' },
  { code: 'IR', nativeName: 'Iran', zhName: '伊朗' },
  { code: 'IQ', nativeName: 'Iraq', zhName: '伊拉克' },
  { code: 'JM', nativeName: 'Jamaica', zhName: '牙买加' },
  { code: 'KI', nativeName: 'Kiribati', zhName: '基里巴斯' },
  { code: 'KP', nativeName: 'North Korea', zhName: '朝鲜' },
  { code: 'KG', nativeName: 'Kyrgyzstan', zhName: '吉尔吉斯斯坦' },
  { code: 'LS', nativeName: 'Lesotho', zhName: '莱索托' },
  { code: 'LR', nativeName: 'Liberia', zhName: '利比里亚' },
  { code: 'LY', nativeName: 'Libya', zhName: '利比亚' },
  { code: 'LI', nativeName: 'Liechtenstein', zhName: '列支敦士登' },
  { code: 'MG', nativeName: 'Madagascar', zhName: '马达加斯加' },
  { code: 'MW', nativeName: 'Malawi', zhName: '马拉维' },
  { code: 'ML', nativeName: 'Mali', zhName: '马里' },
  { code: 'MH', nativeName: 'Marshall Islands', zhName: '马绍尔群岛' },
  { code: 'MR', nativeName: 'Mauritania', zhName: '毛里塔尼亚' },
  { code: 'MU', nativeName: 'Mauritius', zhName: '毛里求斯' },
  { code: 'FM', nativeName: 'Micronesia', zhName: '密克罗尼西亚' },
  { code: 'MD', nativeName: 'Moldova', zhName: '摩尔多瓦' },
  { code: 'ME', nativeName: 'Montenegro', zhName: '黑山' },
  { code: 'MA', nativeName: 'Morocco', zhName: '摩洛哥' },
  { code: 'MZ', nativeName: 'Mozambique', zhName: '莫桑比克' },
  { code: 'NA', nativeName: 'Namibia', zhName: '纳米比亚' },
  { code: 'NR', nativeName: 'Nauru', zhName: '瑙鲁' },
  { code: 'NI', nativeName: 'Nicaragua', zhName: '尼加拉瓜' },
  { code: 'NE', nativeName: 'Niger', zhName: '尼日尔' },
  { code: 'MK', nativeName: 'North Macedonia', zhName: '北马其顿' },
  { code: 'PW', nativeName: 'Palau', zhName: '帕劳' },
  { code: 'PS', nativeName: 'Palestine', zhName: '巴勒斯坦' },
  { code: 'PA', nativeName: 'Panama', zhName: '巴拿马' },
  { code: 'PG', nativeName: 'Papua New Guinea', zhName: '巴布亚新几内亚' },
  { code: 'PY', nativeName: 'Paraguay', zhName: '巴拉圭' },
  { code: 'RW', nativeName: 'Rwanda', zhName: '卢旺达' },
  { code: 'KN', nativeName: 'Saint Kitts and Nevis', zhName: '圣基茨和尼维斯' },
  { code: 'LC', nativeName: 'Saint Lucia', zhName: '圣卢西亚' },
  { code: 'VC', nativeName: 'Saint Vincent and the Grenadines', zhName: '圣文森特和格林纳丁斯' },
  { code: 'WS', nativeName: 'Samoa', zhName: '萨摩亚' },
  { code: 'SM', nativeName: 'San Marino', zhName: '圣马力诺' },
  { code: 'ST', nativeName: 'Sao Tome and Principe', zhName: '圣多美和普林西比' },
  { code: 'SN', nativeName: 'Senegal', zhName: '塞内加尔' },
  { code: 'SC', nativeName: 'Seychelles', zhName: '塞舌尔' },
  { code: 'SL', nativeName: 'Sierra Leone', zhName: '塞拉利昂' },
  { code: 'SB', nativeName: 'Solomon Islands', zhName: '所罗门群岛' },
  { code: 'SO', nativeName: 'Somalia', zhName: '索马里' },
  { code: 'SS', nativeName: 'South Sudan', zhName: '南苏丹' },
  { code: 'SD', nativeName: 'Sudan', zhName: '苏丹' },
  { code: 'SR', nativeName: 'Suriname', zhName: '苏里南' },
  { code: 'SZ', nativeName: 'Eswatini', zhName: '斯威士兰' },
  { code: 'SY', nativeName: 'Syria', zhName: '叙利亚' },
  { code: 'TJ', nativeName: 'Tajikistan', zhName: '塔吉克斯坦' },
  { code: 'TZ', nativeName: 'Tanzania', zhName: '坦桑尼亚' },
  { code: 'TG', nativeName: 'Togo', zhName: '多哥' },
  { code: 'TO', nativeName: 'Tonga', zhName: '汤加' },
  { code: 'TT', nativeName: 'Trinidad and Tobago', zhName: '特立尼达和多巴哥' },
  { code: 'TN', nativeName: 'Tunisia', zhName: '突尼斯' },
  { code: 'TM', nativeName: 'Turkmenistan', zhName: '土库曼斯坦' },
  { code: 'TV', nativeName: 'Tuvalu', zhName: '图瓦卢' },
  { code: 'UG', nativeName: 'Uganda', zhName: '乌干达' },
  { code: 'UY', nativeName: 'Uruguay', zhName: '乌拉圭' },
  { code: 'UZ', nativeName: 'Uzbekistan', zhName: '乌兹别克斯坦' },
  { code: 'VU', nativeName: 'Vanuatu', zhName: '瓦努阿图' },
  { code: 'VA', nativeName: 'Vatican City', zhName: '梵蒂冈' },
  { code: 'VE', nativeName: 'Venezuela', zhName: '委内瑞拉' },
  { code: 'YE', nativeName: 'Yemen', zhName: '也门' },
  { code: 'ZM', nativeName: 'Zambia', zhName: '赞比亚' },
  { code: 'ZW', nativeName: 'Zimbabwe', zhName: '津巴布韦' },
  { code: 'CK', nativeName: 'Cook Islands', zhName: '库克群岛' },
  { code: 'NU', nativeName: 'Niue', zhName: '纽埃' },
  { code: 'HK', nativeName: 'Hong Kong', zhName: '中国香港' },
  { code: 'MO', nativeName: 'Macao', zhName: '中国澳门' },
  { code: 'TW', nativeName: 'Taiwan', zhName: '台湾地区' },
];

// ==================== 国家 -> 官方语言映射 ====================
// 基于常见官方语言，只映射到上述语言列表中的语言
export const countryOfficialLanguage: Record<string, string> = {
  CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', SG: 'zh', // 中文
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en', ZA: 'en', // 英语
  JP: 'ja', // 日语
  DE: 'de', AT: 'de', CH: 'de', LI: 'de', // 德语
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr', CH: 'fr', // 法语（瑞士同时有德语、法语，取法语作为常用）
  IN: 'hi', // 印地语（印度官方语言之一，多语言，选择印地语）
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', PE: 'es', VE: 'es', CL: 'es', EC: 'es', GT: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', CR: 'es', PA: 'es', UY: 'es', CU: 'es', // 西班牙语
  PT: 'pt', BR: 'pt', AO: 'pt', MZ: 'pt', CV: 'pt', ST: 'pt', // 葡萄牙语
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', // 俄语
  IT: 'it', // 意大利语
  NL: 'nl', BE: 'nl', // 荷兰语（比利时官方语言还有法语、德语，这里取荷兰语）
  SV: 'sv', // 瑞典语
  NO: 'no', // 挪威语
  DK: 'da', // 丹麦语
  FI: 'fi', // 芬兰语
  PL: 'pl', // 波兰语
  TR: 'tr', // 土耳其语
  TH: 'th', // 泰语
  VN: 'vi', // 越南语
  ID: 'id', // 印尼语
  MY: 'ms', // 马来语
  PH: 'en', // 菲律宾官方语言英语和他加禄语，取英语
  EG: 'ar', SA: 'ar', AE: 'ar', QA: 'ar', KW: 'ar', OM: 'ar', BH: 'ar', JO: 'ar', LB: 'ar', IQ: 'ar', LY: 'ar', DZ: 'ar', MA: 'ar', TN: 'ar', SD: 'ar', SY: 'ar', YE: 'ar', SO: 'ar', // 阿拉伯语
  IL: 'he', // 希伯来语
  KR: 'ko', // 韩语
  GR: 'el', // 希腊语
  CZ: 'cs', // 捷克语
  HU: 'hu', // 匈牙利语
  RO: 'ro', // 罗马尼亚语
  UA: 'uk', // 乌克兰语
  BG: 'bg', // 保加利亚语
  HR: 'hr', // 克罗地亚语
  RS: 'sr', // 塞尔维亚语
  SK: 'sk', // 斯洛伐克语
  SI: 'sl', // 斯洛文尼亚语
  LT: 'lt', // 立陶宛语
  LV: 'lv', // 拉脱维亚语
  EE: 'et', // 爱沙尼亚语
  IS: 'en', // 冰岛官方语言冰岛语，不在列表，用英语
  MT: 'en', // 马耳他语不在列表，用英语
  CY: 'el', // 塞浦路斯官方希腊语和土耳其语，取希腊语
  PK: 'ur', // 乌尔都语不在列表，用英语
  BD: 'bn', // 孟加拉语不在列表，用英语
  LK: 'ta', // 泰米尔语（斯里兰卡官方语言之一）
  MM: 'my', // 缅甸语不在列表，用英语
  KH: 'km', // 高棉语不在列表，用英语
  LA: 'lo', // 老挝语不在列表，用英语
  BN: 'ms', // 文莱官方马来语
  MN: 'mn', // 蒙古语不在列表，用英语
  NP: 'ne', // 尼泊尔语不在列表，用英语
  BT: 'dz', // 宗卡语不在列表，用英语
  MV: 'dv', // 迪维希语不在列表，用英语
  AF: 'ps', // 普什图语不在列表，用英语
  AL: 'sq', // 阿尔巴尼亚语
  AM: 'hy', // 亚美尼亚语不在列表，用英语
  AZ: 'az', // 阿塞拜疆语不在列表，用英语
  BA: 'bs', // 波斯尼亚语不在列表，用英语
  BW: 'en', // 博茨瓦纳英语
  BF: 'fr', // 布基纳法索法语
  BI: 'fr', // 布隆迪法语
  CM: 'fr', // 喀麦隆法语/英语，取法语
  CF: 'fr', // 中非法语
  TD: 'fr', // 乍得法语
  KM: 'fr', // 科摩罗法语
  CG: 'fr', // 刚果（布）法语
  CD: 'fr', // 刚果（金）法语
  CI: 'fr', // 科特迪瓦法语
  DJ: 'fr', // 吉布提法语
  DM: 'en', // 多米尼克英语
  TL: 'pt', // 东帝汶葡萄牙语
  GQ: 'es', // 赤道几内亚西班牙语
  ER: 'ar', // 厄立特里亚阿拉伯语
  ET: 'am', // 阿姆哈拉语不在列表，用英语
  FJ: 'en', // 斐济英语
  GA: 'fr', // 加蓬法语
  GM: 'en', // 冈比亚英语
  GE: 'ka', // 格鲁吉亚语不在列表，用英语
  GH: 'en', // 加纳英语
  GD: 'en', // 格林纳达英语
  GN: 'fr', // 几内亚法语
  GW: 'pt', // 几内亚比绍葡萄牙语
  GY: 'en', // 圭亚那英语
  HT: 'fr', // 海地法语
  IR: 'fa', // 波斯语不在列表，用英语
  JM: 'en', // 牙买加英语
  KI: 'en', // 基里巴斯英语
  KP: 'ko', // 朝鲜韩语
  LS: 'en', // 莱索托英语
  LR: 'en', // 利比里亚英语
  MG: 'fr', // 马达加斯加法语
  MW: 'en', // 马拉维英语
  ML: 'fr', // 马里法语
  MH: 'en', // 马绍尔群岛英语
  MR: 'ar', // 毛里塔尼亚阿拉伯语
  MU: 'en', // 毛里求斯英语
  FM: 'en', // 密克罗尼西亚英语
  MD: 'ro', // 摩尔多瓦罗马尼亚语
  ME: 'sr', // 黑山塞尔维亚语
  MA: 'ar', // 摩洛哥阿拉伯语
  NA: 'en', // 纳米比亚英语
  NR: 'en', // 瑙鲁英语
  NI: 'es', // 尼加拉瓜西班牙语
  NE: 'fr', // 尼日尔法语
  MK: 'mk', // 北马其顿马其顿语
  PW: 'en', // 帕劳英语
  PS: 'ar', // 巴勒斯坦阿拉伯语
  PG: 'en', // 巴布亚新几内亚英语
  RW: 'fr', // 卢旺达法语/英语，取法语
  KN: 'en', // 圣基茨和尼维斯英语
  LC: 'en', // 圣卢西亚英语
  VC: 'en', // 圣文森特和格林纳丁斯英语
  WS: 'en', // 萨摩亚英语
  SM: 'it', // 圣马力诺意大利语
  SN: 'fr', // 塞内加尔法语
  SC: 'fr', // 塞舌尔法语/英语，取法语
  SL: 'en', // 塞拉利昂英语
  SB: 'en', // 所罗门群岛英语
  SS: 'en', // 南苏丹英语
  SR: 'nl', // 苏里南荷兰语
  SZ: 'en', // 斯威士兰英语
  TJ: 'tg', // 塔吉克语不在列表，用英语
  TZ: 'sw', // 斯瓦希里语不在列表，用英语
  TG: 'fr', // 多哥法语
  TO: 'en', // 汤加英语
  TT: 'en', // 特立尼达和多巴哥英语
  TM: 'tk', // 土库曼语不在列表，用英语
  TV: 'en', // 图瓦卢英语
  UG: 'en', // 乌干达英语
  UZ: 'uz', // 乌兹别克语不在列表，用英语
  VU: 'fr', // 瓦努阿图法语/英语，取法语
  VA: 'it', // 梵蒂冈意大利语
  YE: 'ar', // 也门阿拉伯语
  ZM: 'en', // 赞比亚英语
  ZW: 'en', // 津巴布韦英语
  CK: 'en', // 库克群岛英语
  NU: 'en', // 纽埃英语
};

/**
 * 根据国家代码获取官方语言代码
 */
export function getOfficialLanguage(countryCode: string): string | null {
  return countryOfficialLanguage[countryCode] || null;
}

/**
 * 获取所有国家列表（带名称）
 */
export function getCountries() {
  return countries;
}

/**
 * 获取所有语言列表
 */
export function getLanguages() {
  return languages;
}