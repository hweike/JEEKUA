// app/[locale]/payment/account/share/[token]/page.tsx
'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Check } from 'lucide-react';
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
// 翻译类型定义
// ============================================================
const translations = {
  zh: {
    title: '收款账户信息',
    subtitle: '以下信息由 {{name}} 提供',
    currency: '支持货币',
    all_currencies: '全部',
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
    copy: '复制',
    copied: '已复制',
    footer: '此账户信息由 {{site_name}} 提供',
    beneficiary_address: '收款人地址',
    intermediary_bank: '中间行',
    default: '默认',
    bank_transfer: '银行转账',
    scan_to_pay: '扫码付款',
    no_qr_code: '暂无二维码',
  },
  en: {
    title: 'Payment Account Information',
    subtitle: 'The following information is provided by {{name}}',
    currency: 'Supported Currencies',
    all_currencies: 'All',
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
    copy: 'Copy',
    copied: 'Copied!',
    footer: 'This account information is provided by {{site_name}}',
    beneficiary_address: 'Beneficiary Address',
    intermediary_bank: 'Intermediary Bank',
    default: 'Default',
    bank_transfer: 'Bank Transfer',
    scan_to_pay: 'Scan to Pay',
    no_qr_code: 'No QR Code',
  },
};

// ============================================================
// 辅助函数
// ============================================================
const getDisplayName = (account: AccountData, lang: string): string => {
  if (lang === 'en' && account.display_name_en) {
    return account.display_name_en;
  }
  if (account.display_name_zh) {
    return account.display_name_zh;
  }
  return account.display_name_en || '未命名';
};

const isDomestic = (account: AccountData): boolean => {
  return account.account_type === 'domestic';
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
  };
  const entry = map[paymentMethod];
  if (!entry) return paymentMethod;
  return lang === 'en' ? entry.en : entry.zh;
};

const getAccountTypeLabel = (type: AccountType | null | undefined, lang: string): string => {
  if (!type) return '';
  const map: Record<AccountType, { zh: string; en: string }> = {
    global: { zh: '全球收款账号', en: 'Global Account' },
    local: { zh: '本地收款账号', en: 'Local Account' },
    domestic: { zh: '国内银行', en: 'Domestic Bank' },
  };
  const entry = map[type];
  if (!entry) return '';
  return lang === 'en' ? entry.en : entry.zh;
};

// ============================================================
// 复制文本生成函数
// ============================================================
function generateCopyText(account: AccountData, text: Record<string, string>, lang: string): string {
  const isTT = account.payment_method === 'tt';
  const isPayPal = account.payment_method === 'paypal';
  const displayName = getDisplayName(account, lang);

  const currencyDisplay = Array.isArray(account.currency) 
    ? account.currency.join(', ') 
    : account.currency || 'All';

  let result = `=== ${displayName} ===\n\n`;

  if (isTT) {
    result += `${text.beneficiary_name}: ${account.beneficiary_name || '-'}\n`;
    result += `${text.account_number}: ${account.beneficiary_account || '-'}\n`;
    result += `${text.country_region}: ${account.country_region || '-'}\n`;
    if (!isDomestic(account) && account.swift_code) {
      result += `${text.swift_code}: ${account.swift_code}\n`;
    }
    if (!isDomestic(account) && account.beneficiary_address) {
      result += `${text.beneficiary_address}: ${account.beneficiary_address}\n`;
    }
    result += `${text.bank}: ${account.beneficiary_bank || '-'}\n`;
    if (account.beneficiary_bank_address) {
      result += `${text.bank_address}: ${account.beneficiary_bank_address}\n`;
    }
    if (account.bank_code) {
      result += `${text.bank_code}: ${account.bank_code}\n`;
    }
    if (account.branch_code) {
      result += `${text.branch_code}: ${account.branch_code}\n`;
    }
    if (!isDomestic(account) && account.iban) {
      result += `${text.iban}: ${account.iban}\n`;
    }
    result += `${text.currency}: ${currencyDisplay}\n`;
    if (account.intermediary_bank) {
      result += `${text.intermediary_bank}: ${account.intermediary_bank}\n`;
    }
    if (account.attention) {
      result += `\n${text.attention}: ${account.attention}\n`;
    }
  } else if (isPayPal) {
    result += `${text.paypal_email}: ${account.paypal_email || '-'}\n`;
    result += `${text.currency}: ${currencyDisplay}\n`;
  } else if (account.payment_method === 'wechat' || account.payment_method === 'alipay') {
    result += `${text.account_holder}: ${account.account_holder || '-'}\n`;
    if (account.payment_method === 'alipay') {
      result += `${text.account_identifier}: ${account.account_identifier || '-'}\n`;
    }
    result += `${text.currency}: ${currencyDisplay}\n`;
    if (account.remark) result += `Remark: ${account.remark}\n`;
  }

  return result;
}

