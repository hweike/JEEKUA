// app/[locale]/payment/account/share/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Globe, MapPin, Building2, Copy, Check } from 'lucide-react';
import { accountService } from '@/lib/payment/services/account.service';
import { getSiteSettings } from '@/lib/getSiteSettings';
import { 
  BANK_LOGOS, 
  PRESET_LOGOS, 
  DEFAULT_LOGO,
  getBankLogo as getBankLogoFromConfig,
} from '@/lib/payment/types/logos';

// ============================================================
// 内联类型定义
// ============================================================
type AccountType = 'global' | 'local' | 'domestic';

interface AccountData {
  id: string;
  site_id: string;
  account_type?: AccountType | null;
  payment_type: string;
  payment_method: string;
  display_name_zh: string;
  display_name_en: string;
  currency: string[];
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
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
  is_verified?: boolean;
  share_token?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 常量定义
// ============================================================
const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// ✅ 支持的语言列表
const SUPPORTED_LOCALES = ['zh', 'en'];

// ============================================================
// 辅助函数
// ============================================================
const isDomestic = (account: AccountData): boolean => {
  return account.account_type === 'domestic';
};

const getDisplayName = (account: AccountData, lang: string): string => {
  if (lang === 'en' && account.display_name_en) {
    return account.display_name_en;
  }
  if (account.display_name_zh) {
    return account.display_name_zh;
  }
  return account.display_name_en || '未命名';
};

const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label_zh: string; label_en: string; icon: React.ReactNode }> = {
  global: {
    label_zh: '全球收款账号',
    label_en: 'Global Account',
    icon: <Globe size={14} />,
  },
  local: {
    label_zh: '本地收款账号',
    label_en: 'Local Account',
    icon: <MapPin size={14} />,
  },
  domestic: {
    label_zh: '中国国内银行',
    label_en: 'Domestic Bank',
    icon: <Building2 size={14} />,
  },
};

const getBankLogo = (account: AccountData): string => {
  if (account.display_name_zh && BANK_LOGOS[account.display_name_zh]) {
    return BANK_LOGOS[account.display_name_zh];
  }
  return getBankLogoFromConfig(account);
};

const getPaymentTypeLabel = (paymentMethod: string, lang: string): string => {
  const map: Record<string, { zh: string; en: string }> = {
    tt: { zh: 'T/T银行转账', en: 'T/T Bank Transfer' },
    wechat: { zh: '微信支付', en: 'WeChat Pay' },
    alipay: { zh: '支付宝', en: 'Alipay' },
    paypal: { zh: 'PayPal', en: 'PayPal' },
    credit_card: { zh: '信用卡', en: 'Credit Card' },
    bank_transfer: { zh: 'T/T银行转账', en: 'Bank Transfer' },
    qr_code: { zh: '扫码支付', en: 'QR Code' },
    online_payment: { zh: '在线支付', en: 'Online Payment' },
  };
  const entry = map[paymentMethod];
  if (!entry) return paymentMethod;
  return lang === 'en' ? entry.en : entry.zh;
};

const getPaymentTypeTitle = (type: string, lang: string): string => {
  const map: Record<string, { zh: string; en: string }> = {
    bank_transfer: { zh: 'T/T银行转账', en: 'Bank Transfer' },
    qr_code: { zh: '扫码支付', en: 'QR Code' },
    online_payment: { zh: '在线支付', en: 'Online Payment' },
  };
  const entry = map[type];
  if (!entry) return type;
  return lang === 'en' ? entry.en : entry.zh;
};

const getAccountTypeLabel = (type: AccountType | null | undefined, lang: string): string => {
  if (!type) return '';
  const config = ACCOUNT_TYPE_CONFIG[type];
  if (!config) return '';
  return lang === 'en' ? config.label_en : config.label_zh;
};

interface ShareAccountsPageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function ShareAccountsPage({ params }: ShareAccountsPageProps) {
  const { locale } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [siteName, setSiteName] = useState('Feisman Power');
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(new Set(['global', 'local', 'domestic']));
  const [copied, setCopied] = useState(false);

