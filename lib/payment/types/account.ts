// lib/payment/types/account.ts

export type PaymentType = 'bank_transfer' | 'qr_code' | 'online_payment';
export type PaymentMethodType = 'tt' | 'paypal' | 'credit_card' | 'wechat' | 'alipay';
export type AccountType = 'global' | 'local' | 'domestic';

// ============================================================
// 预设账号配置（用于微信/支付宝/PayPal）
// ============================================================
export const PRESET_ACCOUNTS: Record<string, {
  method: PaymentMethodType;
  label_zh: string;
  label_en: string;
  icon: string;
  default_display_name_zh: string;
  default_display_name_en: string;
}> = {
  wechat: {
    method: 'wechat',
    label_zh: '微信支付',
    label_en: 'WeChat Pay',
    icon: '💚',
    default_display_name_zh: '微信支付',
    default_display_name_en: 'WeChat Pay',
  },
  alipay: {
    method: 'alipay',
    label_zh: '支付宝',
    label_en: 'Alipay',
    icon: '💙',
    default_display_name_zh: '支付宝',
    default_display_name_en: 'Alipay',
  },
  paypal: {
    method: 'paypal',
    label_zh: 'PayPal',
    label_en: 'PayPal',
    icon: '💳',
    default_display_name_zh: 'PayPal',
    default_display_name_en: 'PayPal',
  },
};

// ============================================================
// 支付方式标签映射
// ============================================================
export const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  tt: 'T/T银行转账',
  paypal: 'PayPal',
  credit_card: '信用卡',
  wechat: '微信支付',
  alipay: '支付宝',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  bank_transfer: 'T/T银行收款账户',
  qr_code: '扫码支付',
  online_payment: '在线支付',
};

// ============================================================
// 账号模板接口
// ============================================================
export interface AccountTemplate {
  value: string;
  label_zh: string;
  label_en: string;
  country: string;
  bank: string;
  bank_address: string;
  bank_code: string;
  branch_code: string;
  swift: string;
}

// ============================================================
// 国内银行模板数据
// ============================================================
const DOMESTIC_BANK_TEMPLATES: AccountTemplate[] = [
  // 🏛️ 国有大型商业银行
  {
    value: 'icbc',
    label_zh: '中国工商银行',
    label_en: 'Industrial and Commercial Bank of China (ICBC)',
    country: 'China',
    bank: '中国工商银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'ICBKCNBJ',
  },
  {
    value: 'abc',
    label_zh: '中国农业银行',
    label_en: 'Agricultural Bank of China (ABC)',
    country: 'China',
    bank: '中国农业银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'ABOCCNBJ',
  },
  {
    value: 'boc',
    label_zh: '中国银行',
    label_en: 'Bank of China (BOC)',
    country: 'China',
    bank: '中国银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'BKCHCNBJ',
  },
  {
    value: 'ccb',
    label_zh: '中国建设银行',
    label_en: 'China Construction Bank (CCB)',
    country: 'China',
    bank: '中国建设银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'PCBCCNBJ',
  },
  {
    value: 'bocom',
    label_zh: '交通银行',
    label_en: 'Bank of Communications (BoCom)',
    country: 'China',
    bank: '交通银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'COMMCNSH',
  },
  {
    value: 'psbc',
    label_zh: '中国邮政储蓄银行',
    label_en: 'Postal Savings Bank of China (PSBC)',
    country: 'China',
    bank: '中国邮政储蓄银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'PSBCCNBJ',
  },
  // 🏢 全国性股份制商业银行
  {
    value: 'citic',
    label_zh: '中信银行',
    label_en: 'China CITIC Bank (CITIC)',
    country: 'China',
    bank: '中信银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'CIBKCNBJ',
  },
  {
    value: 'ceb',
    label_zh: '中国光大银行',
    label_en: 'China Everbright Bank (CEB)',
    country: 'China',
    bank: '中国光大银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'EVERCNBJ',
  },
  {
    value: 'cmb',
    label_zh: '招商银行',
    label_en: 'China Merchants Bank (CMB)',
    country: 'China',
    bank: '招商银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'CMBCCNBS',
  },
  {
    value: 'spdb',
    label_zh: '上海浦东发展银行',
    label_en: 'Shanghai Pudong Development Bank (SPDB)',
    country: 'China',
    bank: '上海浦东发展银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'SPDBCNSH',
  },
  {
    value: 'cmbc',
    label_zh: '中国民生银行',
    label_en: 'China Minsheng Bank (CMBC)',
    country: 'China',
    bank: '中国民生银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'MSBCCNBJ',
  },
  {
    value: 'hxb',
    label_zh: '华夏银行',
    label_en: 'Hua Xia Bank (HXB)',
    country: 'China',
    bank: '华夏银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'HXBKCNBJ',
  },
  {
    value: 'pingan',
    label_zh: '平安银行',
    label_en: 'Ping An Bank',
    country: 'China',
    bank: '平安银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'SZDBCNBS',
  },
  {
    value: 'cib',
    label_zh: '兴业银行',
    label_en: 'Industrial Bank (CIB)',
    country: 'China',
    bank: '兴业银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'FJIBCNBA',
  },
  {
    value: 'cgb',
    label_zh: '广发银行',
    label_en: 'China Guangfa Bank (CGB)',
    country: 'China',
    bank: '广发银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'GDBKCN22',
  },
  {
    value: 'zheshang',
    label_zh: '浙商银行',
    label_en: 'China Zheshang Bank (Zheshang)',
    country: 'China',
    bank: '浙商银行',
    bank_address: '',
    bank_code: '',
    branch_code: '',
    swift: 'ZJCBCN2N',
  },
];

