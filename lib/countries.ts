// lib/countries.ts

export interface Country {
  code: string;          // ISO 3166-1 alpha-2
  nameEn: string;        // 英文名称
  nameZh: string;        // 中文名称
  phoneCode: string;     // 国际电话区号（含 +）
}

// 完整的国家列表（按字母顺序排列）
export const COUNTRIES: Country[] = [
  { code: 'AF', nameEn: 'Afghanistan', nameZh: '阿富汗', phoneCode: '+93' },
  { code: 'AX', nameEn: 'Åland Islands', nameZh: '奥兰群岛', phoneCode: '+358' },
  { code: 'AL', nameEn: 'Albania', nameZh: '阿尔巴尼亚', phoneCode: '+355' },
  { code: 'DZ', nameEn: 'Algeria', nameZh: '阿尔及利亚', phoneCode: '+213' },
  { code: 'AD', nameEn: 'Andorra', nameZh: '安道尔', phoneCode: '+376' },
  { code: 'AO', nameEn: 'Angola', nameZh: '安哥拉', phoneCode: '+244' },
  { code: 'AI', nameEn: 'Anguilla', nameZh: '安圭拉', phoneCode: '+1' },
  { code: 'AG', nameEn: 'Antigua & Barbuda', nameZh: '安提瓜和巴布达', phoneCode: '+1' },
  { code: 'AR', nameEn: 'Argentina', nameZh: '阿根廷', phoneCode: '+54' },
  { code: 'AM', nameEn: 'Armenia', nameZh: '亚美尼亚', phoneCode: '+374' },
  { code: 'AW', nameEn: 'Aruba', nameZh: '阿鲁巴', phoneCode: '+297' },
  { code: 'AC', nameEn: 'Ascension Island', nameZh: '阿森松岛', phoneCode: '+247' },
  { code: 'AU', nameEn: 'Australia', nameZh: '澳大利亚', phoneCode: '+61' },
  { code: 'AT', nameEn: 'Austria', nameZh: '奥地利', phoneCode: '+43' },
  { code: 'AZ', nameEn: 'Azerbaijan', nameZh: '阿塞拜疆', phoneCode: '+994' },
  { code: 'BS', nameEn: 'Bahamas', nameZh: '巴哈马', phoneCode: '+1' },
  { code: 'BH', nameEn: 'Bahrain', nameZh: '巴林', phoneCode: '+973' },
  { code: 'BD', nameEn: 'Bangladesh', nameZh: '孟加拉国', phoneCode: '+880' },
  { code: 'BB', nameEn: 'Barbados', nameZh: '巴巴多斯', phoneCode: '+1' },
  { code: 'BY', nameEn: 'Belarus', nameZh: '白俄罗斯', phoneCode: '+375' },
  { code: 'BE', nameEn: 'Belgium', nameZh: '比利时', phoneCode: '+32' },
  { code: 'BZ', nameEn: 'Belize', nameZh: '伯利兹', phoneCode: '+501' },
  { code: 'BJ', nameEn: 'Benin', nameZh: '贝宁', phoneCode: '+229' },
  { code: 'BM', nameEn: 'Bermuda', nameZh: '百慕大', phoneCode: '+1' },
  { code: 'BT', nameEn: 'Bhutan', nameZh: '不丹', phoneCode: '+975' },
  { code: 'BO', nameEn: 'Bolivia', nameZh: '玻利维亚', phoneCode: '+591' },
  { code: 'BA', nameEn: 'Bosnia & Herzegovina', nameZh: '波斯尼亚和黑塞哥维那', phoneCode: '+387' },
  { code: 'BW', nameEn: 'Botswana', nameZh: '博茨瓦纳', phoneCode: '+267' },
  { code: 'BR', nameEn: 'Brazil', nameZh: '巴西', phoneCode: '+55' },
  { code: 'IO', nameEn: 'British Indian Ocean Territory', nameZh: '英属印度洋领地', phoneCode: '+246' },
  { code: 'VG', nameEn: 'British Virgin Islands', nameZh: '英属维尔京群岛', phoneCode: '+1' },
  { code: 'BN', nameEn: 'Brunei', nameZh: '文莱', phoneCode: '+673' },
  { code: 'BG', nameEn: 'Bulgaria', nameZh: '保加利亚', phoneCode: '+359' },
  { code: 'BF', nameEn: 'Burkina Faso', nameZh: '布基纳法索', phoneCode: '+226' },
  { code: 'BI', nameEn: 'Burundi', nameZh: '布隆迪', phoneCode: '+257' },
  { code: 'KH', nameEn: 'Cambodia', nameZh: '柬埔寨', phoneCode: '+855' },
  { code: 'CM', nameEn: 'Cameroon', nameZh: '喀麦隆', phoneCode: '+237' },
  { code: 'CA', nameEn: 'Canada', nameZh: '加拿大', phoneCode: '+1' },
  { code: 'CV', nameEn: 'Cape Verde', nameZh: '佛得角', phoneCode: '+238' },
  { code: 'BQ', nameEn: 'Caribbean Netherlands', nameZh: '荷兰加勒比区', phoneCode: '+599' },
  { code: 'KY', nameEn: 'Cayman Islands', nameZh: '开曼群岛', phoneCode: '+1' },
  { code: 'CF', nameEn: 'Central African Republic', nameZh: '中非共和国', phoneCode: '+236' },
  { code: 'TD', nameEn: 'Chad', nameZh: '乍得', phoneCode: '+235' },
  { code: 'CL', nameEn: 'Chile', nameZh: '智利', phoneCode: '+56' },
  { code: 'CN', nameEn: 'China', nameZh: '中国', phoneCode: '+86' },
  { code: 'CX', nameEn: 'Christmas Island', nameZh: '圣诞岛', phoneCode: '+61' },
  { code: 'CC', nameEn: 'Cocos (Keeling) Islands', nameZh: '科科斯群岛', phoneCode: '+891' },
  { code: 'CO', nameEn: 'Colombia', nameZh: '哥伦比亚', phoneCode: '+57' },
  { code: 'KM', nameEn: 'Comoros', nameZh: '科摩罗', phoneCode: '+269' },
  { code: 'CG', nameEn: 'Congo - Brazzaville', nameZh: '刚果（布）', phoneCode: '+242' },
  { code: 'CD', nameEn: 'Congo - Kinshasa', nameZh: '刚果（金）', phoneCode: '+243' },
  { code: 'CK', nameEn: 'Cook Islands', nameZh: '库克群岛', phoneCode: '+682' },
  { code: 'CR', nameEn: 'Costa Rica', nameZh: '哥斯达黎加', phoneCode: '+506' },
  { code: 'HR', nameEn: 'Croatia', nameZh: '克罗地亚', phoneCode: '+385' },
  { code: 'CW', nameEn: 'Curaçao', nameZh: '库拉索', phoneCode: '+599' },
  { code: 'CY', nameEn: 'Cyprus', nameZh: '塞浦路斯', phoneCode: '+357' },
  { code: 'CZ', nameEn: 'Czechia', nameZh: '捷克', phoneCode: '+420' },
  { code: 'CI', nameEn: 'Côte d’Ivoire', nameZh: '科特迪瓦', phoneCode: '+225' },
  { code: 'DK', nameEn: 'Denmark', nameZh: '丹麦', phoneCode: '+45' },
  { code: 'DJ', nameEn: 'Djibouti', nameZh: '吉布提', phoneCode: '+253' },
  { code: 'DM', nameEn: 'Dominica', nameZh: '多米尼克', phoneCode: '+1' },
  { code: 'DO', nameEn: 'Dominican Republic', nameZh: '多米尼加共和国', phoneCode: '+1' },
  { code: 'EC', nameEn: 'Ecuador', nameZh: '厄瓜多尔', phoneCode: '+593' },
  { code: 'EG', nameEn: 'Egypt', nameZh: '埃及', phoneCode: '+20' },
  { code: 'SV', nameEn: 'El Salvador', nameZh: '萨尔瓦多', phoneCode: '+503' },
  { code: 'GQ', nameEn: 'Equatorial Guinea', nameZh: '赤道几内亚', phoneCode: '+240' },
  { code: 'ER', nameEn: 'Eritrea', nameZh: '厄立特里亚', phoneCode: '+291' },
  { code: 'EE', nameEn: 'Estonia', nameZh: '爱沙尼亚', phoneCode: '+372' },
  { code: 'SZ', nameEn: 'Eswatini', nameZh: '斯威士兰', phoneCode: '+268' },
  { code: 'ET', nameEn: 'Ethiopia', nameZh: '埃塞俄比亚', phoneCode: '+251' },
  { code: 'FK', nameEn: 'Falkland Islands', nameZh: '福克兰群岛', phoneCode: '+500' },
  { code: 'FO', nameEn: 'Faroe Islands', nameZh: '法罗群岛', phoneCode: '+298' },
  { code: 'FJ', nameEn: 'Fiji', nameZh: '斐济', phoneCode: '+679' },
  { code: 'FI', nameEn: 'Finland', nameZh: '芬兰', phoneCode: '+358' },
  { code: 'FR', nameEn: 'France', nameZh: '法国', phoneCode: '+33' },
  { code: 'GF', nameEn: 'French Guiana', nameZh: '法属圭亚那', phoneCode: '+594' },
  { code: 'PF', nameEn: 'French Polynesia', nameZh: '法属波利尼西亚', phoneCode: '+689' },
  { code: 'TF', nameEn: 'French Southern Territories', nameZh: '法属南部领地', phoneCode: '+262' },
  { code: 'GA', nameEn: 'Gabon', nameZh: '加蓬', phoneCode: '+241' },
  { code: 'GM', nameEn: 'Gambia', nameZh: '冈比亚', phoneCode: '+220' },
  { code: 'GE', nameEn: 'Georgia', nameZh: '格鲁吉亚', phoneCode: '+995' },
  { code: 'DE', nameEn: 'Germany', nameZh: '德国', phoneCode: '+49' },
  { code: 'GH', nameEn: 'Ghana', nameZh: '加纳', phoneCode: '+233' },
  { code: 'GI', nameEn: 'Gibraltar', nameZh: '直布罗陀', phoneCode: '+350' },
  { code: 'GR', nameEn: 'Greece', nameZh: '希腊', phoneCode: '+30' },
  { code: 'GL', nameEn: 'Greenland', nameZh: '格陵兰', phoneCode: '+299' },
  { code: 'GD', nameEn: 'Grenada', nameZh: '格林纳达', phoneCode: '+1' },
  { code: 'GP', nameEn: 'Guadeloupe', nameZh: '瓜德罗普', phoneCode: '+590' },
  { code: 'GT', nameEn: 'Guatemala', nameZh: '危地马拉', phoneCode: '+502' },
  { code: 'GG', nameEn: 'Guernsey', nameZh: '根西岛', phoneCode: '+44' },
  { code: 'GN', nameEn: 'Guinea', nameZh: '几内亚', phoneCode: '+224' },
  { code: 'GW', nameEn: 'Guinea-Bissau', nameZh: '几内亚比绍', phoneCode: '+245' },
  { code: 'GY', nameEn: 'Guyana', nameZh: '圭亚那', phoneCode: '+592' },
  { code: 'HT', nameEn: 'Haiti', nameZh: '海地', phoneCode: '+509' },
  { code: 'HN', nameEn: 'Honduras', nameZh: '洪都拉斯', phoneCode: '+504' },
  { code: 'HK', nameEn: 'Hong Kong SAR', nameZh: '中国香港特别行政区', phoneCode: '+852' },
  { code: 'HU', nameEn: 'Hungary', nameZh: '匈牙利', phoneCode: '+36' },
  { code: 'IS', nameEn: 'Iceland', nameZh: '冰岛', phoneCode: '+354' },
  { code: 'IN', nameEn: 'India', nameZh: '印度', phoneCode: '+91' },
  { code: 'ID', nameEn: 'Indonesia', nameZh: '印度尼西亚', phoneCode: '+62' },
  { code: 'IQ', nameEn: 'Iraq', nameZh: '伊拉克', phoneCode: '+964' },
  { code: 'IE', nameEn: 'Ireland', nameZh: '爱尔兰', phoneCode: '+353' },
  { code: 'IM', nameEn: 'Isle of Man', nameZh: '马恩岛', phoneCode: '+44' },
  { code: 'IL', nameEn: 'Israel', nameZh: '以色列', phoneCode: '+972' },
  { code: 'IT', nameEn: 'Italy', nameZh: '意大利', phoneCode: '+39' },
  { code: 'JM', nameEn: 'Jamaica', nameZh: '牙买加', phoneCode: '+1' },
  { code: 'JP', nameEn: 'Japan', nameZh: '日本', phoneCode: '+81' },
  { code: 'JE', nameEn: 'Jersey', nameZh: '泽西岛', phoneCode: '+44' },
  { code: 'JO', nameEn: 'Jordan', nameZh: '约旦', phoneCode: '+962' },
  { code: 'KZ', nameEn: 'Kazakhstan', nameZh: '哈萨克斯坦', phoneCode: '+7' },
  { code: 'KE', nameEn: 'Kenya', nameZh: '肯尼亚', phoneCode: '+254' },
  { code: 'KI', nameEn: 'Kiribati', nameZh: '基里巴斯', phoneCode: '+686' },
  { code: 'XK', nameEn: 'Kosovo', nameZh: '科索沃', phoneCode: '+383' },
  { code: 'KW', nameEn: 'Kuwait', nameZh: '科威特', phoneCode: '+965' },
  { code: 'KG', nameEn: 'Kyrgyzstan', nameZh: '吉尔吉斯斯坦', phoneCode: '+996' },
  { code: 'LA', nameEn: 'Laos', nameZh: '老挝', phoneCode: '+856' },
  { code: 'LV', nameEn: 'Latvia', nameZh: '拉脱维亚', phoneCode: '+371' },
  { code: 'LB', nameEn: 'Lebanon', nameZh: '黎巴嫩', phoneCode: '+961' },
  { code: 'LS', nameEn: 'Lesotho', nameZh: '莱索托', phoneCode: '+266' },
  { code: 'LR', nameEn: 'Liberia', nameZh: '利比里亚', phoneCode: '+231' },
  { code: 'LY', nameEn: 'Libya', nameZh: '利比亚', phoneCode: '+218' },
  { code: 'LI', nameEn: 'Liechtenstein', nameZh: '列支敦士登', phoneCode: '+423' },
  { code: 'LT', nameEn: 'Lithuania', nameZh: '立陶宛', phoneCode: '+370' },
  { code: 'LU', nameEn: 'Luxembourg', nameZh: '卢森堡', phoneCode: '+352' },
  { code: 'MO', nameEn: 'Macao SAR', nameZh: '中国澳门特别行政区', phoneCode: '+853' },
  { code: 'MG', nameEn: 'Madagascar', nameZh: '马达加斯加', phoneCode: '+261' },
  { code: 'MW', nameEn: 'Malawi', nameZh: '马拉维', phoneCode: '+265' },
  { code: 'MY', nameEn: 'Malaysia', nameZh: '马来西亚', phoneCode: '+60' },
  { code: 'MV', nameEn: 'Maldives', nameZh: '马尔代夫', phoneCode: '+960' },
  { code: 'ML', nameEn: 'Mali', nameZh: '马里', phoneCode: '+223' },
  { code: 'MT', nameEn: 'Malta', nameZh: '马耳他', phoneCode: '+356' },
  { code: 'MQ', nameEn: 'Martinique', nameZh: '马提尼克', phoneCode: '+596' },
  { code: 'MR', nameEn: 'Mauritania', nameZh: '毛里塔尼亚', phoneCode: '+222' },
  { code: 'MU', nameEn: 'Mauritius', nameZh: '毛里求斯', phoneCode: '+230' },
  { code: 'YT', nameEn: 'Mayotte', nameZh: '马约特', phoneCode: '+262' },
  { code: 'MX', nameEn: 'Mexico', nameZh: '墨西哥', phoneCode: '+52' },
  { code: 'MD', nameEn: 'Moldova', nameZh: '摩尔多瓦', phoneCode: '+373' },
  { code: 'MC', nameEn: 'Monaco', nameZh: '摩纳哥', phoneCode: '+377' },
  { code: 'MN', nameEn: 'Mongolia', nameZh: '蒙古', phoneCode: '+976' },
  { code: 'ME', nameEn: 'Montenegro', nameZh: '黑山', phoneCode: '+382' },
  { code: 'MS', nameEn: 'Montserrat', nameZh: '蒙特塞拉特', phoneCode: '+1' },
  { code: 'MA', nameEn: 'Morocco', nameZh: '摩洛哥', phoneCode: '+212' },
  { code: 'MZ', nameEn: 'Mozambique', nameZh: '莫桑比克', phoneCode: '+258' },
  { code: 'MM', nameEn: 'Myanmar (Burma)', nameZh: '缅甸', phoneCode: '+95' },
  { code: 'NA', nameEn: 'Namibia', nameZh: '纳米比亚', phoneCode: '+264' },
  { code: 'NR', nameEn: 'Nauru', nameZh: '瑙鲁', phoneCode: '+674' },
  { code: 'NP', nameEn: 'Nepal', nameZh: '尼泊尔', phoneCode: '+977' },
  { code: 'NL', nameEn: 'Netherlands', nameZh: '荷兰', phoneCode: '+31' },
  { code: 'NC', nameEn: 'New Caledonia', nameZh: '新喀里多尼亚', phoneCode: '+687' },
  { code: 'NZ', nameEn: 'New Zealand', nameZh: '新西兰', phoneCode: '+64' },
  { code: 'NI', nameEn: 'Nicaragua', nameZh: '尼加拉瓜', phoneCode: '+505' },
  { code: 'NE', nameEn: 'Niger', nameZh: '尼日尔', phoneCode: '+227' },
  { code: 'NG', nameEn: 'Nigeria', nameZh: '尼日利亚', phoneCode: '+234' },
  { code: 'NU', nameEn: 'Niue', nameZh: '纽埃', phoneCode: '+683' },
  { code: 'NF', nameEn: 'Norfolk Island', nameZh: '诺福克岛', phoneCode: '+672' },
  { code: 'MK', nameEn: 'North Macedonia', nameZh: '北马其顿', phoneCode: '+389' },
  { code: 'NO', nameEn: 'Norway', nameZh: '挪威', phoneCode: '+47' },
  { code: 'OM', nameEn: 'Oman', nameZh: '阿曼', phoneCode: '+968' },
  { code: 'PK', nameEn: 'Pakistan', nameZh: '巴基斯坦', phoneCode: '+92' },
  { code: 'PS', nameEn: 'Palestinian Territories', nameZh: '巴勒斯坦', phoneCode: '+970' },
  { code: 'PA', nameEn: 'Panama', nameZh: '巴拿马', phoneCode: '+507' },
  { code: 'PG', nameEn: 'Papua New Guinea', nameZh: '巴布亚新几内亚', phoneCode: '+675' },
  { code: 'PY', nameEn: 'Paraguay', nameZh: '巴拉圭', phoneCode: '+595' },
  { code: 'PE', nameEn: 'Peru', nameZh: '秘鲁', phoneCode: '+51' },
  { code: 'PH', nameEn: 'Philippines', nameZh: '菲律宾', phoneCode: '+63' },
  { code: 'PN', nameEn: 'Pitcairn Islands', nameZh: '皮特凯恩群岛', phoneCode: '+64' },
  { code: 'PL', nameEn: 'Poland', nameZh: '波兰', phoneCode: '+48' },
  { code: 'PT', nameEn: 'Portugal', nameZh: '葡萄牙', phoneCode: '+351' },
  { code: 'QA', nameEn: 'Qatar', nameZh: '卡塔尔', phoneCode: '+974' },
  { code: 'RE', nameEn: 'Réunion', nameZh: '留尼汪', phoneCode: '+262' },
  { code: 'RO', nameEn: 'Romania', nameZh: '罗马尼亚', phoneCode: '+40' },
  { code: 'RU', nameEn: 'Russia', nameZh: '俄罗斯', phoneCode: '+7' },
  { code: 'RW', nameEn: 'Rwanda', nameZh: '卢旺达', phoneCode: '+250' },
  { code: 'WS', nameEn: 'Samoa', nameZh: '萨摩亚', phoneCode: '+685' },
  { code: 'SM', nameEn: 'San Marino', nameZh: '圣马力诺', phoneCode: '+378' },
  { code: 'ST', nameEn: 'São Tomé & Príncipe', nameZh: '圣多美和普林西比', phoneCode: '+239' },
  { code: 'SA', nameEn: 'Saudi Arabia', nameZh: '沙特阿拉伯', phoneCode: '+966' },
  { code: 'SN', nameEn: 'Senegal', nameZh: '塞内加尔', phoneCode: '+221' },
  { code: 'RS', nameEn: 'Serbia', nameZh: '塞尔维亚', phoneCode: '+381' },
  { code: 'SC', nameEn: 'Seychelles', nameZh: '塞舌尔', phoneCode: '+248' },
  { code: 'SL', nameEn: 'Sierra Leone', nameZh: '塞拉利昂', phoneCode: '+232' },
  { code: 'SG', nameEn: 'Singapore', nameZh: '新加坡', phoneCode: '+65' },
  { code: 'SX', nameEn: 'Sint Maarten', nameZh: '荷属圣马丁', phoneCode: '+1' },
  { code: 'SK', nameEn: 'Slovakia', nameZh: '斯洛伐克', phoneCode: '+421' },
  { code: 'SI', nameEn: 'Slovenia', nameZh: '斯洛文尼亚', phoneCode: '+386' },
  { code: 'SB', nameEn: 'Solomon Islands', nameZh: '所罗门群岛', phoneCode: '+677' },
  { code: 'SO', nameEn: 'Somalia', nameZh: '索马里', phoneCode: '+252' },
  { code: 'ZA', nameEn: 'South Africa', nameZh: '南非', phoneCode: '+27' },
  { code: 'GS', nameEn: 'South Georgia & South Sandwich Islands', nameZh: '南乔治亚和南桑威奇群岛', phoneCode: '+500' },
  { code: 'KR', nameEn: 'South Korea', nameZh: '韩国', phoneCode: '+82' },
  { code: 'SS', nameEn: 'South Sudan', nameZh: '南苏丹', phoneCode: '+211' },
  { code: 'ES', nameEn: 'Spain', nameZh: '西班牙', phoneCode: '+34' },
  { code: 'LK', nameEn: 'Sri Lanka', nameZh: '斯里兰卡', phoneCode: '+94' },
  { code: 'BL', nameEn: 'St. Barthélemy', nameZh: '圣巴泰勒米', phoneCode: '+590' },
  { code: 'SH', nameEn: 'St. Helena', nameZh: '圣赫勒拿', phoneCode: '+290' },
  { code: 'KN', nameEn: 'St. Kitts & Nevis', nameZh: '圣基茨和尼维斯', phoneCode: '+1' },
  { code: 'LC', nameEn: 'St. Lucia', nameZh: '圣卢西亚', phoneCode: '+1' },
  { code: 'MF', nameEn: 'St. Martin', nameZh: '法属圣马丁', phoneCode: '+590' },
  { code: 'PM', nameEn: 'St. Pierre & Miquelon', nameZh: '圣皮埃尔和密克隆', phoneCode: '+508' },
  { code: 'VC', nameEn: 'St. Vincent & Grenadines', nameZh: '圣文森特和格林纳丁斯', phoneCode: '+1' },
  { code: 'SD', nameEn: 'Sudan', nameZh: '苏丹', phoneCode: '+249' },
  { code: 'SR', nameEn: 'Suriname', nameZh: '苏里南', phoneCode: '+597' },
  { code: 'SJ', nameEn: 'Svalbard & Jan Mayen', nameZh: '斯瓦尔巴和扬马延', phoneCode: '+47' },
  { code: 'SE', nameEn: 'Sweden', nameZh: '瑞典', phoneCode: '+46' },
  { code: 'CH', nameEn: 'Switzerland', nameZh: '瑞士', phoneCode: '+41' },
  { code: 'TW', nameEn: 'Taiwan', nameZh: '中国台湾省', phoneCode: '+886' },
  { code: 'TJ', nameEn: 'Tajikistan', nameZh: '塔吉克斯坦', phoneCode: '+992' },
  { code: 'TZ', nameEn: 'Tanzania', nameZh: '坦桑尼亚', phoneCode: '+255' },
  { code: 'TH', nameEn: 'Thailand', nameZh: '泰国', phoneCode: '+66' },
  { code: 'TL', nameEn: 'Timor-Leste', nameZh: '东帝汶', phoneCode: '+670' },
  { code: 'TG', nameEn: 'Togo', nameZh: '多哥', phoneCode: '+228' },
  { code: 'TK', nameEn: 'Tokelau', nameZh: '托克劳', phoneCode: '+690' },
  { code: 'TO', nameEn: 'Tonga', nameZh: '汤加', phoneCode: '+676' },
  { code: 'TT', nameEn: 'Trinidad & Tobago', nameZh: '特立尼达和多巴哥', phoneCode: '+1' },
  { code: 'TA', nameEn: 'Tristan da Cunha', nameZh: '特里斯坦-达库尼亚', phoneCode: '+2908' },
  { code: 'TN', nameEn: 'Tunisia', nameZh: '突尼斯', phoneCode: '+216' },
  { code: 'TR', nameEn: 'Türkiye', nameZh: '土耳其', phoneCode: '+90' },
  { code: 'TM', nameEn: 'Turkmenistan', nameZh: '土库曼斯坦', phoneCode: '+993' },
  { code: 'TC', nameEn: 'Turks & Caicos Islands', nameZh: '特克斯和凯科斯群岛', phoneCode: '+1' },
  { code: 'TV', nameEn: 'Tuvalu', nameZh: '图瓦卢', phoneCode: '+688' },
  { code: 'UM', nameEn: 'US Outlying Islands', nameZh: '美国本土外小岛屿', phoneCode: '+1' },
  { code: 'UG', nameEn: 'Uganda', nameZh: '乌干达', phoneCode: '+256' },
  { code: 'UA', nameEn: 'Ukraine', nameZh: '乌克兰', phoneCode: '+380' },
  { code: 'AE', nameEn: 'United Arab Emirates', nameZh: '阿拉伯联合酋长国', phoneCode: '+971' },
  { code: 'GB', nameEn: 'United Kingdom', nameZh: '英国', phoneCode: '+44' },
  { code: 'US', nameEn: 'United States', nameZh: '美国', phoneCode: '+1' },
  { code: 'UY', nameEn: 'Uruguay', nameZh: '乌拉圭', phoneCode: '+598' },
  { code: 'UZ', nameEn: 'Uzbekistan', nameZh: '乌兹别克斯坦', phoneCode: '+998' },
  { code: 'VU', nameEn: 'Vanuatu', nameZh: '瓦努阿图', phoneCode: '+678' },
  { code: 'VA', nameEn: 'Vatican City', nameZh: '梵蒂冈', phoneCode: '+39' },
  { code: 'VE', nameEn: 'Venezuela', nameZh: '委内瑞拉', phoneCode: '+58' },
  { code: 'VN', nameEn: 'Vietnam', nameZh: '越南', phoneCode: '+84' },
  { code: 'WF', nameEn: 'Wallis & Futuna', nameZh: '瓦利斯和富图纳', phoneCode: '+681' },
  { code: 'EH', nameEn: 'Western Sahara', nameZh: '西撒哈拉', phoneCode: '+212' },
  { code: 'YE', nameEn: 'Yemen', nameZh: '也门', phoneCode: '+967' },
  { code: 'ZM', nameEn: 'Zambia', nameZh: '赞比亚', phoneCode: '+260' },
  { code: 'ZW', nameEn: 'Zimbabwe', nameZh: '津巴布韦', phoneCode: '+263' },
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