  // ✅ 语言回退
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';

  // ✅ 使用类型安全的翻译对象
  const t = {
    zh: {
      title: '收款账户信息',
      subtitle: '请选择以下任一方式付款',
      beneficiary_name: '收款人名称',
      account_number: '收款账号',
      swift_code: 'SWIFT代码',
      iban: 'IBAN',
      country_region: '国家/地区',
      bank: '收款银行',
      bank_address: '银行地址',
      bank_code: '银行代码',
      branch_code: '分行代码',
      attention: '注意事项',
      paypal_email: 'PayPal 邮箱',
      account_holder: '收款户名',
      account_identifier: '账号',
      currency: '支持货币',
      all_currencies: '全部',
      footer: '此账户信息由 {{site_name}} 提供',
      beneficiary_address: '收款人地址',
      intermediary_bank: '中间行',
      select_account_type: '选择账号类型',
      default: '默认',
      bank_transfer: '银行转账',
      currencies: '种货币',
      no_qr_code: '暂无二维码',
      scan_to_pay: '扫码付款',
      copy_info: '复制',
      copied: '已复制',
    },
    en: {
      title: 'Payment Account Information',
      subtitle: 'Please choose one of the following payment methods',
      beneficiary_name: 'Beneficiary Name',
      account_number: 'Account Number',
      swift_code: 'SWIFT Code',
      iban: 'IBAN',
      country_region: 'Country/Region',
      bank: 'Beneficiary Bank',
      bank_address: 'Bank Address',
      bank_code: 'Bank Code',
      branch_code: 'Branch Code',
      attention: 'Attention',
      paypal_email: 'PayPal Email',
      account_holder: 'Account Holder',
      account_identifier: 'Account ID',
      currency: 'Supported Currencies',
      all_currencies: 'All',
      footer: 'This account information is provided by {{site_name}}',
      beneficiary_address: 'Beneficiary Address',
      intermediary_bank: 'Intermediary Bank',
      select_account_type: 'Select Account Type',
      default: 'Default',
      bank_transfer: 'Bank Transfer',
      currencies: 'currencies',
      no_qr_code: 'No QR Code',
      scan_to_pay: 'Scan to Pay',
      copy_info: 'Copy',
      copied: 'Copied',
    },
  };

  // ✅ 使用类型断言解决索引问题
  const text = lang === 'zh' ? t.zh : t.en;

  // ============================================================
  // ✅ 主题 CSS 变量
  // ============================================================
  const pageBg = 'var(--account-share-bg, #f9fafb)';
  const cardBg = 'var(--account-share-card-bg, #ffffff)';
  const cardShadow = 'var(--account-share-card-shadow, 0 10px 15px -3px rgba(0,0,0,0.1))';
  const cardRadius = 'var(--account-share-card-radius, 0.5rem)';
  const titleColor = 'var(--account-share-title-color, #111827)';
  const textColor = 'var(--account-share-text-color, #374151)';
  const mutedColor = 'var(--account-share-muted-color, #6b7280)';
  const mutedBg = 'var(--account-share-muted-bg, #f3f4f6)';
  const borderColor = 'var(--account-share-border-color, #e5e7eb)';
  const primaryColor = 'var(--account-share-primary-color, #2563eb)';
  const primaryLightBg = 'var(--account-share-primary-light-bg, #eff6ff)';
  const primaryLightBorder = 'var(--account-share-primary-light-border, #bfdbfe)';
  const primaryLightText = 'var(--account-share-primary-light-text, #1e40af)';
  const successBg = 'var(--account-share-success-bg, #dcfce7)';
  const successText = 'var(--account-share-success-text, #166534)';
  const successBorder = 'var(--account-share-success-border, #86efac)';
  const warningText = 'var(--account-share-warning-text, #92400e)';
  const hoverBg = 'var(--account-share-hover-bg, #f9fafb)';
  const loadingColor = 'var(--account-share-loading-color, #2563eb)';