// ============================================================
// 账号模板数据
// ============================================================
export const ACCOUNT_TEMPLATES: Record<AccountType, AccountTemplate[]> = {
  global: [
    {
      value: 'citi_hk',
      label_zh: '中国香港(花旗)',
      label_en: 'Hong Kong, China (CITI)',
      country: 'Hong Kong',
      bank: 'CITIBANK N.A.HONG KONG BRANCH',
      bank_address: 'Champion Tower THREE Garden ROAD CENTRAL, HONG KONG',
      bank_code: '006',
      branch_code: '391',
      swift: 'CITIHKHX',
    },
    {
      value: 'jpm_sg',
      label_zh: '新加坡(摩根)',
      label_en: 'Singapore (JPM)',
      country: 'Singapore',
      bank: 'JPMORGAN CHASE BANK, N.A., SINGAPORE BRANCH',
      bank_address: '8 Marina View, #12-01, Asia Square Tower 1, Singapore 018960',
      bank_code: '',
      branch_code: '',
      swift: 'CHASSGSG',
    },
  ],
  local: [
    {
      value: 'ru_exclusive',
      label_zh: 'RU专属收款账户',
      label_en: 'RU Exclusive Collection Account',
      country: 'Russia',
      bank: 'Local Bank',
      bank_address: '',
      bank_code: '',
      branch_code: '',
      swift: '',
    },
    {
      value: 'jpm_eu',
      label_zh: '欧洲(摩根)',
      label_en: 'Europe (JPM)',
      country: 'United Kingdom',
      bank: 'JPMORGAN CHASE BANK, N.A., LONDON BRANCH',
      bank_address: '25 Bank Street, Canary Wharf, London E14 5JP, UK',
      bank_code: '',
      branch_code: '',
      swift: 'CHASGB2L',
    },
  ],
  domestic: DOMESTIC_BANK_TEMPLATES,
};

// ============================================================
// 货币选项
// ============================================================
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD - 美元' },
  { value: 'EUR', label: 'EUR - 欧元' },
  { value: 'AUD', label: 'AUD - 澳元' },
  { value: 'GBP', label: 'GBP - 英镑' },
  { value: 'CAD', label: 'CAD - 加元' },
  { value: 'HKD', label: 'HKD - 港币' },
  { value: 'JPY', label: 'JPY - 日元' },
  { value: 'SGD', label: 'SGD - 新加坡元' },
  { value: 'CNY', label: 'CNY - 人民币' },
] as const;

export type Currency = typeof CURRENCY_OPTIONS[number]['value'];

// ============================================================
// PaymentAccount 接口
// ============================================================
export interface PaymentAccount {
  id: string;
  site_id: string;

  account_type?: AccountType | null;
  payment_type: PaymentType;
  payment_method: PaymentMethodType;
  display_name_zh: string;
  display_name_en: string;
  currency: string[];

  is_active: boolean;
  is_default: boolean;
  sort_order: number;

  // TT Bank 字段
  beneficiary_name?: string;
  beneficiary_account?: string;
  country_region?: string;
  swift_code?: string;
  beneficiary_address?: string;
  beneficiary_bank?: string;
  beneficiary_bank_address?: string;
  bank_code?: string;
  branch_code?: string;
  iban?: string;
  attention?: string;
  intermediary_bank?: string;

  // 微信/支付宝 字段
  account_holder?: string;
  account_identifier?: string;
  qr_code_image?: string;
  remark?: string;

  // PayPal 字段
  paypal_email?: string;
  paypal_client_id?: string;
  paypal_client_secret?: string;
  paypal_webhook_id?: string;
  is_verified?: boolean;

  // Credit Card 预留
  stripe_secret_key?: string;
  stripe_publishable_key?: string;
  stripe_webhook_secret?: string;

  share_token?: string;
  details?: any;

  created_at: string;
  updated_at: string;
}

