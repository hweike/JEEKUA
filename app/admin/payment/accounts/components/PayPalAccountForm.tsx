// app/admin/payment/accounts/components/PayPalAccountForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { CreateAccountInput } from '@/lib/payment/types/account';
import { CURRENCY_OPTIONS, PRESET_ACCOUNTS } from '@/lib/payment/types/account';

// ✅ 预设账号Logo映射
const PRESET_LOGOS: Record<string, string> = {
  wechat: '/share/wechat.png',
  alipay: '/share/alipay.png',
  paypal: '/share/paypal.png',
};

interface PayPalAccountFormProps {
  initialData?: Partial<CreateAccountInput & { id?: string; is_verified?: boolean }>;
  onSubmit: (data: CreateAccountInput) => void;
  onCancel?: () => void;
  saving?: boolean;
}

export default function PayPalAccountForm({
  initialData,
  onSubmit,
  onCancel,
  saving = false,
}: PayPalAccountFormProps) {
  const router = useRouter();
  const paymentMethod = 'paypal';
  const preset = PRESET_ACCOUNTS[paymentMethod];
  const logoUrl = PRESET_LOGOS[paymentMethod] || '/share/default-bank.png';

  // ✅ PayPal 默认为 global
  const defaultAccountType = 'global';

  // ✅ 状态管理
  const [formData, setFormData] = useState<CreateAccountInput & { id?: string; is_verified?: boolean }>({
    id: initialData?.id || '',
    account_type: initialData?.account_type || defaultAccountType,
    payment_type: initialData?.payment_type || 'online_payment',
    payment_method: initialData?.payment_method || 'paypal',
    display_name_zh: initialData?.display_name_zh || preset.default_display_name_zh,
    display_name_en: initialData?.display_name_en || preset.default_display_name_en,
    currency: initialData?.currency || ['USD'],
    is_default: initialData?.is_default || false,
    is_verified: initialData?.is_verified || false,
    paypal_email: initialData?.paypal_email || '',
    paypal_client_id: initialData?.paypal_client_id || '',
    paypal_client_secret: initialData?.paypal_client_secret || '',
    paypal_webhook_id: initialData?.paypal_webhook_id || '',
  });

  // ✅ 验证状态
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{
    success: boolean;
    message: string;
    account_email?: string;
    environment?: string;
  } | null>(null);

  // ✅ Toast 状态
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ✅ 判断是否已认证
  const isVerified = formData.is_verified || false;

  // ✅ 当 client_id 或 client_secret 变化时，清除验证状态
  const handleClientIdChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      paypal_client_id: value,
      is_verified: false,
    }));
    setVerifyResult(null);
  };

  const handleClientSecretChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      paypal_client_secret: value,
      is_verified: false,
    }));
    setVerifyResult(null);
  };

  const handleCurrencyToggle = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      currency: prev.currency.includes(currency)
        ? prev.currency.filter(c => c !== currency)
        : [...prev.currency, currency],
    }));
  };

  // ✅ 验证 PayPal 连接
  const handleVerify = async () => {
    const clientId = formData.paypal_client_id?.trim();
    const clientSecret = formData.paypal_client_secret?.trim();

    if (!clientId || !clientSecret) {
      setVerifyResult({
        success: false,
        message: '请先填写 Client ID 和 Client Secret',
      });
      return;
    }

    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch('/api/admin/payment/paypal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          webhook_id: formData.paypal_webhook_id,
          // ✅ 传递 account_id 用于更新数据库
          account_id: formData.id,
        }),
      });

      const data = await res.json();

      if (data.success && data.data) {
        setVerifyResult({
          success: true,
          message: '✅ PayPal 连接验证成功！',
          account_email: data.data.account?.email,
          environment: data.data.environment,
        });
        // ✅ 更新验证状态
        setFormData(prev => ({
          ...prev,
          is_verified: true,
        }));
        setToast({ message: '验证成功！', type: 'success' });
      } else {
        setVerifyResult({
          success: false,
          message: data.error || '验证失败，请检查配置',
        });
        setFormData(prev => ({
          ...prev,
          is_verified: false,
        }));
        setToast({ message: data.error || '验证失败', type: 'error' });
      }
    } catch (error: any) {
      setVerifyResult({
        success: false,
        message: error.message || '验证请求失败',
      });
      setFormData(prev => ({
        ...prev,
        is_verified: false,
      }));
      setToast({ message: error.message || '验证请求失败', type: 'error' });
    } finally {
      setVerifying(false);
    }
  };

  // ✅ 重置验证状态
  const handleResetVerification = async () => {
    if (!formData.id) {
      setToast({ message: '请先保存账号后再重置验证', type: 'error' });
      return;
    }

    if (!confirm('确定要重置验证状态吗？重置后需要重新验证 PayPal 连接。')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/payment/paypal/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: formData.id,
          action: 'reset',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({
          ...prev,
          is_verified: false,
        }));
        setVerifyResult({
          success: false,
          message: '验证状态已重置，请重新验证',
        });
        setToast({ message: '验证状态已重置', type: 'success' });
      } else {
        setToast({ message: data.error || '重置失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '重置失败', type: 'error' });
    }
  };

  // ✅ 清空验证状态（当修改配置时自动触发）
  const clearVerification = () => {
    if (isVerified) {
      setFormData(prev => ({
        ...prev,
        is_verified: false,
      }));
      setVerifyResult(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.paypal_email) {
      alert('请填写 PayPal Email');
      return;
    }

    if (formData.currency.length === 0) {
      alert('请至少选择一种货币');
      return;
    }

    // ✅ 提交时包含验证状态
    const submitData: CreateAccountInput = {
      account_type: formData.account_type || defaultAccountType,
      payment_type: formData.payment_type,
      payment_method: formData.payment_method,
      display_name_zh: formData.display_name_zh,
      display_name_en: formData.display_name_en,
      currency: formData.currency,
      is_default: formData.is_default,
      is_verified: formData.is_verified,
      paypal_email: formData.paypal_email,
      paypal_client_id: formData.paypal_client_id,
      paypal_client_secret: formData.paypal_client_secret,
      paypal_webhook_id: formData.paypal_webhook_id,
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 支付方式标识 */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <img 
          src={logoUrl} 
          alt={preset.label_zh}
          className="object-contain"
          style={{ width: '100px', height: '50px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/share/default-bank.png';
          }}
        />
        <div>
          <h3 className="font-medium text-lg">{preset.label_zh}</h3>
          <p className="text-sm text-gray-500">在线支付收款账户 - 商家代客下单</p>
        </div>
      </div>

      {/* 显示名称 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">显示名称 (中文) *</label>
          <input
            type="text"
            value={formData.display_name_zh}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name_zh: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder={preset.default_display_name_zh}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">显示名称 (英文) *</label>
          <input
            type="text"
            value={formData.display_name_en}
            onChange={(e) => setFormData(prev => ({ ...prev, display_name_en: e.target.value }))}
            className="w-full border rounded px-3 py-2"
            placeholder={preset.default_display_name_en}
            required
          />
        </div>
      </div>

      {/* 货币多选 */}
      <div>
        <label className="block text-sm font-medium mb-2">支持货币 *</label>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_OPTIONS.map((c) => (
            <button
              type="button"
              key={c.value}
              onClick={() => handleCurrencyToggle(c.value)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                formData.currency.includes(c.value)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          已选: {formData.currency.join(', ') || '未选择'}
        </p>
      </div>

      {/* PayPal 配置 */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-gray-700">PayPal API 配置</h3>
          {/* ✅ 认证状态显示 */}
          <div className="flex items-center gap-2">
            {isVerified ? (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle size={14} /> 已认证
              </span>
            ) : (
              <span className="text-sm text-yellow-600 flex items-center gap-1">
                <AlertCircle size={14} /> 未验证
              </span>
            )}
            {verifyResult?.environment && (
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                {verifyResult.environment === 'sandbox' ? '沙箱' : '生产'}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              PayPal Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.paypal_email}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, paypal_email: e.target.value }));
                // 修改邮箱时不清除验证状态（因为邮箱是展示字段，不影响 API 验证）
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="seller@example.com"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              用于接收 PayPal 支付通知，也是客户看到的收款方邮箱
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Client ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.paypal_client_id || ''}
                onChange={(e) => {
                  handleClientIdChange(e.target.value);
                  clearVerification();
                }}
                className={`w-full border rounded px-3 py-2 font-mono text-sm ${
                  isVerified ? 'bg-gray-50 text-gray-500' : ''
                }`}
                placeholder="请输入 Client ID"
                required
                readOnly={isVerified}
                title={isVerified ? '已认证，如需修改请先重置验证' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Client Secret <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                value={formData.paypal_client_secret || ''}
                onChange={(e) => {
                  handleClientSecretChange(e.target.value);
                  clearVerification();
                }}
                className={`w-full border rounded px-3 py-2 font-mono text-sm ${
                  isVerified ? 'bg-gray-50 text-gray-500' : ''
                }`}
                placeholder="请输入 Client Secret"
                required
                readOnly={isVerified}
                title={isVerified ? '已认证，如需修改请先重置验证' : ''}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Webhook ID</label>
            <input
              type="text"
              value={formData.paypal_webhook_id || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, paypal_webhook_id: e.target.value }))}
              className="w-full border rounded px-3 py-2 font-mono text-sm"
              placeholder="请输入 Webhook ID（可选）"
            />
            <p className="text-xs text-gray-400 mt-1">
              用于接收支付状态回调通知
            </p>
          </div>
        </div>
      </div>

      {/* ✅ 验证结果 */}
      {verifyResult && (
        <div className={`p-3 rounded-lg border ${
          verifyResult.success 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {verifyResult.success ? (
              <CheckCircle size={18} className="text-green-600" />
            ) : (
              <XCircle size={18} className="text-red-600" />
            )}
            <span className={verifyResult.success ? 'text-green-700' : 'text-red-700'}>
              {verifyResult.message}
            </span>
          </div>
          {verifyResult.success && verifyResult.account_email && (
            <p className="text-sm text-gray-600 mt-1">
              📧 关联账户: {verifyResult.account_email}
            </p>
          )}
        </div>
      )}

      {/* ✅ 验证按钮 + 重置按钮 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying || saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          {verifying ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              验证中...
            </>
          ) : isVerified ? (
            <>
              <RefreshCw size={16} />
              重新验证
            </>
          ) : (
            <>
              🔗 验证连接
            </>
          )}
        </button>
        
        {/* ✅ 重置验证按钮（仅在已认证时显示） */}
        {isVerified && formData.id && (
          <button
            type="button"
            onClick={handleResetVerification}
            className="text-sm text-red-600 hover:text-red-700 hover:underline px-2 py-1"
            disabled={verifying || saving}
          >
            重置验证
          </button>
        )}
        
        {isVerified && (
          <span className="text-xs text-gray-400">
            Client ID 和 Secret 已锁定，如需修改请先"重置验证"
          </span>
        )}
      </div>

      {/* 设为默认 */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_default"
          checked={formData.is_default}
          onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
          className="w-4 h-4"
        />
        <label htmlFor="is_default" className="text-sm text-gray-700">设为默认收款账号</label>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className={`p-3 rounded-lg border ${
          toast.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel || (() => router.back())}
          className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
          disabled={saving}
        >
          取消
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  );
}