// ✅ 修改：params 是 Promise 类型
interface ShareAccountPageProps {
  params: Promise<{
    locale: string;
    token: string;
  }>;
}

export default function ShareAccountPage({ params }: ShareAccountPageProps) {
  // ✅ 使用 use() 解包 params
  const { locale, token } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountData | null>(null);
  const [copied, setCopied] = useState(false);

  // ✅ 支持的语言列表
  const SUPPORTED_LOCALES = ['zh', 'en'];
  const lang = SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
  
  // ✅ 安全获取翻译
  const text = translations[lang as keyof typeof translations] || translations.en;

  // ✅ 站点名称：从 meta 标签获取
  const [siteName, setSiteName] = useState('');

  // ============================================================
  // ✅ 主题 CSS 变量
  // ============================================================
  const pageBg = 'var(--account-share-single-bg, #f9fafb)';
  const cardBg = 'var(--account-share-single-card-bg, #ffffff)';
  const cardShadow = 'var(--account-share-single-card-shadow, 0 10px 15px -3px rgba(0,0,0,0.1))';
  const cardRadius = 'var(--account-share-single-card-radius, 0.5rem)';
  const titleColor = 'var(--account-share-single-title-color, #111827)';
  const textColor = 'var(--account-share-single-text-color, #374151)';
  const mutedColor = 'var(--account-share-single-muted-color, #6b7280)';
  const mutedBg = 'var(--account-share-single-muted-bg, #f3f4f6)';
  const borderColor = 'var(--account-share-single-border-color, #e5e7eb)';
  const primaryColor = 'var(--account-share-single-primary-color, #2563eb)';
  const primaryLightBg = 'var(--account-share-single-primary-light-bg, #eff6ff)';
  const primaryLightText = 'var(--account-share-single-primary-light-text, #1e40af)';
  const successBg = 'var(--account-share-single-success-bg, #dcfce7)';
  const successText = 'var(--account-share-single-success-text, #166534)';
  const successBorder = 'var(--account-share-single-success-border, #86efac)';
  const warningText = 'var(--account-share-single-warning-text, #92400e)';
  const warningBg = 'var(--account-share-single-warning-bg, #fef3c7)';
  const infoText = 'var(--account-share-single-info-text, #2563eb)';
  const infoBg = 'var(--account-share-single-info-bg, #dbeafe)';
  const hoverBg = 'var(--account-share-single-hover-bg, #f9fafb)';
  const loadingColor = 'var(--account-share-single-loading-color, #2563eb)';

  // ✅ 客户端获取站点名称
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const meta = document.querySelector('meta[name="site-name"]') as HTMLMetaElement;
      if (meta?.content) {
        setSiteName(meta.content);
      }
    }
  }, []);

  // ✅ 修复：改用 fetch 调用 API 路由
  useEffect(() => {
    const loadAccount = async () => {
      try {
        // ✅ 使用 API 路由替代 accountService
        const res = await fetch(`/api/payment/account/share/${token}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            router.replace('/404');
            return;
          }
          throw new Error(`获取账户失败: ${res.status}`);
        }
        
        const result = await res.json();
        const data = result.data;
        
        if (!data) {
          console.error('获取账户失败: 账户不存在');
          router.replace('/404');
          return;
        }

        let currencyData = data.currency;
        if (typeof currencyData === 'string') {
          try {
            currencyData = JSON.parse(currencyData);
          } catch {
            currencyData = [currencyData];
          }
        }
        if (!Array.isArray(currencyData)) {
          currencyData = [];
        }

        setAccount({
          ...data,
          currency: currencyData,
        } as AccountData);
      } catch (error) {
        console.error('加载失败:', error);
        router.replace('/404');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      loadAccount();
    }
  }, [token, router]);

  const handleCopy = async () => {
    if (!account) return;
    const copyText = generateCopyText(account, text, lang);
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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

  if (!account) {
    return null;
  }

  const displayName = getDisplayName(account, lang);
  const logo = getBankLogo(account);
  const isTT = account.payment_method === 'tt';
  const isPayPal = account.payment_method === 'paypal';
  const isWechat = account.payment_method === 'wechat';
  const isAlipay = account.payment_method === 'alipay';
  const isDomesticAccount = isDomestic(account);
  const typeLabel = getAccountTypeLabel(account.account_type, lang);
  const currencyDisplay = Array.isArray(account.currency) 
    ? account.currency.join(', ') 
    : account.currency || text.all_currencies;

  const hasQRCode = (isWechat || isAlipay) && account.qr_code_image;

  const handleQrError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.style.display = 'none';
    const container = img.parentElement;
    if (container) {
      const fallback = document.createElement('div');
      fallback.className = 'text-gray-400 text-sm text-center';
      fallback.textContent = text.no_qr_code;
      container.appendChild(fallback);
    }
  };

  return (
    <div className="min-h-screen py-12 print:py-4 print:bg-white"
      style={{ backgroundColor: pageBg }}
    >
      <div className="max-w-3xl mx-auto px-4 print:px-0">
        <div className="rounded-lg shadow-lg p-6 md:p-8 print:shadow-none print:p-4"
          style={{
            backgroundColor: cardBg,
            boxShadow: cardShadow,
            borderRadius: cardRadius,
          }}
        >
          <div className="text-center mb-8 print:mb-6">
            <h1 className="text-2xl font-bold" style={{ color: titleColor }}>{text.title}</h1>
            <p className="mt-1" style={{ color: mutedColor }}>
              {text.subtitle.replace('{{name}}', displayName)}
            </p>
          </div>

          <div className="flex items-center justify-between border rounded-lg p-4 mb-6 print:border-gray-300"
            style={{ borderColor: borderColor }}
          >
            <div className="flex items-center gap-4">
              {renderLogo(logo)}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold" style={{ color: titleColor }}>{displayName}</h2>
                  <span className="text-xs px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: mutedBg,
                      color: mutedColor,
                    }}
                  >
                    {getPaymentTypeLabel(account.payment_method, lang)}
                  </span>
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
                <div className="text-xs mt-0.5" style={{ color: mutedColor }}>
                  {text.currency}: {currencyDisplay}
                </div>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-all flex-shrink-0 ${
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
                  <span>{text.copy}</span>
                </>
              )}
            </button>
          </div>

          {hasQRCode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg p-4 border print:border-gray-300"
                style={{
                  backgroundColor: mutedBg,
                  borderColor: borderColor,
                }}
              >
                <div className="space-y-3">
                  <div>
                    <div className="text-xs" style={{ color: mutedColor }}>{text.account_holder}</div>
                    <div className="font-medium" style={{ color: textColor }}>{account.account_holder || '-'}</div>
                  </div>
                  {isAlipay && (
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.account_identifier}</div>
                      <div className="font-medium" style={{ color: textColor }}>{account.account_identifier || '-'}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
                    <div className="font-medium" style={{ color: textColor }}>{currencyDisplay}</div>
                  </div>
                  {account.remark && (
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>备注</div>
                      <div className="font-medium text-sm" style={{ color: textColor }}>{account.remark}</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-lg p-4 border print:border-gray-300"
                style={{
                  backgroundColor: mutedBg,
                  borderColor: borderColor,
                }}
              >
                <img 
                  src={account.qr_code_image} 
                  alt="收款码"
                  className="w-48 h-48 md:w-56 md:h-56 object-contain rounded-lg"
                  style={{ backgroundColor: cardBg }}
                  onError={handleQrError}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg p-4 border print:border-gray-300"
              style={{
                backgroundColor: mutedBg,
                borderColor: borderColor,
              }}
            >
              <div className="space-y-3">
                {isTT && (
                  <>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.beneficiary_name}</div>
                      <div className="font-medium" style={{ color: textColor }}>{account.beneficiary_name || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.account_number}</div>
                      <div className="font-medium font-mono font-bold select-all text-base"
                        style={{ color: infoText }}
                      >
                        {account.beneficiary_account || '-'}
                      </div>
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
                  </>
                )}

                {isWechat && !account.qr_code_image && (
                  <>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.account_holder}</div>
                      <div className="font-medium" style={{ color: textColor }}>{account.account_holder || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
                      <div className="font-medium" style={{ color: textColor }}>{currencyDisplay}</div>
                    </div>
                  </>
                )}

                {isAlipay && !account.qr_code_image && (
                  <>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.account_holder}</div>
                      <div className="font-medium" style={{ color: textColor }}>{account.account_holder || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.account_identifier}</div>
                      <div className="font-medium" style={{ color: textColor }}>{account.account_identifier || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
                      <div className="font-medium" style={{ color: textColor }}>{currencyDisplay}</div>
                    </div>
                  </>
                )}

                {isPayPal && (
                  <>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.paypal_email}</div>
                      <div className="font-medium font-mono" style={{ color: textColor }}>{account.paypal_email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: mutedColor }}>{text.currency}</div>
                      <div className="font-medium" style={{ color: textColor }}>{currencyDisplay}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-sm border-t pt-4 print:border-gray-300"
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