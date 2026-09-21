// app/admin/payment/accounts/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, Download, Share2, Edit, Trash2, Star, 
  Globe, MapPin, CreditCard, Smartphone,
  Settings, X, Building2
} from 'lucide-react';
import Toast from '@/components/Toast';
import type { 
  PaymentAccount, 
  PaymentMethodType, 
  AccountType,
  PaymentType,
} from '@/lib/payment/types/account';
import { 
  ACCOUNT_TEMPLATES, 
  PRESET_ACCOUNTS,
  PAYMENT_TYPE_LABELS,
} from '@/lib/payment/types/account';
// ✅ 从 logos.ts 导入 Logo 配置
import { 
  BANK_LOGOS, 
  PRESET_LOGOS, 
  DEFAULT_LOGO,
  LOGO_STYLES,
  getBankLogo as getBankLogoFromConfig,
} from '@/lib/payment/types/logos';
import QRCodeAccountForm from './components/QRCodeAccountForm';
import PayPalAccountForm from './components/PayPalAccountForm';

// ============================================================
// 国家代码到国旗的映射（保留，不是 Logo 配置）
// ============================================================
const COUNTRY_FLAGS: Record<string, string> = {
  'Hong Kong': '🇭🇰',
  'Singapore': '🇸🇬',
  'China': '🇨🇳',
  'Russia': '🇷🇺',
  'United Kingdom': '🇬🇧',
  'Korea': '🇰🇷',
  'Japan': '🇯🇵',
  'United States': '🇺🇸',
  'Germany': '🇩🇪',
  'France': '🇫🇷',
  'Italy': '🇮🇹',
  'Spain': '🇪🇸',
  'Canada': '🇨🇦',
  'Australia': '🇦🇺',
};

// ============================================================
// ✅ 支付类型图标映射
// ============================================================
const PAYMENT_TYPE_ICONS: Record<PaymentType, React.ReactNode> = {
  bank_transfer: <Building2 size={16} />,
  qr_code: <Smartphone size={16} />,
  online_payment: <CreditCard size={16} />,
};

// ============================================================
// 账号类型显示配置
// ============================================================
const ACCOUNT_TYPE_CONFIG: Record<AccountType, { label: string; icon: React.ReactNode; color: string }> = {
  global: {
    label: '全球',
    icon: <Globe size={12} />,
    color: 'bg-blue-100 text-blue-700',
  },
  local: {
    label: '本地',
    icon: <MapPin size={12} />,
    color: 'bg-green-100 text-green-700',
  },
  domestic: {
    label: '国内',
    icon: <Building2 size={12} />,
    color: 'bg-orange-100 text-orange-700',
  },
};

const getAccountTypeDisplay = (accountType?: AccountType | string | null) => {
  if (!accountType) return null;
  const validTypes: AccountType[] = ['global', 'local', 'domestic'];
  if (!validTypes.includes(accountType as AccountType)) {
    return null;
  }
  return ACCOUNT_TYPE_CONFIG[accountType as AccountType] || null;
};