// ============================================================
// CreateAccountInput 接口
// ============================================================
export interface CreateAccountInput {
  account_type?: AccountType | null;
  payment_type: PaymentType;
  payment_method: PaymentMethodType;
  display_name_zh: string;
  display_name_en: string;
  currency: string[];
  is_default?: boolean;
  is_verified?: boolean;

  beneficiary_name?: string;
  beneficiary_account?: string;
  country_region?: string;
  swift_code?: string;
  beneficiary_address?: string;
  beneficiary_bank?: string;
  beneficiary_bank_address?: string;
  bank_code?: string;
  branch_code?: string;
  iban?: string;
  attention?: string;
  intermediary_bank?: string;

  account_holder?: string;
  account_identifier?: string;
  qr_code_image?: string;
  remark?: string;

  paypal_email?: string;
  paypal_client_id?: string;
  paypal_client_secret?: string;
  paypal_webhook_id?: string;
}

// ============================================================
// UpdateAccountInput 接口
// ============================================================
export interface UpdateAccountInput extends Partial<CreateAccountInput> {
  is_active?: boolean;
  is_verified?: boolean;
}

// ============================================================
// AccountFilters 接口
// ============================================================
export interface AccountFilters {
  type?: PaymentType;
  method?: PaymentMethodType | string;
  account_type?: AccountType | 'null' | 'NULL';
  is_verified?: boolean;
}

// ============================================================
// 验证状态相关的类型和工具
// ============================================================

export type VerificationStatus = 'verified' | 'unverified' | 'pending';

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, { label_zh: string; label_en: string; color: string }> = {
  verified: {
    label_zh: '已验证',
    label_en: 'Verified',
    color: 'bg-green-100 text-green-700',
  },
  unverified: {
    label_zh: '未验证',
    label_en: 'Unverified',
    color: 'bg-red-100 text-red-700',
  },
  pending: {
    label_zh: '验证中',
    label_en: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
  },
};

export function getVerificationStatusDisplay(isVerified?: boolean): VerificationStatus {
  if (isVerified === undefined || isVerified === null) return 'pending';
  return isVerified ? 'verified' : 'unverified';
}

export function getVerificationStatusLabel(isVerified?: boolean): string {
  const status = getVerificationStatusDisplay(isVerified);
  return VERIFICATION_STATUS_LABELS[status].label_zh;
}

export function getVerificationStatusColor(isVerified?: boolean): string {
  const status = getVerificationStatusDisplay(isVerified);
  return VERIFICATION_STATUS_LABELS[status].color;
}

// ============================================================
// 辅助函数
// ============================================================

export function getTemplatesByType(type: AccountType): AccountTemplate[] {
  return ACCOUNT_TEMPLATES[type] || [];
}

export function getTemplateByValue(value: string): AccountTemplate | undefined {
  const allTemplates = [
    ...ACCOUNT_TEMPLATES.global,
    ...ACCOUNT_TEMPLATES.local,
    ...ACCOUNT_TEMPLATES.domestic,
  ];
  return allTemplates.find(t => t.value === value);
}

export function getCurrencyLabel(value: string): string {
  const found = CURRENCY_OPTIONS.find(c => c.value === value);
  return found?.label || value;
}

export function formatCurrencies(currencies: string[]): string {
  return currencies.map(c => getCurrencyLabel(c)).join(', ');
}

export function isQRCodePayment(method: PaymentMethodType): boolean {
  return method === 'wechat' || method === 'alipay';
}

export function isTTBankPayment(method: PaymentMethodType): boolean {
  return method === 'tt';
}

export function isOnlinePayment(method: PaymentMethodType): boolean {
  return method === 'paypal' || method === 'credit_card';
}

export function getPresetAccountByMethod(
  method: PaymentMethodType
): typeof PRESET_ACCOUNTS[keyof typeof PRESET_ACCOUNTS] | undefined {
  const key = Object.keys(PRESET_ACCOUNTS).find(k => PRESET_ACCOUNTS[k].method === method);
  return key ? PRESET_ACCOUNTS[key] : undefined;
}

export function isPresetAccount(method: PaymentMethodType): boolean {
  return ['wechat', 'alipay', 'paypal'].includes(method);
}

export function isPayPalAccount(method: PaymentMethodType): boolean {
  return method === 'paypal';
}

export function requiresVerification(method: PaymentMethodType): boolean {
  return method === 'paypal';
}

export function getDefaultDisplayName(method: PaymentMethodType): { zh: string; en: string } {
  const preset = getPresetAccountByMethod(method);
  if (preset) {
    return {
      zh: preset.default_display_name_zh,
      en: preset.default_display_name_en,
    };
  }
  return { zh: '', en: '' };
}

export function getDomesticBankTemplates(): AccountTemplate[] {
  return DOMESTIC_BANK_TEMPLATES;
}

export function getDomesticBankByValue(value: string): AccountTemplate | undefined {
  return DOMESTIC_BANK_TEMPLATES.find(t => t.value === value);
}