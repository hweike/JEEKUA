// lib/countries.ts

export interface Country {
  code: string;          // ISO 3166-1 alpha-2
  nameEn: string;        // 英文名称
  nameZh: string;        // 中文名称
  phoneCode: string;     // 国际电话区号（含 +）
  flag: string;          // 国旗 Emoji
}

// 获取国旗 Emoji 的辅助函数
function getFlagEmoji(countryCode: string): string {
  // 将国家代码转换为国旗 Emoji
  // 每个字母转换为对应的 Regional Indicator Symbol
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// 完整的国家列表（按字母顺序排列）
export const COUNTRIES: Country[] = [
  { code: 'AF', nameEn: 'Afghanistan', nameZh: '阿富汗', phoneCode: '+93', flag: getFlagEmoji('AF') },
  { code: 'AX', nameEn: 'Åland Islands', nameZh: '奥兰群岛', phoneCode: '+358', flag: getFlagEmoji('AX') },
  { code: 'AL', nameEn: 'Albania', nameZh: '阿尔巴尼亚', phoneCode: '+355', flag: getFlagEmoji('AL') },
  { code: 'DZ', nameEn: 'Algeria', nameZh: '阿尔及利亚', phoneCode: '+213', flag: getFlagEmoji('DZ') },
  { code: 'AD', nameEn: 'Andorra', nameZh: '安道尔', phoneCode: '+376', flag: getFlagEmoji('AD') },
  { code: 'AO', nameEn: 'Angola', nameZh: '安哥拉', phoneCode: '+244', flag: getFlagEmoji('AO') },
  { code: 'AI', nameEn: 'Anguilla', nameZh: '安圭拉', phoneCode: '+1', flag: getFlagEmoji('AI') },
  { code: 'AG', nameEn: 'Antigua & Barbuda', nameZh: '安提瓜和巴布达', phoneCode: '+1', flag: getFlagEmoji('AG') },
  { code: 'AR', nameEn: 'Argentina', nameZh: '阿根廷', phoneCode: '+54', flag: getFlagEmoji('AR') },
  { code: 'AM', nameEn: 'Armenia', nameZh: '亚美尼亚', phoneCode: '+374', flag: getFlagEmoji('AM') },
  { code: 'AW', nameEn: 'Aruba', nameZh: '阿鲁巴', phoneCode: '+297', flag: getFlagEmoji('AW') },
  { code: 'AC', nameEn: 'Ascension Island', nameZh: '阿森松岛', phoneCode: '+247', flag: getFlagEmoji('AC') },
  { code: 'AU', nameEn: 'Australia', nameZh: '澳大利亚', phoneCode: '+61', flag: getFlagEmoji('AU') },
  { code: 'AT', nameEn: 'Austria', nameZh: '奥地利', phoneCode: '+43', flag: getFlagEmoji('AT') },
  { code: 'AZ', nameEn: 'Azerbaijan', nameZh: '阿塞拜疆', phoneCode: '+994', flag: getFlagEmoji('AZ') },
  { code: 'BS', nameEn: 'Bahamas', nameZh: '巴哈马', phoneCode: '+1', flag: getFlagEmoji('BS') },
  { code: 'BH', nameEn: 'Bahrain', nameZh: '巴林', phoneCode: '+973', flag: getFlagEmoji('BH') },
  { code: 'BD', nameEn: 'Bangladesh', nameZh: '孟加拉国', phoneCode: '+880', flag: getFlagEmoji('BD') },
  { code: 'BB', nameEn: 'Barbados', nameZh: '巴巴多斯', phoneCode: '+1', flag: getFlagEmoji('BB') },
  { code: 'BY', nameEn: 'Belarus', nameZh: '白俄罗斯', phoneCode: '+375', flag: getFlagEmoji('BY') },
  { code: 'BE', nameEn: 'Belgium', nameZh: '比利时', phoneCode: '+32', flag: getFlagEmoji('BE') },
  { code: 'BZ', nameEn: 'Belize', nameZh: '伯利兹', phoneCode: '+501', flag: getFlagEmoji('BZ') },
  { code: 'BJ', nameEn: 'Benin', nameZh: '贝宁', phoneCode: '+229', flag: getFlagEmoji('BJ') },
  { code: 'BM', nameEn: 'Bermuda', nameZh: '百慕大', phoneCode: '+1', flag: getFlagEmoji('BM') },
  { code: 'BT', nameEn: 'Bhutan', nameZh: '不丹', phoneCode: '+975', flag: getFlagEmoji('BT') },
  { code: 'BO', nameEn: 'Bolivia', nameZh: '玻利维亚', phoneCode: '+591', flag: getFlagEmoji('BO') },
  { code: 'BA', nameEn: 'Bosnia & Herzegovina', nameZh: '波斯尼亚和黑塞哥维那', phoneCode: '+387', flag: getFlagEmoji('BA') },
  { code: 'BW', nameEn: 'Botswana', nameZh: '博茨瓦纳', phoneCode: '+267', flag: getFlagEmoji('BW') },
  { code: 'BR', nameEn: 'Brazil', nameZh: '巴西', phoneCode: '+55', flag: getFlagEmoji('BR') },
  { code: 'IO', nameEn: 'British Indian Ocean Territory', nameZh: '英属印度洋领地', phoneCode: '+246', flag: getFlagEmoji('IO') },
  { code: 'VG', nameEn: 'British Virgin Islands', nameZh: '英属维尔京群岛', phoneCode: '+1', flag: getFlagEmoji('VG') },
  { code: 'BN', nameEn: 'Brunei', nameZh: '文莱', phoneCode: '+673', flag: getFlagEmoji('BN') },
  { code: 'BG', nameEn: 'Bulgaria', nameZh: '保加利亚', phoneCode: '+359', flag: getFlagEmoji('BG') },
  { code: 'BF', nameEn: 'Burkina Faso', nameZh: '布基纳法索', phoneCode: '+226', flag: getFlagEmoji('BF') },
  { code: 'BI', nameEn: 'Burundi', nameZh: '布隆迪', phoneCode: '+257', flag: getFlagEmoji('BI') },
  { code: 'KH', nameEn: 'Cambodia', nameZh: '柬埔寨', phoneCode: '+855', flag: getFlagEmoji('KH') },
  { code: 'CM', nameEn: 'Cameroon', nameZh: '喀麦隆', phoneCode: '+237', flag: getFlagEmoji('CM') },
  { code: 'CA', nameEn: 'Canada', nameZh: '加拿大', phoneCode: '+1', flag: getFlagEmoji('CA') },
  { code: 'CV', nameEn: 'Cape Verde', nameZh: '佛得角', phoneCode: '+238', flag: getFlagEmoji('CV') },
  { code: 'BQ', nameEn: 'Caribbean Netherlands', nameZh: '荷兰加勒比区', phoneCode: '+599', flag: getFlagEmoji('BQ') },
  { code: 'KY', nameEn: 'Cayman Islands', nameZh: '开曼群岛', phoneCode: '+1', flag: getFlagEmoji('KY') },
  { code: 'CF', nameEn: 'Central African Republic', nameZh: '中非共和国', phoneCode: '+236', flag: getFlagEmoji('CF') },
  { code: 'TD', nameEn: 'Chad', nameZh: '乍得', phoneCode: '+235', flag: getFlagEmoji('TD') },
  { code: 'CL', nameEn: 'Chile', nameZh: '智利', phoneCode: '+56', flag: getFlagEmoji('CL') },
  { code: 'CN', nameEn: 'China', nameZh: '中国', phoneCode: '+86', flag: getFlagEmoji('CN') },
  { code: 'CX', nameEn: 'Christmas Island', nameZh: '圣诞岛', phoneCode: '+61', flag: getFlagEmoji('CX') },
  { code: 'CC', nameEn: 'Cocos (Keeling) Islands', nameZh: '科科斯群岛', phoneCode: '+891', flag: getFlagEmoji('CC') },
  { code: 'CO', nameEn: 'Colombia', nameZh: '哥伦比亚', phoneCode: '+57', flag: getFlagEmoji('CO') },
  { code: 'KM', nameEn: 'Comoros', nameZh: '科摩罗', phoneCode: '+269', flag: getFlagEmoji('KM') },
  { code: 'CG', nameEn: 'Congo - Brazzaville', nameZh: '刚果（布）', phoneCode: '+242', flag: getFlagEmoji('CG') },
  { code: 'CD', nameEn: 'Congo - Kinshasa', nameZh: '刚果（金）', phoneCode: '+243', flag: getFlagEmoji('CD') },
  { code: 'CK', nameEn: 'Cook Islands', nameZh: '库克群岛', phoneCode: '+682', flag: getFlagEmoji('CK') },
  { code: 'CR', nameEn: 'Costa Rica', nameZh: '哥斯达黎加', phoneCode: '+506', flag: getFlagEmoji('CR') },
  { code: 'HR', nameEn: 'Croatia', nameZh: '克罗地亚', phoneCode: '+385', flag: getFlagEmoji('HR') },
  { code: 'CW', nameEn: 'Curaçao', nameZh: '库拉索', phoneCode: '+599', flag: getFlagEmoji('CW') },
  { code: 'CY', nameEn: 'Cyprus', nameZh: '塞浦路斯', phoneCode: '+357', flag: getFlagEmoji('CY') },
  { code: 'CZ', nameEn: 'Czechia', nameZh: '捷克', phoneCode: '+420', flag: getFlagEmoji('CZ') },
  { code: 'CI', nameEn: 'Côte d’Ivoire', nameZh: '科特迪瓦', phoneCode: '+225', flag: getFlagEmoji('CI') },
  { code: 'DK', nameEn: 'Denmark', nameZh: '丹麦', phoneCode: '+45', flag: getFlagEmoji('DK') },
  { code: 'DJ', nameEn: 'Djibouti', nameZh: '吉布提', phoneCode: '+253', flag: getFlagEmoji('DJ') },
  { code: 'DM', nameEn: 'Dominica', nameZh: '多米尼克', phoneCode: '+1', flag: getFlagEmoji('DM') },
  { code: 'DO', nameEn: 'Dominican Republic', nameZh: '多米尼加共和国', phoneCode: '+1', flag: getFlagEmoji('DO') },
  { code: 'EC', nameEn: 'Ecuador', nameZh: '厄瓜多尔', phoneCode: '+593', flag: getFlagEmoji('EC') },
  { code: 'EG', nameEn: 'Egypt', nameZh: '埃及', phoneCode: '+20', flag: getFlagEmoji('EG') },
  { code: 'SV', nameEn: 'El Salvador', nameZh: '萨尔瓦多', phoneCode: '+503', flag: getFlagEmoji('SV') },
  { code: 'GQ', nameEn: 'Equatorial Guinea', nameZh: '赤道几内亚', phoneCode: '+240', flag: getFlagEmoji('GQ') },
  { code: 'ER', nameEn: 'Eritrea', nameZh: '厄立特里亚', phoneCode: '+291', flag: getFlagEmoji('ER') },
  { code: 'EE', nameEn: 'Estonia', nameZh: '爱沙尼亚', phoneCode: '+372', flag: getFlagEmoji('EE') },
  { code: 'SZ', nameEn: 'Eswatini', nameZh: '斯威士兰', phoneCode: '+268', flag: getFlagEmoji('SZ') },
  { code: 'ET', nameEn: 'Ethiopia', nameZh: '埃塞俄比亚', phoneCode: '+251', flag: getFlagEmoji('ET') },
  { code: 'FK', nameEn: 'Falkland Islands', nameZh: '福克兰群岛', phoneCode: '+500', flag: getFlagEmoji('FK') },
  { code: 'FO', nameEn: 'Faroe Islands', nameZh: '法罗群岛', phoneCode: '+298', flag: getFlagEmoji('FO') },
  { code: 'FJ', nameEn: 'Fiji', nameZh: '斐济', phoneCode: '+679', flag: getFlagEmoji('FJ') },
  { code: 'FI', nameEn: 'Finland', nameZh: '芬兰', phoneCode: '+358', flag: getFlagEmoji('FI') },
  { code: 'FR', nameEn: 'France', nameZh: '法国', phoneCode: '+33', flag: getFlagEmoji('FR') },
  { code: 'GF', nameEn: 'French Guiana', nameZh: '法属圭亚那', phoneCode: '+594', flag: getFlagEmoji('GF') },
  { code: 'PF', nameEn: 'French Polynesia', nameZh: '法属波利尼西亚', phoneCode: '+689', flag: getFlagEmoji('PF') },
  { code: 'TF', nameEn: 'French Southern Territories', nameZh: '法属南部领地', phoneCode: '+262', flag: getFlagEmoji('TF') },
  { code: 'GA', nameEn: 'Gabon', nameZh: '加蓬', phoneCode: '+241', flag: getFlagEmoji('GA') },
  { code: 'GM', nameEn: 'Gambia', nameZh: '冈比亚', phoneCode: '+220', flag: getFlagEmoji('GM') },
  { code: 'GE', nameEn: 'Georgia', nameZh: '格鲁吉亚', phoneCode: '+995', flag: getFlagEmoji('GE') },
  { code: 'DE', nameEn: 'Germany', nameZh: '德国', phoneCode: '+49', flag: getFlagEmoji('DE') },
  { code: 'GH', nameEn: 'Ghana', nameZh: '加纳', phoneCode: '+233', flag: getFlagEmoji('GH') },
  { code: 'GI', nameEn: 'Gibraltar', nameZh: '直布罗陀', phoneCode: '+350', flag: getFlagEmoji('GI') },
  { code: 'GR', nameEn: 'Greece', nameZh: '希腊', phoneCode: '+30', flag: getFlagEmoji('GR') },
  { code: 'GL', nameEn: 'Greenland', nameZh: '格陵兰', phoneCode: '+299', flag: getFlagEmoji('GL') },
  { code: 'GD', nameEn: 'Grenada', nameZh: '格林纳达', phoneCode: '+1', flag: getFlagEmoji('GD') },
  { code: 'GP', nameEn: 'Guadeloupe', nameZh: '瓜德罗普', phoneCode: '+590', flag: getFlagEmoji('GP') },
  { code: 'GT', nameEn: 'Guatemala', nameZh: '危地马拉', phoneCode: '+502', flag: getFlagEmoji('GT') },
  { code: 'GG', nameEn: 'Guernsey', nameZh: '根西岛', phoneCode: '+44', flag: getFlagEmoji('GG') },
  { code: 'GN', nameEn: 'Guinea', nameZh: '几内亚', phoneCode: '+224', flag: getFlagEmoji('GN') },
  { code: 'GW', nameEn: 'Guinea-Bissau', nameZh: '几内亚比绍', phoneCode: '+245', flag: getFlagEmoji('GW') },
  { code: 'GY', nameEn: 'Guyana', nameZh: '圭亚那', phoneCode: '+592', flag: getFlagEmoji('GY') },
  { code: 'HT', nameEn: 'Haiti', nameZh: '海地', phoneCode: '+509', flag: getFlagEmoji('HT') },
  { code: 'HN', nameEn: 'Honduras', nameZh: '洪都拉斯', phoneCode: '+504', flag: getFlagEmoji('HN') },
  { code: 'HK', nameEn: 'Hong Kong SAR', nameZh: '中国香港特别行政区', phoneCode: '+852', flag: getFlagEmoji('HK') },
  { code: 'HU', nameEn: 'Hungary', nameZh: '匈牙利', phoneCode: '+36', flag: getFlagEmoji('HU') },
  { code: 'IS', nameEn: 'Iceland', nameZh: '冰岛', phoneCode: '+354', flag: getFlagEmoji('IS') },
  { code: 'IN', nameEn: 'India', nameZh: '印度', phoneCode: '+91', flag: getFlagEmoji('IN') },
  { code: 'ID', nameEn: 'Indonesia', nameZh: '印度尼西亚', phoneCode: '+62', flag: getFlagEmoji('ID') },
  { code: 'IQ', nameEn: 'Iraq', nameZh: '伊拉克', phoneCode: '+964', flag: getFlagEmoji('IQ') },
  { code: 'IE', nameEn: 'Ireland', nameZh: '爱尔兰', phoneCode: '+353', flag: getFlagEmoji('IE') },
  { code: 'IM', nameEn: 'Isle of Man', nameZh: '马恩岛', phoneCode: '+44', flag: getFlagEmoji('IM') },
  { code: 'IL', nameEn: 'Israel', nameZh: '以色列', phoneCode: '+972', flag: getFlagEmoji('IL') },
  { code: 'IT', nameEn: 'Italy', nameZh: '意大利', phoneCode: '+39', flag: getFlagEmoji('IT') },
  { code: 'JM', nameEn: 'Jamaica', nameZh: '牙买加', phoneCode: '+1', flag: getFlagEmoji('JM') },
  { code: 'JP', nameEn: 'Japan', nameZh: '日本', phoneCode: '+81', flag: getFlagEmoji('JP') },
  { code: 'JE', nameEn: 'Jersey', nameZh: '泽西岛', phoneCode: '+44', flag: getFlagEmoji('JE') },
  { code: 'JO', nameEn: 'Jordan', nameZh: '约旦', phoneCode: '+962', flag: getFlagEmoji('JO') },
  { code: 'KZ', nameEn: 'Kazakhstan', nameZh: '哈萨克斯坦', phoneCode: '+7', flag: getFlagEmoji('KZ') },
  { code: 'KE', nameEn: 'Kenya', nameZh: '肯尼亚', phoneCode: '+254', flag: getFlagEmoji('KE') },
  { code: 'KI', nameEn: 'Kiribati', nameZh: '基里巴斯', phoneCode: '+686', flag: getFlagEmoji('KI') },
  { code: 'XK', nameEn: 'Kosovo', nameZh: '科索沃', phoneCode: '+383', flag: getFlagEmoji('XK') },
  { code: 'KW', nameEn: 'Kuwait', nameZh: '科威特', phoneCode: '+965', flag: getFlagEmoji('KW') },
  { code: 'KG', nameEn: 'Kyrgyzstan', nameZh: '吉尔吉斯斯坦', phoneCode: '+996', flag: getFlagEmoji('KG') },
  { code: 'LA', nameEn: 'Laos', nameZh: '老挝', phoneCode: '+856', flag: getFlagEmoji('LA') },
  { code: 'LV', nameEn: 'Latvia', nameZh: '拉脱维亚', phoneCode: '+371', flag: getFlagEmoji('LV') },
  { code: 'LB', nameEn: 'Lebanon', nameZh: '黎巴嫩', phoneCode: '+961', flag: getFlagEmoji('LB') },
  { code: 'LS', nameEn: 'Lesotho', nameZh: '莱索托', phoneCode: '+266', flag: getFlagEmoji('LS') },
  { code: 'LR', nameEn: 'Liberia', nameZh: '利比里亚', phoneCode: '+231', flag: getFlagEmoji('LR') },
  { code: 'LY', nameEn: 'Libya', nameZh: '利比亚', phoneCode: '+218', flag: getFlagEmoji('LY') },
  { code: 'LI', nameEn: 'Liechtenstein', nameZh: '列支敦士登', phoneCode: '+423', flag: getFlagEmoji('LI') },
  { code: 'LT', nameEn: 'Lithuania', nameZh: '立陶宛', phoneCode: '+370', flag: getFlagEmoji('LT') },
  { code: 'LU', nameEn: 'Luxembourg', nameZh: '卢森堡', phoneCode: '+352', flag: getFlagEmoji('LU') },
  { code: 'MO', nameEn: 'Macao SAR', nameZh: '中国澳门特别行政区', phoneCode: '+853', flag: getFlagEmoji('MO') },
  { code: 'MG', nameEn: 'Madagascar', nameZh: '马达加斯加', phoneCode: '+261', flag: getFlagEmoji('MG') },
  { code: 'MW', nameEn: 'Malawi', nameZh: '马拉维', phoneCode: '+265', flag: getFlagEmoji('MW') },
  { code: 'MY', nameEn: 'Malaysia', nameZh: '马来西亚', phoneCode: '+60', flag: getFlagEmoji('MY') },
  { code: 'MV', nameEn: 'Maldives', nameZh: '马尔代夫', phoneCode: '+960', flag: getFlagEmoji('MV') },
  { code: 'ML', nameEn: 'Mali', nameZh: '马里', phoneCode: '+223', flag: getFlagEmoji('ML') },
  { code: 'MT', nameEn: 'Malta', nameZh: '马耳他', phoneCode: '+356', flag: getFlagEmoji('MT') },
  { code: 'MQ', nameEn: 'Martinique', nameZh: '马提尼克', phoneCode: '+596', flag: getFlagEmoji('MQ') },
  { code: 'MR', nameEn: 'Mauritania', nameZh: '毛里塔尼亚', phoneCode: '+222', flag: getFlagEmoji('MR') },
  { code: 'MU', nameEn: 'Mauritius', nameZh: '毛里求斯', phoneCode: '+230', flag: getFlagEmoji('MU') },
  { code: 'YT', nameEn: 'Mayotte', nameZh: '马约特', phoneCode: '+262', flag: getFlagEmoji('YT') },
  { code: 'MX', nameEn: 'Mexico', nameZh: '墨西哥', phoneCode: '+52', flag: getFlagEmoji('MX') },
  { code: 'MD', nameEn: 'Moldova', nameZh: '摩尔多瓦', phoneCode: '+373', flag: getFlagEmoji('MD') },
  { code: 'MC', nameEn: 'Monaco', nameZh: '摩纳哥', phoneCode: '+377', flag: getFlagEmoji('MC') },
  { code: 'MN', nameEn: 'Mongolia', nameZh: '蒙古', phoneCode: '+976', flag: getFlagEmoji('MN') },
  { code: 'ME', nameEn: 'Montenegro', nameZh: '黑山', phoneCode: '+382', flag: getFlagEmoji('ME') },
  { code: 'MS', nameEn: 'Montserrat', nameZh: '蒙特塞拉特', phoneCode: '+1', flag: getFlagEmoji('MS') },
  { code: 'MA', nameEn: 'Morocco', nameZh: '摩洛哥', phoneCode: '+212', flag: getFlagEmoji('MA') },
  { code: 'MZ', nameEn: 'Mozambique', nameZh: '莫桑比克', phoneCode: '+258', flag: getFlagEmoji('MZ') },
  { code: 'MM', nameEn: 'Myanmar (Burma)', nameZh: '缅甸', phoneCode: '+95', flag: getFlagEmoji('MM') },
  { code: 'NA', nameEn: 'Namibia', nameZh: '纳米比亚', phoneCode: '+264', flag: getFlagEmoji('NA') },
  { code: 'NR', nameEn: 'Nauru', nameZh: '瑙鲁', phoneCode: '+674', flag: getFlagEmoji('NR') },
  { code: 'NP', nameEn: 'Nepal', nameZh: '尼泊尔', phoneCode: '+977', flag: getFlagEmoji('NP') },
  { code: 'NL', nameEn: 'Netherlands', nameZh: '荷兰', phoneCode: '+31', flag: getFlagEmoji('NL') },
  { code: 'NC', nameEn: 'New Caledonia', nameZh: '新喀里多尼亚', phoneCode: '+687', flag: getFlagEmoji('NC') },
  { code: 'NZ', nameEn: 'New Zealand', nameZh: '新西兰', phoneCode: '+64', flag: getFlagEmoji('NZ') },
  { code: 'NI', nameEn: 'Nicaragua', nameZh: '尼加拉瓜', phoneCode: '+505', flag: getFlagEmoji('NI') },
  { code: 'NE', nameEn: 'Niger', nameZh: '尼日尔', phoneCode: '+227', flag: getFlagEmoji('NE') },
  { code: 'NG', nameEn: 'Nigeria', nameZh: '尼日利亚', phoneCode: '+234', flag: getFlagEmoji('NG') },
  { code: 'NU', nameEn: 'Niue', nameZh: '纽埃', phoneCode: '+683', flag: getFlagEmoji('NU') },
  { code: 'NF', nameEn: 'Norfolk Island', nameZh: '诺福克岛', phoneCode: '+672', flag: getFlagEmoji('NF') },
  { code: 'MK', nameEn: 'North Macedonia', nameZh: '北马其顿', phoneCode: '+389', flag: getFlagEmoji('MK') },
  { code: 'NO', nameEn: 'Norway', nameZh: '挪威', phoneCode: '+47', flag: getFlagEmoji('NO') },
  { code: 'OM', nameEn: 'Oman', nameZh: '阿曼', phoneCode: '+968', flag: getFlagEmoji('OM') },
  { code: 'PK', nameEn: 'Pakistan', nameZh: '巴基斯坦', phoneCode: '+92', flag: getFlagEmoji('PK') },
  { code: 'PS', nameEn: 'Palestinian Territories', nameZh: '巴勒斯坦', phoneCode: '+970', flag: getFlagEmoji('PS') },
  { code: 'PA', nameEn: 'Panama', nameZh: '巴拿马', phoneCode: '+507', flag: getFlagEmoji('PA') },
  { code: 'PG', nameEn: 'Papua New Guinea', nameZh: '巴布亚新几内亚', phoneCode: '+675', flag: getFlagEmoji('PG') },
  { code: 'PY', nameEn: 'Paraguay', nameZh: '巴拉圭', phoneCode: '+595', flag: getFlagEmoji('PY') },
  { code: 'PE', nameEn: 'Peru', nameZh: '秘鲁', phoneCode: '+51', flag: getFlagEmoji('PE') },
  { code: 'PH', nameEn: 'Philippines', nameZh: '菲律宾', phoneCode: '+63', flag: getFlagEmoji('PH') },
  { code: 'PN', nameEn: 'Pitcairn Islands', nameZh: '皮特凯恩群岛', phoneCode: '+64', flag: getFlagEmoji('PN') },
  { code: 'PL', nameEn: 'Poland', nameZh: '波兰', phoneCode: '+48', flag: getFlagEmoji('PL') },
  { code: 'PT', nameEn: 'Portugal', nameZh: '葡萄牙', phoneCode: '+351', flag: getFlagEmoji('PT') },
  { code: 'QA', nameEn: 'Qatar', nameZh: '卡塔尔', phoneCode: '+974', flag: getFlagEmoji('QA') },
  { code: 'RE', nameEn: 'Réunion', nameZh: '留尼汪', phoneCode: '+262', flag: getFlagEmoji('RE') },
  { code: 'RO', nameEn: 'Romania', nameZh: '罗马尼亚', phoneCode: '+40', flag: getFlagEmoji('RO') },
  { code: 'RU', nameEn: 'Russia', nameZh: '俄罗斯', phoneCode: '+7', flag: getFlagEmoji('RU') },
  { code: 'RW', nameEn: 'Rwanda', nameZh: '卢旺达', phoneCode: '+250', flag: getFlagEmoji('RW') },
  { code: 'WS', nameEn: 'Samoa', nameZh: '萨摩亚', phoneCode: '+685', flag: getFlagEmoji('WS') },
  { code: 'SM', nameEn: 'San Marino', nameZh: '圣马力诺', phoneCode: '+378', flag: getFlagEmoji('SM') },
  { code: 'ST', nameEn: 'São Tomé & Príncipe', nameZh: '圣多美和普林西比', phoneCode: '+239', flag: getFlagEmoji('ST') },
  { code: 'SA', nameEn: 'Saudi Arabia', nameZh: '沙特阿拉伯', phoneCode: '+966', flag: getFlagEmoji('SA') },
  { code: 'SN', nameEn: 'Senegal', nameZh: '塞内加尔', phoneCode: '+221', flag: getFlagEmoji('SN') },
  { code: 'RS', nameEn: 'Serbia', nameZh: '塞尔维亚', phoneCode: '+381', flag: getFlagEmoji('RS') },
  { code: 'SC', nameEn: 'Seychelles', nameZh: '塞舌尔', phoneCode: '+248', flag: getFlagEmoji('SC') },
  { code: 'SL', nameEn: 'Sierra Leone', nameZh: '塞拉利昂', phoneCode: '+232', flag: getFlagEmoji('SL') },
  { code: 'SG', nameEn: 'Singapore', nameZh: '新加坡', phoneCode: '+65', flag: getFlagEmoji('SG') },
  { code: 'SX', nameEn: 'Sint Maarten', nameZh: '荷属圣马丁', phoneCode: '+1', flag: getFlagEmoji('SX') },
  { code: 'SK', nameEn: 'Slovakia', nameZh: '斯洛伐克', phoneCode: '+421', flag: getFlagEmoji('SK') },
  { code: 'SI', nameEn: 'Slovenia', nameZh: '斯洛文尼亚', phoneCode: '+386', flag: getFlagEmoji('SI') },
  { code: 'SB', nameEn: 'Solomon Islands', nameZh: '所罗门群岛', phoneCode: '+677', flag: getFlagEmoji('SB') },
  { code: 'SO', nameEn: 'Somalia', nameZh: '索马里', phoneCode: '+252', flag: getFlagEmoji('SO') },
  { code: 'ZA', nameEn: 'South Africa', nameZh: '南非', phoneCode: '+27', flag: getFlagEmoji('ZA') },
  { code: 'GS', nameEn: 'South Georgia & South Sandwich Islands', nameZh: '南乔治亚和南桑威奇群岛', phoneCode: '+500', flag: getFlagEmoji('GS') },
  { code: 'KR', nameEn: 'South Korea', nameZh: '韩国', phoneCode: '+82', flag: getFlagEmoji('KR') },
  { code: 'SS', nameEn: 'South Sudan', nameZh: '南苏丹', phoneCode: '+211', flag: getFlagEmoji('SS') },
  { code: 'ES', nameEn: 'Spain', nameZh: '西班牙', phoneCode: '+34', flag: getFlagEmoji('ES') },
  { code: 'LK', nameEn: 'Sri Lanka', nameZh: '斯里兰卡', phoneCode: '+94', flag: getFlagEmoji('LK') },
  { code: 'BL', nameEn: 'St. Barthélemy', nameZh: '圣巴泰勒米', phoneCode: '+590', flag: getFlagEmoji('BL') },
  { code: 'SH', nameEn: 'St. Helena', nameZh: '圣赫勒拿', phoneCode: '+290', flag: getFlagEmoji('SH') },
  { code: 'KN', nameEn: 'St. Kitts & Nevis', nameZh: '圣基茨和尼维斯', phoneCode: '+1', flag: getFlagEmoji('KN') },
  { code: 'LC', nameEn: 'St. Lucia', nameZh: '圣卢西亚', phoneCode: '+1', flag: getFlagEmoji('LC') },
  { code: 'MF', nameEn: 'St. Martin', nameZh: '法属圣马丁', phoneCode: '+590', flag: getFlagEmoji('MF') },
  { code: 'PM', nameEn: 'St. Pierre & Miquelon', nameZh: '圣皮埃尔和密克隆', phoneCode: '+508', flag: getFlagEmoji('PM') },
  { code: 'VC', nameEn: 'St. Vincent & Grenadines', nameZh: '圣文森特和格林纳丁斯', phoneCode: '+1', flag: getFlagEmoji('VC') },
  { code: 'SD', nameEn: 'Sudan', nameZh: '苏丹', phoneCode: '+249', flag: getFlagEmoji('SD') },
  { code: 'SR', nameEn: 'Suriname', nameZh: '苏里南', phoneCode: '+597', flag: getFlagEmoji('SR') },
  { code: 'SJ', nameEn: 'Svalbard & Jan Mayen', nameZh: '斯瓦尔巴和扬马延', phoneCode: '+47', flag: getFlagEmoji('SJ') },
  { code: 'SE', nameEn: 'Sweden', nameZh: '瑞典', phoneCode: '+46', flag: getFlagEmoji('SE') },
  { code: 'CH', nameEn: 'Switzerland', nameZh: '瑞士', phoneCode: '+41', flag: getFlagEmoji('CH') },
  { code: 'TW', nameEn: 'Taiwan', nameZh: '中国台湾省', phoneCode: '+886', flag: getFlagEmoji('TW') },
  { code: 'TJ', nameEn: 'Tajikistan', nameZh: '塔吉克斯坦', phoneCode: '+992', flag: getFlagEmoji('TJ') },
  { code: 'TZ', nameEn: 'Tanzania', nameZh: '坦桑尼亚', phoneCode: '+255', flag: getFlagEmoji('TZ') },
  { code: 'TH', nameEn: 'Thailand', nameZh: '泰国', phoneCode: '+66', flag: getFlagEmoji('TH') },
  { code: 'TL', nameEn: 'Timor-Leste', nameZh: '东帝汶', phoneCode: '+670', flag: getFlagEmoji('TL') },
  { code: 'TG', nameEn: 'Togo', nameZh: '多哥', phoneCode: '+228', flag: getFlagEmoji('TG') },
  { code: 'TK', nameEn: 'Tokelau', nameZh: '托克劳', phoneCode: '+690', flag: getFlagEmoji('TK') },
  { code: 'TO', nameEn: 'Tonga', nameZh: '汤加', phoneCode: '+676', flag: getFlagEmoji('TO') },
  { code: 'TT', nameEn: 'Trinidad & Tobago', nameZh: '特立尼达和多巴哥', phoneCode: '+1', flag: getFlagEmoji('TT') },
  { code: 'TA', nameEn: 'Tristan da Cunha', nameZh: '特里斯坦-达库尼亚', phoneCode: '+2908', flag: getFlagEmoji('TA') },
  { code: 'TN', nameEn: 'Tunisia', nameZh: '突尼斯', phoneCode: '+216', flag: getFlagEmoji('TN') },
  { code: 'TR', nameEn: 'Türkiye', nameZh: '土耳其', phoneCode: '+90', flag: getFlagEmoji('TR') },
  { code: 'TM', nameEn: 'Turkmenistan', nameZh: '土库曼斯坦', phoneCode: '+993', flag: getFlagEmoji('TM') },
  { code: 'TC', nameEn: 'Turks & Caicos Islands', nameZh: '特克斯和凯科斯群岛', phoneCode: '+1', flag: getFlagEmoji('TC') },
  { code: 'TV', nameEn: 'Tuvalu', nameZh: '图瓦卢', phoneCode: '+688', flag: getFlagEmoji('TV') },
  { code: 'UM', nameEn: 'US Outlying Islands', nameZh: '美国本土外小岛屿', phoneCode: '+1', flag: getFlagEmoji('UM') },
  { code: 'UG', nameEn: 'Uganda', nameZh: '乌干达', phoneCode: '+256', flag: getFlagEmoji('UG') },
  { code: 'UA', nameEn: 'Ukraine', nameZh: '乌克兰', phoneCode: '+380', flag: getFlagEmoji('UA') },
  { code: 'AE', nameEn: 'United Arab Emirates', nameZh: '阿拉伯联合酋长国', phoneCode: '+971', flag: getFlagEmoji('AE') },
  { code: 'GB', nameEn: 'United Kingdom', nameZh: '英国', phoneCode: '+44', flag: getFlagEmoji('GB') },
  { code: 'US', nameEn: 'United States', nameZh: '美国', phoneCode: '+1', flag: getFlagEmoji('US') },
  { code: 'UY', nameEn: 'Uruguay', nameZh: '乌拉圭', phoneCode: '+598', flag: getFlagEmoji('UY') },
  { code: 'UZ', nameEn: 'Uzbekistan', nameZh: '乌兹别克斯坦', phoneCode: '+998', flag: getFlagEmoji('UZ') },
  { code: 'VU', nameEn: 'Vanuatu', nameZh: '瓦努阿图', phoneCode: '+678', flag: getFlagEmoji('VU') },
  { code: 'VA', nameEn: 'Vatican City', nameZh: '梵蒂冈', phoneCode: '+39', flag: getFlagEmoji('VA') },
  { code: 'VE', nameEn: 'Venezuela', nameZh: '委内瑞拉', phoneCode: '+58', flag: getFlagEmoji('VE') },
  { code: 'VN', nameEn: 'Vietnam', nameZh: '越南', phoneCode: '+84', flag: getFlagEmoji('VN') },
  { code: 'WF', nameEn: 'Wallis & Futuna', nameZh: '瓦利斯和富图纳', phoneCode: '+681', flag: getFlagEmoji('WF') },
  { code: 'EH', nameEn: 'Western Sahara', nameZh: '西撒哈拉', phoneCode: '+212', flag: getFlagEmoji('EH') },
  { code: 'YE', nameEn: 'Yemen', nameZh: '也门', phoneCode: '+967', flag: getFlagEmoji('YE') },
  { code: 'ZM', nameEn: 'Zambia', nameZh: '赞比亚', phoneCode: '+260', flag: getFlagEmoji('ZM') },
  { code: 'ZW', nameEn: 'Zimbabwe', nameZh: '津巴布韦', phoneCode: '+263', flag: getFlagEmoji('ZW') },
];

// ========== 辅助函数 ==========

/**
 * 根据国家代码查找国家信息
 */
export function getCountryByCode(code: string): Country | undefined {
  return COUNTRIES.find(c => c.code === code);
}

/**
 * 根据英文名称查找国家信息
 */
export function getCountryByNameEn(name: string): Country | undefined {
  return COUNTRIES.find(c => c.nameEn.toLowerCase() === name.toLowerCase());
}

/**
 * 根据中文名称查找国家信息
 */
export function getCountryByNameZh(name: string): Country | undefined {
  return COUNTRIES.find(c => c.nameZh === name);
}

/**
 * 获取国家中文名称
 */
export function getCountryNameZh(code: string): string {
  const country = getCountryByCode(code);
  return country?.nameZh || code;
}

/**
 * 获取国家英文名称
 */
export function getCountryNameEn(code: string): string {
  const country = getCountryByCode(code);
  return country?.nameEn || code;
}

/**
 * 获取国家国旗 Emoji
 */
export function getCountryFlag(code: string): string {
  const country = getCountryByCode(code);
  return country?.flag || '🌍';
}

/**
 * 获取国家完整显示信息（国旗 + 中文名 + 英文名）
 */
export function getCountryDisplay(code: string): string {
  const country = getCountryByCode(code);
  if (!country) return '🌍 Unknown';
  return `${country.flag} ${country.nameZh} (${country.nameEn})`;
}

/**
 * 获取所有国家的代码列表
 */
export function getAllCountryCodes(): string[] {
  return COUNTRIES.map(c => c.code);
}

/**
 * 获取所有国家的电话区号映射（code -> phoneCode）
 */
export function getPhoneCodeMap(): Record<string, string> {
  return COUNTRIES.reduce((acc, c) => {
    acc[c.code] = c.phoneCode;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * 根据国家代码获取电话区号
 */
export function getPhoneCode(code: string): string {
  const country = getCountryByCode(code);
  return country?.phoneCode || '+86';
}