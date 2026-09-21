// app/admin/payment/accounts/components/QRCodeAccountForm.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ImageUpload from '@/components/ImageUpload';
import type { CreateAccountInput, PaymentMethodType } from '@/lib/payment/types/account';
import { CURRENCY_OPTIONS, PRESET_ACCOUNTS } from '@/lib/payment/types/account';

// ✅ 预设账号Logo映射
const PRESET_LOGOS: Record<string, string> = {
  wechat: '/share/wechat.png',
  alipay: '/share/alipay.png',
  paypal: '/share/paypal.png',
};

interface QRCodeAccountFormProps {
  initialData?: Partial<CreateAccountInput>;
  onSubmit: (data: CreateAccountInput) => void;
  onCancel?: () => void;
  saving?: boolean;
}

export default function QRCodeAccountForm({
  initialData,
  onSubmit,
  onCancel,
  saving = false,
}: QRCodeAccountFormProps) {
  const router = useRouter();
  const paymentMethod = (initialData?.payment_method || 'wechat') as 'wechat' | 'alipay';
  const preset = PRESET_ACCOUNTS[paymentMethod];
  const logoUrl = PRESET_LOGOS[paymentMethod] || '/share/default-bank.png';

  // ✅ 微信/支付宝默认为 domestic（中国国内银行）
  const defaultAccountType = 'domestic';

  const [formData, setFormData] = useState<CreateAccountInput>({
    account_type: initialData?.account_type || defaultAccountType,
    payment_type: initialData?.payment_type || 'qr_code',
    payment_method: initialData?.payment_method || paymentMethod,
    display_name_zh: initialData?.display_name_zh || preset.default_display_name_zh,
    display_name_en: initialData?.display_name_en || preset.default_display_name_en,
    currency: initialData?.currency || ['CNY'],
    is_default: initialData?.is_default || false,
    account_holder: initialData?.account_holder || '',
    account_identifier: initialData?.account_identifier || '',
    qr_code_image: initialData?.qr_code_image || '',
    remark: initialData?.remark || '',
  });

  const handleCurrencyToggle = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      currency: prev.currency.includes(currency)
        ? prev.currency.filter(c => c !== currency)
        : [...prev.currency, currency],
    }));
  };

  const handleQrCodeUpload = (url: string) => {
    setFormData(prev => ({ ...prev, qr_code_image: url }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.account_holder) {
      alert('请填写收款户名');
      return;
    }

    if (paymentMethod === 'alipay' && !formData.account_identifier) {
      alert('请填写支付宝账号（邮箱或手机号）');
      return;
    }

    if (!formData.qr_code_image) {
      alert('请上传收款码图片');
      return;
    }

    if (formData.currency.length === 0) {
      alert('请至少选择一种货币');
      return;
    }

    onSubmit({
      ...formData,
      account_type: formData.account_type || defaultAccountType,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ✅ 支付方式标识 - 使用图片，宽高比 2:1，宽度100 */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <img 
          src={logoUrl} 
          alt={preset.label_zh}
          className="object-contain"
          style={{ width: '150px', height: '75px' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/share/default-bank.png';
          }}
        />
        <div>
          <h3 className="font-medium text-lg">{preset.label_zh}</h3>
          <p className="text-sm text-gray-500">扫码支付收款账户</p>
        </div>
      </div>

      {/* ❌ 去掉"账号类型 *" - 不显示，默认使用 domestic */}

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
              className={`px-3 py-1 rounded-full text-sm border ${
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

      {/* 账户信息 */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-3 text-gray-700">账户信息</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              收款户名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.account_holder}
              onChange={(e) => setFormData(prev => ({ ...prev, account_holder: e.target.value }))}
              className="w-full border rounded px-3 py-2"
              placeholder="请输入收款户名"
              required
            />
          </div>

          {paymentMethod === 'alipay' && (
            <div>
              <label className="block text-sm font-medium mb-1">
                账号（邮箱或手机号） <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.account_identifier}
                onChange={(e) => setFormData(prev => ({ ...prev, account_identifier: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder="请输入支付宝账号（邮箱或手机号）"
                required
              />
              <p className="text-xs text-gray-400 mt-1">支持邮箱或手机号格式</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">备注</label>
            <textarea
              value={formData.remark || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, remark: e.target.value }))}
              rows={2}
              className="w-full border rounded px-3 py-2"
              placeholder="请输入备注信息（可选）"
            />
          </div>
        </div>
      </div>

      {/* 收款码图片上传 */}
      <div className="border-t pt-4">
        <label className="block text-sm font-medium mb-2">
          收款码图片 <span className="text-red-500">*</span>
        </label>
        {/* ✅ label 设为空字符串，去掉"上传收款码"文字 */}
        <ImageUpload
          value={formData.qr_code_image}
          onChange={handleQrCodeUpload}
          maxCount={1}
          label=""
          hint="支持 JPG、PNG 格式，建议尺寸 300x300px"
        />
        {formData.qr_code_image && (
          <p className="text-xs text-green-600 mt-2">✅ 已上传收款码</p>
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

      {/* 提交按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel || (() => router.back())}
          className="px-4 py-2 border rounded hover:bg-gray-50 transition-colors"
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