  // ============================================================
  // ✅ 动态样式辅助函数
  // ============================================================
  const getStatusColors = (isActive: boolean) => {
    if (isActive) {
      return {
        bg: primaryLightBg,
        border: primaryLightBorder,
        text: primaryLightText,
      };
    }
    return {
      bg: 'transparent',
      border: 'transparent',
      text: textColor,
    };
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        // ✅ 并行加载：使用 accountService.list 和 getSiteSettings
        const [accountsData, settings] = await Promise.all([
          accountService.list(DEFAULT_SITE_ID),
          getSiteSettings(),
        ]);
        
        if (!accountsData || accountsData.length === 0) {
          router.replace('/404');
          return;
        }
        
        setAccounts(accountsData);
        setSiteName(settings?.companyName || settings?.siteName || 'Feisman Power');
        
        // 选择第一个 TT 账户作为默认
        const firstTT = accountsData.find((a: AccountData) => a.payment_method === 'tt');
        if (firstTT) {
          setSelectedAccountId(firstTT.id);
        } else {
          setSelectedAccountId(accountsData[0].id);
        }
      } catch (error) {
        console.error('加载失败:', error);
        router.replace('/404');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [router]);

  const toggleTypeExpand = (type: AccountType) => {
    const newSet = new Set(expandedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setExpandedTypes(newSet);
  };

  const selectAccount = (account: AccountData) => {
    setSelectedAccountId(account.id);
    setCopied(false);
  };

  const handleCopyBankInfo = (account: AccountData) => {
    const isDomesticAccount = isDomestic(account);
    const currencyDisplay = Array.isArray(account.currency) 
      ? account.currency.join(', ') 
      : account.currency || text.all_currencies;
    
    let infoText = '';
    infoText += `${text.beneficiary_name}: ${account.beneficiary_name || '-'}\n`;
    infoText += `${text.account_number}: ${account.beneficiary_account || '-'}\n`;
    infoText += `${text.country_region}: ${account.country_region || '-'}\n`;
    
    if (!isDomesticAccount) {
      infoText += `${text.swift_code}: ${account.swift_code || '-'}\n`;
    }
    
    if (!isDomesticAccount && account.beneficiary_address) {
      infoText += `${text.beneficiary_address}: ${account.beneficiary_address}\n`;
    }
    
    infoText += `${text.bank}: ${account.beneficiary_bank || '-'}\n`;
    
    if (account.beneficiary_bank_address) {
      infoText += `${text.bank_address}: ${account.beneficiary_bank_address}\n`;
    }
    
    if (account.bank_code) {
      infoText += `${text.bank_code}: ${account.bank_code}\n`;
    }
    
    if (account.branch_code) {
      infoText += `${text.branch_code}: ${account.branch_code}\n`;
    }
    
    if (!isDomesticAccount && account.iban) {
      infoText += `${text.iban}: ${account.iban}\n`;
    }
    
    infoText += `${text.currency}: ${currencyDisplay}\n`;
    
    if (account.intermediary_bank) {
      infoText += `${text.intermediary_bank}: ${account.intermediary_bank}\n`;
    }
    
    if (account.attention) {
      infoText += `${text.attention}: ${account.attention}\n`;
    }
    
    navigator.clipboard.writeText(infoText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = infoText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // ✅ 统一 Logo 渲染函数 - 没有 Logo 时不显示
  const renderLogo = (logo: string) => {
    if (!logo || logo === DEFAULT_LOGO) {
      return null;
    }
    return (
      <img 
        src={logo} 
        alt="Bank Logo"
        className="w-[100px] h-[50px] object-contain rounded-lg border p-1"
        style={{
          borderColor: borderColor,
          backgroundColor: cardBg,
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: pageBg }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderBottomColor: loadingColor }}
          ></div>
          <p className="mt-4" style={{ color: mutedColor }}>加载中...</p>
        </div>
      </div>
    );
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const bankTransferAccounts = accounts.filter((a) => a.payment_method === 'tt');
  const qrCodeAccounts = accounts.filter((a) => a.payment_method === 'wechat' || a.payment_method === 'alipay');
  const onlineAccounts = accounts.filter((a) => a.payment_method === 'paypal' || a.payment_method === 'credit_card');
  const hasTTAccounts = bankTransferAccounts.length > 0;

  // ============================================================
  // ✅ 渲染TT账户左侧列表
  // ============================================================
  const renderTTAccountList = () => {
    if (!hasTTAccounts) return null;

    const grouped: Record<AccountType, AccountData[]> = {
      global: [],
      local: [],
      domestic: [],
    };
    
    bankTransferAccounts.forEach((acc) => {
      const type = acc.account_type as AccountType || 'local';
      if (grouped[type]) {
        grouped[type].push(acc);
      } else {
        grouped.local.push(acc);
      }
    });

    const typeKeys: AccountType[] = ['global', 'local', 'domestic'];

    return (
      <div className="space-y-2">
        {typeKeys.map((type) => {
          const accountsOfType = grouped[type] || [];
          if (accountsOfType.length === 0) return null;
          
          const isExpanded = expandedTypes.has(type);
          const typeLabel = getAccountTypeLabel(type, lang);
          
          return (
            <div key={type} className="border rounded-lg overflow-hidden"
              style={{ borderColor: borderColor }}
            >
              <div
                onClick={() => toggleTypeExpand(type)}
                className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                style={{
                  backgroundColor: mutedBg,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = hoverBg;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = mutedBg;
                }}
              >
                <div className="flex items-center gap-2">
                  <span style={{ color: mutedColor }}>{ACCOUNT_TYPE_CONFIG[type].icon}</span>
                  <span className="text-sm font-medium" style={{ color: titleColor }}>{typeLabel}</span>
                  <span className="text-xs" style={{ color: mutedColor }}>({accountsOfType.length})</span>
                </div>
                <ChevronRight 
                  size={16} 
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                  style={{ color: mutedColor }}
                />
              </div>
              {isExpanded && (
                <div className="p-1 space-y-0.5">
                  {accountsOfType.map((account) => {
                    const isActive = selectedAccountId === account.id;
                    const isDefault = account.is_default;
                    const displayName = getDisplayName(account, lang);
                    const colors = getStatusColors(isActive);
                    
                    return (
                      <div
                        key={account.id}
                        onClick={() => selectAccount(account)}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                          isActive ? 'border' : 'border border-transparent'
                        }`}
                        style={{
                          backgroundColor: isActive ? colors.bg : 'transparent',
                          borderColor: isActive ? colors.border : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = hoverBg;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate pl-1" style={{ color: isActive ? colors.text : textColor }}>
                              {displayName}
                            </span>
                            {isDefault && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{
                                  backgroundColor: primaryLightBg,
                                  color: primaryLightText,
                                }}
                              >
                                {text.default}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight size={14} className={`transition-transform ${isActive ? 'text-blue-500' : ''}`}
                          style={{ color: isActive ? primaryColor : mutedColor }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // ✅ 渲染TT账户详情
  // ============================================================
  const renderTTAccountDetail = (account: AccountData) => {
    if (!account) return null;
    
    const displayName = getDisplayName(account, lang);
    const logo = getBankLogo(account);
    const isDomesticAccount = isDomestic(account);
    const currencyDisplay = Array.isArray(account.currency) 
      ? account.currency.join(', ') 
      : account.currency || text.all_currencies;
    const typeLabel = getAccountTypeLabel(account.account_type, lang);

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {renderLogo(logo)}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold" style={{ color: titleColor }}>{displayName}</span>
                {account.is_default && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: primaryLightBg,
                      color: primaryLightText,
                    }}
                  >
                    {text.default}
                  </span>
                )}
                {typeLabel && (
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: mutedBg,
                      color: mutedColor,
                    }}
                  >
                    {typeLabel}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => handleCopyBankInfo(account)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all ${
              copied 
                ? 'border' 
                : 'border border-transparent'
            }`}
            style={{
              backgroundColor: copied ? successBg : mutedBg,
              color: copied ? successText : mutedColor,
              borderColor: copied ? successBorder : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = hoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (!copied) {
                e.currentTarget.style.backgroundColor = mutedBg;
              }
            }}
          >
            {copied ? (
              <>
                <Check size={16} />
                <span>{text.copied}</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>{text.copy_info}</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-lg p-4 border"
          style={{
            backgroundColor: mutedBg,
            borderColor: borderColor,
          }}
        >
          <div className="space-y-3">
            <div>
              <div className="text-xs" style={{ color: mutedColor }}>{text.beneficiary_name}</div>
              <div className="font-medium" style={{ color: textColor }}>{account.beneficiary_name || '-'}</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: mutedColor }}>{text.account_number}</div>
              <div className="font-medium font-mono" style={{ color: textColor }}>{account.beneficiary_account || '-'}</div>
            </div>
            <div>
              <div className="text-xs" style={{ color: mutedColor }}>{text.country_region}</div>
              <div className="font-medium" style={{ color: textColor }}>{account.country_region || '-'}</div>
            </div>
            {!isDomesticAccount && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.swift_code}</div>
                <div className="font-medium font-mono" style={{ color: textColor }}>{account.swift_code || '-'}</div>
              </div>
            )}
            {!isDomesticAccount && account.beneficiary_address && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.beneficiary_address}</div>
                <div className="font-medium" style={{ color: textColor }}>{account.beneficiary_address}</div>
              </div>
            )}
            <div>
              <div className="text-xs" style={{ color: mutedColor }}>{text.bank}</div>
              <div className="font-medium" style={{ color: textColor }}>{account.beneficiary_bank || '-'}</div>
            </div>
            {account.beneficiary_bank_address && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.bank_address}</div>
                <div className="font-medium" style={{ color: textColor }}>{account.beneficiary_bank_address}</div>
              </div>
            )}
            {account.bank_code && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.bank_code}</div>
                <div className="font-medium" style={{ color: textColor }}>{account.bank_code}</div>
              </div>
            )}
            {account.branch_code && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.branch_code}</div>
                <div className="font-medium" style={{ color: textColor }}>{account.branch_code}</div>
              </div>
            )}
            {!isDomesticAccount && account.iban && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.iban}</div>
                <div className="font-medium font-mono" style={{ color: textColor }}>{account.iban}</div>
              </div>
            )}
            <div>
              <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
              <div className="font-medium" style={{ color: textColor }}>{currencyDisplay}</div>
            </div>
            {account.intermediary_bank && (
              <div>
                <div className="text-xs" style={{ color: mutedColor }}>{text.intermediary_bank}</div>
                <div className="font-medium" style={{ color: textColor }}>{account.intermediary_bank}</div>
              </div>
            )}
            {account.attention && (
              <div>
                <div className="text-xs font-medium" style={{ color: warningText }}>⚠️ {text.attention}</div>
                <div className="text-sm whitespace-pre-wrap" style={{ color: warningText }}>{account.attention}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ✅ 扫码支付
  // ============================================================
  const renderQRCodeAccount = (account: AccountData) => {
    const logo = getBankLogo(account);
    const displayName = getDisplayName(account, lang);

    return (
      <div key={account.id} className="border rounded-lg p-4"
        style={{ borderColor: borderColor }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-4 mb-4">
              {renderLogo(logo)}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg" style={{ color: titleColor }}>{displayName}</span>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: mutedBg,
                      color: mutedColor,
                    }}
                  >
                    {getPaymentTypeLabel(account.payment_method, lang)}
                  </span>
                </div>
                <div className="text-sm" style={{ color: mutedColor }}>
                  {text.currency}: {Array.isArray(account.currency) ? account.currency.join(' · ') : text.all_currencies}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y" style={{ borderColor: borderColor }}>
                  <tr>
                    <td className="px-3 py-2 w-1/3 font-medium"
                      style={{
                        backgroundColor: mutedBg,
                        color: mutedColor,
                      }}
                    >
                      {text.account_holder}
                    </td>
                    <td className="px-3 py-2" style={{ color: textColor }}>{account.account_holder || '-'}</td>
                  </tr>
                  {account.payment_method === 'alipay' && (
                    <tr>
                      <td className="px-3 py-2 w-1/3 font-medium"
                        style={{
                          backgroundColor: mutedBg,
                          color: mutedColor,
                        }}
                      >
                        {text.account_identifier}
                      </td>
                      <td className="px-3 py-2" style={{ color: textColor }}>{account.account_identifier || '-'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center rounded-lg p-4"
            style={{ backgroundColor: mutedBg }}
          >
            {account.qr_code_image ? (
              <div className="flex flex-col items-center">
                <img 
                  src={account.qr_code_image} 
                  alt="收款码"
                  className="w-48 h-48 object-contain border rounded-lg"
                  style={{
                    borderColor: borderColor,
                    backgroundColor: cardBg,
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <p className="text-xs mt-2" style={{ color: mutedColor }}>{text.scan_to_pay}</p>
              </div>
            ) : (
              <div className="w-48 h-48 border-2 border-dashed rounded-lg flex items-center justify-center text-sm"
                style={{
                  borderColor: borderColor,
                  color: mutedColor,
                }}
              >
                {text.no_qr_code}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ✅ 在线支付
  // ============================================================
  const renderOnlineAccount = (account: AccountData) => {
    const logo = getBankLogo(account);
    const displayName = getDisplayName(account, lang);

    return (
      <div key={account.id} className="border rounded-lg p-4"
        style={{ borderColor: borderColor }}
      >
        <div className="flex items-center gap-4">
          {renderLogo(logo)}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg" style={{ color: titleColor }}>{displayName}</span>
              <span className="text-xs px-2 py-0.5 rounded"
                style={{
                  backgroundColor: mutedBg,
                  color: mutedColor,
                }}
              >
                {getPaymentTypeLabel(account.payment_method, lang)}
              </span>
            </div>
            {account.paypal_email && (
              <div className="text-sm mt-1">
                <span style={{ color: mutedColor }}>{text.paypal_email}:</span>
                <span className="ml-1 font-mono" style={{ color: textColor }}>{account.paypal_email}</span>
              </div>
            )}
            <div className="text-sm" style={{ color: mutedColor }}>
              {text.currency}: {Array.isArray(account.currency) ? account.currency.join(' · ') : text.all_currencies}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen py-12"
      style={{ backgroundColor: pageBg }}
    >
      <div className="max-w-4xl mx-auto px-4">
        <div className="rounded-lg shadow-lg p-6 md:p-8"
          style={{
            backgroundColor: cardBg,
            boxShadow: cardShadow,
            borderRadius: cardRadius,
          }}
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold" style={{ color: titleColor }}>{text.title}</h1>
            <p className="mt-1" style={{ color: mutedColor }}>{text.subtitle}</p>
          </div>

          {hasTTAccounts && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: titleColor }}>
                {getPaymentTypeTitle('bank_transfer', lang)}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 border-r pr-4"
                  style={{ borderColor: borderColor }}
                >
                  <div className="text-xs uppercase tracking-wider mb-2" style={{ color: mutedColor }}>
                    {text.select_account_type}
                  </div>
                  {renderTTAccountList()}
                </div>
                <div className="md:col-span-2">
                  {selectedAccount && renderTTAccountDetail(selectedAccount)}
                </div>
              </div>
            </div>
          )}

          {qrCodeAccounts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: titleColor }}>
                {getPaymentTypeTitle('qr_code', lang)}
              </h2>
              <div className="space-y-4">
                {qrCodeAccounts.map((account) => renderQRCodeAccount(account))}
              </div>
            </div>
          )}

          {onlineAccounts.length > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4" style={{ color: titleColor }}>
                {getPaymentTypeTitle('online_payment', lang)}
              </h2>
              <div className="space-y-4">
                {onlineAccounts.map((account) => renderOnlineAccount(account))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm border-t pt-4"
            style={{ color: mutedColor, borderColor: borderColor }}
          >
            {text.footer.replace('{{site_name}}', siteName)}
            <br />
            <span className="text-xs" style={{ color: mutedColor }}>
              {new Date().toLocaleString(lang === 'en' ? 'en-US' : 'zh-CN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}