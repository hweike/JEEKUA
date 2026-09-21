// lib/payment/types/logos.ts
// ============================================================
// Logo 映射 - UI 配置
// ============================================================

// ============================================================
// 银行 Logo 映射（T/T 银行）- 只返回相对路径
// ============================================================
export const BANK_LOGOS: Record<string, string> = {
  // ===== 全球/本地银行 =====
  '中国香港(花旗)': '/share/CITIBANK.png',
  'Hong Kong, China (CITI)': '/share/CITIBANK.png',
  '新加坡(摩根)': '/share/JPMorgan.png',
  'Singapore (JPM)': '/share/JPMorgan.png',
  '欧洲(摩根)': '/share/JPMorgan.png',
  'Europe (JPM)': '/share/JPMorgan.png',
  'RU专属收款账户': '/share/local-bank.png',
  'RU Exclusive Collection Account': '/share/local-bank.png',

  // ===== 国内银行 =====
  '中国工商银行': '/share/icbc.png',
  'Industrial and Commercial Bank of China (ICBC)': '/share/icbc.png',
  '中国农业银行': '/share/abc.png',
  'Agricultural Bank of China (ABC)': '/share/abc.png',
  '中国银行': '/share/boc.png',
  'Bank of China (BOC)': '/share/boc.png',
  '中国建设银行': '/share/ccb.png',
  'China Construction Bank (CCB)': '/share/ccb.png',
  '交通银行': '/share/bocom.png',
  'Bank of Communications (BoCom)': '/share/bocom.png',
  '中国邮政储蓄银行': '/share/psbc.png',
  'Postal Savings Bank of China (PSBC)': '/share/psbc.png',
  '中信银行': '/share/citic.png',
  'China CITIC Bank (CITIC)': '/share/citic.png',
  '中国光大银行': '/share/ceb.png',
  'China Everbright Bank (CEB)': '/share/ceb.png',
  '招商银行': '/share/cmb.png',
  'China Merchants Bank (CMB)': '/share/cmb.png',
  '上海浦东发展银行': '/share/spdb.png',
  'Shanghai Pudong Development Bank (SPDB)': '/share/spdb.png',
  '中国民生银行': '/share/cmbc.png',
  'China Minsheng Bank (CMBC)': '/share/cmbc.png',
  '华夏银行': '/share/hxb.png',
  'Hua Xia Bank (HXB)': '/share/hxb.png',
  '平安银行': '/share/pingan.png',
  'Ping An Bank': '/share/pingan.png',
  '兴业银行': '/share/cib.png',
  'Industrial Bank (CIB)': '/share/cib.png',
  '广发银行': '/share/cgb.png',
  'China Guangfa Bank (CGB)': '/share/cgb.png',
  '浙商银行': '/share/zheshang.png',
  'China Zheshang Bank (Zheshang)': '/share/zheshang.png',
};

// ============================================================
// 预设账号 Logo 映射 - 只返回相对路径
// ============================================================
export const PRESET_LOGOS: Record<string, string> = {
  wechat: '/share/wechat.png',
  alipay: '/share/alipay.png',
  paypal: '/share/paypal.png',
};

// ============================================================
// 默认 Logo - 只返回相对路径
// ============================================================
export const DEFAULT_LOGO = '/share/default-bank.png';

// ============================================================
// Logo 样式配置
// ============================================================
export const LOGO_STYLES = {
  width: 100,
  height: 50,
  borderRadius: 8,
  objectFit: 'contain' as const,
};

// ============================================================
// Logo 辅助函数 - 只返回相对路径
// ============================================================

/**
 * 根据账号获取对应的 Logo（返回相对路径）
 */
export function getBankLogo(account: {
  payment_method: string;
  display_name_zh?: string;
  display_name_en?: string;
  beneficiary_bank?: string;
}): string {
  // 1. T/T 银行
  if (account.payment_method === 'tt') {
    const name = account.display_name_zh || account.display_name_en || '';
    if (BANK_LOGOS[name]) return BANK_LOGOS[name];
    
    const bankName = (account.beneficiary_bank || '').toLowerCase();
    
    if (bankName.includes('citi')) return BANK_LOGOS['中国香港(花旗)'] || DEFAULT_LOGO;
    if (bankName.includes('jpmorgan') || bankName.includes('chase')) return BANK_LOGOS['新加坡(摩根)'] || DEFAULT_LOGO;
    
    const bankLogoMap: Record<string, string> = {
      '工商银行': '/share/icbc.png',
      '农业银行': '/share/abc.png',
      '中国银行': '/share/boc.png',
      '建设银行': '/share/ccb.png',
      '交通银行': '/share/bocom.png',
      '邮政储蓄': '/share/psbc.png',
      '中信银行': '/share/citic.png',
      '光大银行': '/share/ceb.png',
      '招商银行': '/share/cmb.png',
      '浦东发展': '/share/spdb.png',
      '民生银行': '/share/cmbc.png',
      '华夏银行': '/share/hxb.png',
      '平安银行': '/share/pingan.png',
      '兴业银行': '/share/cib.png',
      '广发银行': '/share/cgb.png',
      '浙商银行': '/share/zheshang.png',
    };
    
    for (const [key, value] of Object.entries(bankLogoMap)) {
      if (bankName.includes(key)) {
        return value;
      }
    }
  }

  // 2. 预设账号
  if (account.payment_method === 'wechat') return PRESET_LOGOS.wechat;
  if (account.payment_method === 'alipay') return PRESET_LOGOS.alipay;
  if (account.payment_method === 'paypal') return PRESET_LOGOS.paypal;

  return DEFAULT_LOGO;
}

/**
 * 根据显示名称获取银行 Logo（返回相对路径）
 */
export function getBankLogoByName(displayName: string): string {
  return BANK_LOGOS[displayName] || DEFAULT_LOGO;
}

/**
 * 根据支付方式获取预设 Logo（返回相对路径）
 */
export function getPresetLogo(method: string): string {
  return PRESET_LOGOS[method] || DEFAULT_LOGO;
}

/**
 * 获取 Logo 的 React 样式
 */
export function getLogoStyle() {
  return {
    width: LOGO_STYLES.width,
    height: LOGO_STYLES.height,
    borderRadius: LOGO_STYLES.borderRadius,
    objectFit: LOGO_STYLES.objectFit,
  };
}