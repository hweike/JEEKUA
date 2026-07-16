'use client';

import { useState, useEffect, useRef } from 'react';
import { provinces } from '@/lib/Basicsettings/provinces';
import { validatePhone } from '@/lib/Basicsettings/validation';

interface Settings {
  siteName: string;
  websiteUrl: string;
  defaultLocale: string;        // 新增
  targetAudience: string;        // 新增
  contactEmail: string;
  contactPhone: string;
  companyName: string;
  country: string;
  registeredAddress: string;
  city: string;
  province: string;
  postalCode: string;
  brand: string[];
}

// TagsInput 组件（不变）
function TagsInput({ value, onChange, placeholder }: { value: string[]; onChange: (tags: string[]) => void; placeholder?: string }) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!value.includes(inputValue.trim())) {
        onChange([...value, inputValue.trim()]);
      }
      setInputValue('');
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-300 rounded-md p-2 focus-within:ring-1 focus-within:ring-blue-500">
      <div className="flex flex-wrap gap-2 mb-1">
        {value.map((tag, idx) => (
          <span key={idx} className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(idx)}
              className="text-gray-500 hover:text-red-500 focus:outline-none"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || '输入品牌后按回车添加'}
        className="w-full outline-none bg-transparent"
      />
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  return (
    <div className={`fixed top-4 right-4 z-50 ${bgColor} text-white px-4 py-2 rounded-md shadow-lg`}>
      {message}
    </div>
  );
}

export default function BasicSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings/basic', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('加载失败');
        return res.json();
      })
      .then(data => {
        setSettings({
          ...data,
          websiteUrl: data.websiteUrl || '',
          defaultLocale: data.defaultLocale || 'en',
          targetAudience: data.targetAudience || '',
          brand: Array.isArray(data.brand) ? data.brand : [],
        });
        setLoading(false);
      })
      .catch(err => {
        setToast({ message: err.message, type: 'error' });
        setLoading(false);
      });
  }, []);

  const handleChange = (field: keyof Settings, value: any) => {
    if (settings) setSettings({ ...settings, [field]: value });
  };

  const validateForm = (): string | null => {
    if (!settings?.siteName?.trim()) return '网站名称不能为空';
    const url = settings.websiteUrl?.trim();
    if (!url) return '网址不能为空';
    if (!/^https?:\/\/.+/.test(url)) return '网址必须以 http:// 或 https:// 开头';
    if (settings.contactEmail?.trim() && !/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(settings.contactEmail)) {
      return '邮箱格式不正确';
    }
    if (settings.contactPhone?.trim() && !validatePhone(settings.contactPhone)) {
     return '电话格式不正确（请填写国内手机/固话或国际号码）';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      setToast({ message: error, type: 'error' });
      return;
    }
    if (!settings) return;
    setSaving(true);
    setToast(null);

    const res = await fetch('/api/admin/settings/basic', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (res.ok) {
      setToast({ message: '保存成功', type: 'success' });
    } else {
      setToast({ message: data.error || '保存失败', type: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6">加载中...</div>;
  if (!settings) return <div className="p-6 text-red-600">加载失败，请刷新重试</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">基本设置</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 卡片1：网站信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">网站信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                网站名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={e => handleChange('siteName', e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="请输入网站名称"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                网址 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.websiteUrl || ''}
                onChange={e => handleChange('websiteUrl', e.target.value)}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="https://www.example.com"
              />
              <p className="text-xs text-gray-500 mt-1">必须以 http:// 或 https:// 开头</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">默认语言</label>
              <input
                type="text"
                value={settings.defaultLocale || 'en'}
                onChange={e => handleChange('defaultLocale', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="例如: en, zh"
              />
              <p className="text-xs text-gray-500 mt-1">建议使用 ISO 639-1 语言代码（如 en, zh）</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">目标受众</label>
              <textarea
                value={settings.targetAudience || ''}
                onChange={e => handleChange('targetAudience', e.target.value)}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="描述网站的目标受众群体，例如：B2B 电源制造商、工程师..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">销售品牌</label>
              <TagsInput
                value={settings.brand}
                onChange={(tags) => handleChange('brand', tags)}
                placeholder="输入品牌后按回车添加"
              />
              <p className="text-xs text-gray-500 mt-1">可添加多个品牌，每个品牌按回车确认</p>
            </div>
          </div>
        </div>

        {/* 卡片2：商务联系方式（不变） */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">商务联系方式</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">电子邮件（可选）</label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={e => handleChange('contactEmail', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                placeholder="example@domain.com"
              />
            </div>
          <div>
          <label className="block text-sm font-medium text-gray-700">联系电话（可选）</label>
          <input
            type="tel"
            value={settings.contactPhone}
            onChange={e => handleChange('contactPhone', e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            placeholder="手机、固话或国际电话（含区号）"
          />
          </div>  
          </div>
        </div>

        {/* 卡片3：公司信息（修正省份下拉框） */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">公司信息</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">公司名称（可选）</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={e => handleChange('companyName', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">国家/地区</label>
              <input
                type="text"
                value="China"
                disabled
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">注册地址（可选）</label>
              <input
                type="text"
                value={settings.registeredAddress}
                onChange={e => handleChange('registeredAddress', e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">省份（可选）</label>
                <select
                  value={settings.province}
                  onChange={e => handleChange('province', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                >
                  <option value="">请选择省份</option>
                  {provinces.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">城市（可选）</label>
                <input
                  type="text"
                  value={settings.city}
                  onChange={e => handleChange('city', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">邮编（可选）</label>
                <input
                  type="text"
                  value={settings.postalCode}
                  onChange={e => handleChange('postalCode', e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
        </div>
      </form>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}