// app/admin/payment/accounts/components/AccountForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { 
  AccountType, 
  AccountTemplate,
  CreateAccountInput,
  PaymentMethodType,
} from '@/lib/payment/types/account';
import { 
  ACCOUNT_TEMPLATES, 
  CURRENCY_OPTIONS,
  getTemplatesByType,
  getTemplateByValue,
} from '@/lib/payment/types/account';

interface AccountFormProps {
  initialData?: Partial<CreateAccountInput>;
  onSubmit: (data: CreateAccountInput) => void;
  saving?: boolean;
}

export function AccountForm({ initialData, onSubmit, saving = false }: AccountFormProps) {
  const router = useRouter();

  const [accountType, setAccountType] = useState<AccountType>(
    initialData?.account_type || 'global'
  );

  const [selectedTemplate, setSelectedTemplate] = useState<string>(
    initialData?.template_key || 
    (initialData?.account_type === 'domestic' ? 'cn_bank' : 'citi_hk')
  );

  // 判断是否为国内银行
  const isDomestic = accountType === 'domestic';

  const [formData, setFormData] = useState<CreateAccountInput>({
    account_type: initialData?.account_type || 'global',
    payment_type: initialData?.payment_type || 'bank_transfer',
    payment_method: initialData?.payment_method || 'tt',
    display_name_zh: initialData?.display_name_zh || '',
    display_name_en: initialData?.display_name_en || '',
    currency: initialData?.currency || ['CNY'],
    is_default: initialData?.is_default || false,
    beneficiary_name: initialData?.beneficiary_name || '',
    beneficiary_account: initialData?.beneficiary_account || '',
    country_region: initialData?.country_region || '',
    swift_code: initialData?.swift_code || '',
    beneficiary_address: initialData?.beneficiary_address || '',
    beneficiary_bank: initialData?.beneficiary_bank || '',
    beneficiary_bank_address: initialData?.beneficiary_bank_address || '',
    bank_code: initialData?.bank_code || '',
    branch_code: initialData?.branch_code || '',
    iban: initialData?.iban || '',
    attention: initialData?.attention || '',
    intermediary_bank: initialData?.intermediary_bank || '',
    account_holder: '',
    account_identifier: '',
    qr_code_image: '',
    remark: '',
  });

  useEffect(() => {
    // 当账号类型变化时，自动选择对应的第一个模板
    const templates = getTemplatesByType(accountType);
    if (templates.length > 0) {
      const firstTemplate = templates[0];
      setSelectedTemplate(firstTemplate.value);
      applyTemplate(firstTemplate);
    }
  }, [accountType]);

  const handleAccountTypeChange = (type: AccountType) => {
    setAccountType(type);
    setFormData(prev => ({ ...prev, account_type: type }));
  };

  const applyTemplate = (template: AccountTemplate) => {
    setFormData(prev => ({
      ...prev,
      display_name_zh: template.label_zh,
      display_name_en: template.label_en,
      country_region: template.country,
      beneficiary_bank: template.bank,
      beneficiary_bank_address: template.bank_address,
      bank_code: template.bank_code,
      branch_code: template.branch_code,
      swift_code: template.swift,
    }));
  };

  const handleTemplateChange = (templateValue: string) => {
    setSelectedTemplate(templateValue);
    const template = getTemplateByValue(templateValue);
    if (template) {
      applyTemplate(template);
    }
  };

  const handleCurrencyToggle = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      currency: prev.currency.includes(currency)
        ? prev.currency.filter(c => c !== currency)
        : [...prev.currency, currency],
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证必填字段
    if (!formData.beneficiary_name) {
      alert('请填写 Beneficiary Name');
      return;
    }
    if (!formData.beneficiary_account) {
      alert('请填写 Beneficiary Account Number');
      return;
    }
    if (!formData.country_region) {
      alert('请填写 Country/Region');
      return;
    }
    if (!formData.beneficiary_bank) {
      alert('请填写 Beneficiary Bank');
      return;
    }
    if (formData.currency.length === 0) {
      alert('请至少选择一种货币');
      return;
    }

    // 国内银行不需要 Swift Code，但为了兼容，如果为空则传空字符串
    const submitData = {
      ...formData,
      swift_code: formData.swift_code || '',
      beneficiary_address: formData.beneficiary_address || '',
      beneficiary_bank_address: formData.beneficiary_bank_address || '',
      bank_code: formData.bank_code || '',
      branch_code: formData.branch_code || '',
      iban: formData.iban || '',
      attention: formData.attention || '',
      intermediary_bank: formData.intermediary_bank || '',
    };
    
    onSubmit(submitData);
  };

  const templates = getTemplatesByType(accountType);

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl">
      <div className="bg-white border rounded-lg p-6 shadow-sm space-y-6">
        {/* 账号类型 */}
        <div>
          <label className="block font-medium mb-2">账号类型 *</label>
          <div className="flex gap-4 flex-wrap">
            <button
              type="button"
              onClick={() => handleAccountTypeChange('global')}
              className={`px-4 py-2 rounded-lg border ${
                accountType === 'global'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              全球收款账号
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('local')}
              className={`px-4 py-2 rounded-lg border ${
                accountType === 'local'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              本地收款账号
            </button>
            <button
              type="button"
              onClick={() => handleAccountTypeChange('domestic')}
              className={`px-4 py-2 rounded-lg border ${
                accountType === 'domestic'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-gray-300 hover:bg-gray-50'
              }`}
            >
              中国国内银行
            </button>
          </div>
        </div>

        {/* 显示名称 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">显示名称 (中文) *</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {templates.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label_zh}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">显示名称 (英文) *</label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              {templates.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label_en}
                </option>
              ))}
            </select>
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

        {/* 银行账户信息 */}
        <div className="border-t pt-4">
          <h3 className="font-medium mb-3 text-gray-700">银行账户信息</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Beneficiary Name - 所有类型都显示 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Beneficiary Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.beneficiary_name}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_name: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder="ABC Trading Company Limited（示例）"
                required
              />
            </div>

            {/* Beneficiary Account Number - 所有类型都显示 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Beneficiary Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.beneficiary_account}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_account: e.target.value }))}
                className="w-full border rounded px-3 py-2 font-mono"
                placeholder="1234567890（示例）"
                required
              />
            </div>

            {/* Country/Region - 所有类型都显示 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Country/Region <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country_region}
                onChange={(e) => setFormData(prev => ({ ...prev, country_region: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder={isDomestic ? "China" : "Hong Kong"}
                required
              />
            </div>

            {/* Beneficiary Bank - 所有类型都显示 */}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">
                Beneficiary Bank <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.beneficiary_bank}
                onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_bank: e.target.value }))}
                className="w-full border rounded px-3 py-2"
                placeholder={isDomestic ? "中国工商银行" : "CITIBANK N.A.HONG KONG BRANCH"}
                required
              />
            </div>

            {/* ✅ 国内银行：只显示 Attention */}
            {isDomestic ? (
              // ===== 国内银行：只显示 Attention =====
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Attention / 注意事项</label>
                <textarea
                  value={formData.attention || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, attention: e.target.value }))}
                  rows={3}
                  className="w-full border rounded px-3 py-2"
                  placeholder="请输入注意事项（可选）"
                />
              </div>
            ) : (
              // ===== 国际银行：显示所有字段 =====
              <>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Swift Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.swift_code}
                    onChange={(e) => setFormData(prev => ({ ...prev, swift_code: e.target.value.toUpperCase() }))}
                    className="w-full border rounded px-3 py-2 font-mono uppercase"
                    placeholder="CITIHKHX"
                    required={!isDomestic}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Code</label>
                  <input
                    type="text"
                    value={formData.bank_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, bank_code: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="006"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Beneficiary Address</label>
                  <input
                    type="text"
                    value={formData.beneficiary_address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_address: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="20/F, TOWER ONE, TIMES SQUARE, 1 MATHESON STREET, CAUSEWAY BAY, HONG KONG"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Beneficiary Bank Address</label>
                  <input
                    type="text"
                    value={formData.beneficiary_bank_address || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, beneficiary_bank_address: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Champion Tower THREE Garden ROAD CENTRAL, HONG KONG"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Branch Code</label>
                  <input
                    type="text"
                    value={formData.branch_code || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, branch_code: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="391"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">IBAN</label>
                  <input
                    type="text"
                    value={formData.iban || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, iban: e.target.value }))}
                    className="w-full border rounded px-3 py-2 font-mono"
                    placeholder="IBAN (如有)"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Attention / 注意事项</label>
                  <textarea
                    value={formData.attention || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, attention: e.target.value }))}
                    rows={3}
                    className="w-full border rounded px-3 py-2"
                    placeholder="Please pay attention to fill in the correct Beneficiary Account Number..."
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">Intermediary Bank</label>
                  <input
                    type="text"
                    value={formData.intermediary_bank || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, intermediary_bank: e.target.value }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="中间行 (如有)"
                  />
                </div>
              </>
            )}
          </div>
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
            onClick={() => router.back()}
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
      </div>
    </form>
  );
}