const getCountryDisplay = (country: string): string => {
  if (!country) return '🌍';
  for (const [key, flag] of Object.entries(COUNTRY_FLAGS)) {
    if (country.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(country.toLowerCase())) {
      return flag;
    }
  }
  return country.substring(0, 2).toUpperCase();
};

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentType>('bank_transfer');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [settingAccount, setSettingAccount] = useState<{ 
    method: PaymentMethodType; 
    account?: PaymentAccount | null;
  } | null>(null);
  const [showSettingModal, setShowSettingModal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, [filter]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      let url = '/api/admin/payment/accounts';
      if (filter === 'bank_transfer') {
        url = '/api/admin/payment/accounts?method=tt';
      } else if (filter === 'qr_code') {
        url = '/api/admin/payment/accounts?method=wechat,alipay';
      } else if (filter === 'online_payment') {
        url = '/api/admin/payment/accounts?method=paypal';
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data);
      } else {
        setToast({ message: data.error || '加载失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '加载失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // ✅ 生成分享链接
  const handleGenerateShareLink = async (accountId: string) => {
    try {
      const res = await fetch(`/api/admin/payment/accounts/${accountId}/actions?action=share`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        await navigator.clipboard.writeText(data.data.url);
        setToast({ message: '分享链接已复制', type: 'success' });
        await loadAccounts();
      } else {
        setToast({ message: data.error || '生成分享链接失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '生成分享链接失败', type: 'error' });
    }
  };

  // ✅ 分享全部收款账户
  const handleShareAll = () => {
    const locale = document.documentElement.lang || 'zh';
    const url = `${window.location.origin}/en/payment/account/share`;
    window.open(url, '_blank');
  };

  const getPresetAccount = (method: PaymentMethodType) => {
    return accounts.find(acc => acc.payment_method === method) || null;
  };

  const openSetting = (method: PaymentMethodType) => {
    const account = getPresetAccount(method);
    setSettingAccount({ method, account });
    setShowSettingModal(true);
  };

  const handleClearPreset = async (method: PaymentMethodType) => {
    const account = getPresetAccount(method);
    if (!account) {
      setToast({ message: '该账号尚未配置', type: 'error' });
      return;
    }
    if (!confirm(`确定要清空 ${PRESET_ACCOUNTS[method].label_zh} 的配置吗？`)) return;
    
    try {
      const res = await fetch(`/api/admin/payment/accounts/${account.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '已清空配置', type: 'success' });
        await loadAccounts();
      } else {
        setToast({ message: data.error || '清空失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '清空失败', type: 'error' });
    }
  };

  const handleSaveSetting = async (data: any) => {
    setSaving(true);
    try {
      const method = settingAccount?.method;
      const existingAccount = getPresetAccount(method!);
      
      let url = '/api/admin/payment/accounts';
      let method2 = 'POST';
      let body = JSON.stringify(data);
      
      if (existingAccount) {
        url = `/api/admin/payment/accounts/${existingAccount.id}`;
        method2 = 'PUT';
      }
      
      const res = await fetch(url, {
        method: method2,
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const result = await res.json();
      if (result.success) {
        setToast({ message: '保存成功', type: 'success' });
        setShowSettingModal(false);
        setSettingAccount(null);
        await loadAccounts();
      } else {
        setToast({ message: result.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该收款账号吗？')) return;
    try {
      const res = await fetch(`/api/admin/payment/accounts/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '删除成功', type: 'success' });
        await loadAccounts();
      } else {
        setToast({ message: data.error || '删除失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '删除失败', type: 'error' });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/payment/accounts/${id}/actions?action=default`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setToast({ message: '已设为默认', type: 'success' });
        await loadAccounts();
      }
    } catch (error) {
      setToast({ message: '设置失败', type: 'error' });
    }
  };

  const getDisplayName = (account: PaymentAccount): string => {
    if (account.display_name_zh) {
      return account.display_name_zh;
    }
    const bankName = (account.beneficiary_bank || '').toLowerCase();
    if (bankName.includes('citi')) {
      return '中国香港(花旗)';
    }
    if (bankName.includes('jpmorgan') || bankName.includes('chase')) {
      return '新加坡(摩根)';
    }
    const beneficiaryName = (account.beneficiary_name || '').toLowerCase();
    if (beneficiaryName.includes('feisman') || beneficiaryName.includes('citi')) {
      return '中国香港(花旗)';
    }
    if (beneficiaryName.includes('abc') || beneficiaryName.includes('trading')) {
      return '新加坡(摩根)';
    }
    if (account.display_name_en) {
      return account.display_name_en;
    }
    return '未命名';
  };

  // ✅ 使用统一配置的 getBankLogo
  const getBankLogo = (account: PaymentAccount): string => {
    // 优先使用 display_name_zh 匹配
    if (account.display_name_zh && BANK_LOGOS[account.display_name_zh]) {
      return BANK_LOGOS[account.display_name_zh];
    }
    // 使用统一配置的 getBankLogo 函数
    return getBankLogoFromConfig(account);
  };

  const shouldShowCountryIcon = (account: PaymentAccount): boolean => {
    const logo = getBankLogo(account);
    return logo === DEFAULT_LOGO;
  };

  // ============================================================
  // ✅ 扫码支付卡片（微信/支付宝）
  // ============================================================
  const renderQRCodeCard = (method: PaymentMethodType) => {
    const preset = PRESET_ACCOUNTS[method];
    const account = getPresetAccount(method);
    const isConfigured = !!account;
    const logoUrl = PRESET_LOGOS[method] || DEFAULT_LOGO;

    return (
      <div key={method} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* ✅ 修改：调整容器尺寸为 100x50px，匹配 2:1 比例 */}
          <div 
            className="flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border flex items-center justify-center"
            style={{ width: '100px', height: '50px' }}
          >
            <img 
              src={logoUrl} 
              alt={preset.label_zh}
              style={{
                width: '100%',
                height: '100%',
                objectFit: LOGO_STYLES.objectFit,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_LOGO;
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{preset.label_zh}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {isConfigured ? '✅ 已配置' : '⚠️ 未配置'}
              </span>
            </div>
            {isConfigured && (
              <div className="mt-1 space-y-0.5 text-sm text-gray-600">
                <div><span className="font-medium">收款户名:</span> {account?.account_holder || '-'}</div>
                {method === 'alipay' && (
                  <div><span className="font-medium">账号:</span> {account?.account_identifier || '-'}</div>
                )}
              </div>
            )}
          </div>

          {isConfigured && account?.qr_code_image && (
            <div className="flex-shrink-0">
              <img 
                src={account.qr_code_image} 
                alt="收款码"
                className="w-14 h-14 object-contain border rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}

          <div className="flex gap-1 flex-shrink-0">
            {isConfigured && (
              <button
                onClick={() => handleGenerateShareLink(account!.id)}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                title="生成分享链接"
              >
                <Share2 size={16} />
              </button>
            )}
            <button
              onClick={() => openSetting(method)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
              title="设置"
            >
              <Settings size={16} />
            </button>
            {isConfigured && (
              <button
                onClick={() => handleClearPreset(method)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                title="清空配置"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================
  // ✅ 在线支付卡片（PayPal）
  // ============================================================
  const renderOnlineCard = (method: PaymentMethodType) => {
    const preset = PRESET_ACCOUNTS[method];
    const account = getPresetAccount(method);
    const isConfigured = !!account;
    const logoUrl = PRESET_LOGOS[method] || DEFAULT_LOGO;

    return (
      <div key={method} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4">
          {/* ✅ 修改：调整容器尺寸为 100x50px，匹配 2:1 比例 */}
          <div 
            className="flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border flex items-center justify-center"
            style={{ width: '100px', height: '50px' }}
          >
            <img 
              src={logoUrl} 
              alt={preset.label_zh}
              style={{
                width: '100%',
                height: '100%',
                objectFit: LOGO_STYLES.objectFit,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = DEFAULT_LOGO;
              }}
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{preset.label_zh}</h3>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                {isConfigured ? '✅ 已配置' : '⚠️ 未配置'}
              </span>
            </div>
            {isConfigured && (
              <div className="mt-1 text-sm text-gray-600">
                <span className="font-medium">Email:</span> {account?.paypal_email || '-'}
              </div>
            )}
          </div>

          <div className="flex gap-1 flex-shrink-0">
            {isConfigured && (
              <button
                onClick={() => handleGenerateShareLink(account!.id)}
                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                title="生成分享链接"
              >
                <Share2 size={16} />
              </button>
            )}
            <button
              onClick={() => openSetting(method)}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
              title="设置"
            >
              <Settings size={16} />
            </button>
            {isConfigured && (
              <button
                onClick={() => handleClearPreset(method)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                title="清空配置"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // T/T银行卡片
  const renderTTAccountCard = (account: PaymentAccount) => {
    const displayName = getDisplayName(account);
    const currencyDisplay = Array.isArray(account.currency) 
      ? account.currency.join(', ') 
      : account.currency || 'All';
    const bankLogo = getBankLogo(account);
    const typeDisplay = getAccountTypeDisplay(account.account_type);
    const showCountryIcon = shouldShowCountryIcon(account);
    const isDomestic = account.account_type === 'domestic';

    return (
      <div key={account.id} className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start gap-4">
          {/* ✅ 修改：调整容器尺寸为 100x50px，匹配 2:1 比例 */}
          <div 
            className="flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 border flex items-center justify-center"
            style={{ width: '100px', height: '50px' }}
          >
            {showCountryIcon ? (
              <span className="text-xl font-bold">
                {getCountryDisplay(account.country_region || '')}
              </span>
            ) : (
              <img 
                src={bankLogo} 
                alt={displayName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: LOGO_STYLES.objectFit,
                }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_LOGO;
                }}
              />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-semibold">{displayName}</h3>
              {typeDisplay && (
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${typeDisplay.color}`}>
                  {typeDisplay.icon}
                  {typeDisplay.label}
                </span>
              )}
              {account.is_default && (
                <span className="inline-flex items-center gap-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                  <Star size={12} /> 默认
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <div><span className="font-medium">Beneficiary Name:</span> {account.beneficiary_name}</div>
              <div><span className="font-medium">Account:</span> {account.beneficiary_account}</div>
              {!isDomestic && (
                <div><span className="font-medium">Swift:</span> {account.swift_code}</div>
              )}
              <div><span className="font-medium">Country:</span> {account.country_region}</div>
              <div><span className="font-medium">Currency:</span> {currencyDisplay}</div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {!account.is_default && (
              <button onClick={() => handleSetDefault(account.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="设为默认">
                <Star size={16} />
              </button>
            )}
            <button 
              onClick={() => handleGenerateShareLink(account.id)} 
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded" 
              title="生成分享链接"
            >
              <Share2 size={16} />
            </button>
            <button 
              onClick={() => window.open(`/api/admin/payment/accounts/${account.id}/pdf`, '_blank')} 
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded" 
              title="下载PDF"
            >
              <Download size={16} />
            </button>
            <button onClick={() => router.push(`/admin/payment/accounts/${account.id}/edit`)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="编辑">
              <Edit size={16} />
            </button>
            <button onClick={() => handleDelete(account.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="删除">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {account.attention && (
          <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 p-2 rounded border border-yellow-200">
            ⚠️ {account.attention}
          </div>
        )}
      </div>
    );
  };

  // 渲染设置弹窗
  const renderSettingModal = () => {
    if (!settingAccount) return null;
    const { method, account } = settingAccount;
    const preset = PRESET_ACCOUNTS[method];
    const isPayPal = method === 'paypal';

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center p-4 border-b">
            <h2 className="text-xl font-bold">设置 {preset.label_zh}</h2>
            <button onClick={() => setShowSettingModal(false)} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {isPayPal ? (
              <PayPalAccountForm
                initialData={account || { payment_method: 'paypal' }}
                onSubmit={handleSaveSetting}
                saving={saving}
                onCancel={() => setShowSettingModal(false)}
              />
            ) : (
              <QRCodeAccountForm
                initialData={account || { payment_method: method }}
                onSubmit={handleSaveSetting}
                saving={saving}
                onCancel={() => setShowSettingModal(false)}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const paymentTypes: PaymentType[] = ['bank_transfer', 'qr_code', 'online_payment'];

  const renderAccounts = () => {
    if (loading) {
      return <div className="text-center py-12 text-gray-500">加载中...</div>;
    }

    if (filter === 'bank_transfer') {
      if (accounts.length === 0) {
        return (
          <div className="text-center py-12 text-gray-500">
            <p>暂无T/T银行收款账号</p>
            <button
              onClick={() => router.push('/admin/payment/accounts/create?type=tt')}
              className="mt-2 text-blue-600 hover:underline"
            >
              添加第一个T/T银行账号
            </button>
          </div>
        );
      }
      return <div className="space-y-4">{accounts.map(renderTTAccountCard)}</div>;
    }

    if (filter === 'qr_code') {
      return (
        <div className="space-y-4">
          {renderQRCodeCard('wechat')}
          {renderQRCodeCard('alipay')}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderOnlineCard('paypal')}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">收款账号管理</h1>
        <div className="flex gap-2">
          <button
            onClick={handleShareAll}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200 flex items-center gap-2"
          >
            <Share2 size={18} /> 分享收款账户
          </button>
          {filter === 'bank_transfer' && (
            <button
              onClick={() => router.push('/admin/payment/accounts/create?type=tt')}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={18} /> 添加T/T银行账号
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {paymentTypes.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded text-sm flex items-center gap-1.5 ${
              filter === type ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {PAYMENT_TYPE_ICONS[type]}
            {PAYMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      {renderAccounts()}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {showSettingModal && renderSettingModal()}
    </div>
  );
}