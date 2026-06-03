'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Save, Copy } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import BasicSettings from './components/BasicSettings';
import AttributeTemplates from './components/AttributeTemplates';

// 与 AttributeTemplates 组件中的类型完全一致
export interface AttributePreset {
  name: string;
  rule: string; // 改为必选 string，匹配组件预期
}

export interface AttributeTemplate {
  id: string;
  name: string;
  attributes: AttributePreset[];
}

export interface DefaultSettings {
  default_min_order_qty: number;
  default_availability: string;
  default_brand: string;
  sku_rule: string;
  default_currency: string;
  default_shipping_cost: number;
  default_return_days: number;
  default_mpn: string;
}

export interface ProductSettings {
  defaultSettings: DefaultSettings | null;
  attributeTemplates: AttributeTemplate[];
}

export const DEFAULT_SETTINGS: DefaultSettings = {
  default_min_order_qty: 1,
  default_availability: 'in_stock',
  default_brand: 'Generic',
  sku_rule: 'P-{timestamp}',
  default_currency: 'USD',
  default_shipping_cost: 0,
  default_return_days: 30,
  default_mpn: '',
};

export default function ProductSettingsPage() {
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncAllLoading, setSyncAllLoading] = useState(false);
  const [initAllLoading, setInitAllLoading] = useState(false);
  const [settings, setSettings] = useState<ProductSettings>({
    defaultSettings: null,
    attributeTemplates: [],
  });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [availableLocales, setAvailableLocales] = useState<string[]>(['zh', 'en']);

  // 获取所有启用的语言站点
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          if (data.length > 0 && typeof data[0] === 'string') {
            setAvailableLocales(data);
          } else {
            const locales = data.map((item: { code: string }) => item.code);
            setAvailableLocales(locales);
          }
        } else if (data && Array.isArray(data.locales)) {
          setAvailableLocales(data.locales);
        } else {
          setAvailableLocales(['zh', 'en']);
        }
      })
      .catch(() => setAvailableLocales(['zh', 'en']));
  }, []);

  const loadSettings = async (lang: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/settings?locale=${lang}`);
      const data = await res.json();
      if (res.ok) {
        setSettings({
          defaultSettings: data.defaultSettings ?? null,
          attributeTemplates: Array.isArray(data.attributeTemplates) ? data.attributeTemplates : [],
        });
      } else {
        setSettings({ defaultSettings: null, attributeTemplates: [] });
      }
    } catch {
      setSettings({ defaultSettings: null, attributeTemplates: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings(locale);
  }, [locale]);

  // 保存当前站点的所有设置
  const saveAll = async () => {
    if (!settings.defaultSettings) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/settings?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultSettings: settings.defaultSettings,
          attributeTemplates: settings.attributeTemplates,
        }),
      });
      if (res.ok) {
        setToast({ message: '保存成功', type: 'success' });
      } else {
        setToast({ message: '保存失败', type: 'error' });
      }
    } catch {
      setToast({ message: '保存失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // 保存当前设置并同步到所有其他站点
  const saveAndSyncAll = async () => {
    if (!settings.defaultSettings) return;
    setSyncAllLoading(true);
    try {
      // 1. 先保存当前站点的设置
      const saveRes = await fetch(`/api/admin/products/settings?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultSettings: settings.defaultSettings,
          attributeTemplates: settings.attributeTemplates,
        }),
      });
      if (!saveRes.ok) {
        throw new Error('保存当前站点设置失败');
      }
      setToast({ message: '当前站点保存成功，正在同步至其他站点...', type: 'success' });

      // 2. 获取当前站点的完整设置数据（用于同步）
      const currentData = {
        defaultSettings: settings.defaultSettings,
        attributeTemplates: settings.attributeTemplates,
      };

      // 3. 同步到其他站点（排除当前语言）
      const otherLocales = availableLocales.filter(lang => lang !== locale);
      if (otherLocales.length === 0) {
        setToast({ message: '没有其他站点需要同步', type: 'success' });
        setSyncAllLoading(false);
        return;
      }

      const results: { locale: string; success: boolean; error?: string }[] = [];
      for (const lang of otherLocales) {
        try {
          const res = await fetch(`/api/admin/products/settings?locale=${lang}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(currentData),
          });
          if (res.ok) {
            results.push({ locale: lang, success: true });
          } else {
            results.push({ locale: lang, success: false, error: `HTTP ${res.status}` });
          }
        } catch (err) {
          results.push({ locale: lang, success: false, error: String(err) });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      if (failCount === 0) {
        setToast({ message: `同步成功！已将当前设置复制到 ${successCount} 个其他站点`, type: 'success' });
      } else {
        setToast({ message: `部分站点同步失败：${successCount} 成功，${failCount} 失败`, type: 'error' });
        console.error('同步失败详情:', results.filter(r => !r.success));
      }

      // 重新加载当前站点设置（确保 UI 刷新）
      await loadSettings(locale);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || '操作失败', type: 'error' });
    } finally {
      setSyncAllLoading(false);
    }
  };

  const resetDefaultSettings = async () => {
    if (!settings.defaultSettings) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/settings?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          defaultSettings: DEFAULT_SETTINGS,
          attributeTemplates: settings.attributeTemplates,
        }),
      });
      if (res.ok) {
        setToast({ message: '重置成功', type: 'success' });
        await loadSettings(locale);
      } else {
        setToast({ message: '重置失败', type: 'error' });
      }
    } catch {
      setToast({ message: '重置失败', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const initAllLocales = async () => {
    console.log('开始初始化所有站点，语言列表:', availableLocales);
    setInitAllLoading(true);
    const results: { locale: string; success: boolean; error?: string }[] = [];

    for (const lang of availableLocales) {
      try {
        let existingTemplates: AttributeTemplate[] = [];
        try {
          const getRes = await fetch(`/api/admin/products/settings?locale=${lang}`, {
            cache: 'no-store',
          });
          if (getRes.ok) {
            const data = await getRes.json();
            if (Array.isArray(data.attributeTemplates)) {
              existingTemplates = data.attributeTemplates;
            }
          }
        } catch (err) {
          console.warn(`获取 ${lang} 现有配置异常:`, err);
        }

        const putRes = await fetch(`/api/admin/products/settings?locale=${lang}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            defaultSettings: DEFAULT_SETTINGS,
            attributeTemplates: existingTemplates,
          }),
        });
        if (!putRes.ok) {
          results.push({ locale: lang, success: false, error: `PUT 失败，状态码 ${putRes.status}` });
          continue;
        }

        const verifyRes = await fetch(`/api/admin/products/settings?locale=${lang}`, {
          cache: 'no-store',
        });
        if (!verifyRes.ok) {
          results.push({ locale: lang, success: false, error: '验证请求失败' });
          continue;
        }
        const verifiedData = await verifyRes.json();
        const savedQty = verifiedData.defaultSettings?.default_min_order_qty;
        if (savedQty === DEFAULT_SETTINGS.default_min_order_qty) {
          results.push({ locale: lang, success: true });
        } else {
          results.push({
            locale: lang,
            success: false,
            error: `保存后验证不一致: 期望 ${DEFAULT_SETTINGS.default_min_order_qty}，实际 ${savedQty}`,
          });
        }
      } catch (err) {
        results.push({ locale: lang, success: false, error: String(err) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    if (failCount === 0) {
      setToast({ message: `所有站点（${results.length} 个）初始化成功`, type: 'success' });
    } else {
      console.error('初始化失败详情:', results.filter(r => !r.success));
      setToast({ message: `${successCount} 个站点成功，${failCount} 个失败，详见控制台`, type: 'error' });
    }

    await loadSettings(locale);
    setInitAllLoading(false);
  };

  const updateDefaultSettings = (newSettings: DefaultSettings) => {
    if (settings.defaultSettings) {
      setSettings(prev => ({ ...prev, defaultSettings: newSettings }));
    }
  };

  const updateAttributeTemplates = (templates: AttributeTemplate[]) => {
    setSettings(prev => ({ ...prev, attributeTemplates: templates }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-4/5 mx-auto bg-white rounded-lg shadow p-6 text-center">加载中...</div>
      </div>
    );
  }

  if (!settings.defaultSettings) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-4/5 mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">基本设置 - {locale.toUpperCase()}</h1>
            <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">当前站点尚无商品默认设置</p>
            <button
              onClick={initAllLocales}
              disabled={initAllLoading}
              className="bg-blue-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
            >
              <RefreshCw size={16} className={initAllLoading ? 'animate-spin' : ''} />
              {initAllLoading ? '初始化中...' : '从样本初始化所有站点'}
            </button>
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="w-4/5 mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">基本设置 - {locale.toUpperCase()}</h1>
            <div className="flex items-center gap-4">
              <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
              <button
                onClick={resetDefaultSettings}
                disabled={saving}
                className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded inline-flex items-center gap-1 text-sm"
                title="重置默认设置为样本（保留自定义属性模板）"
              >
                <RefreshCw size={14} /> 重置默认设置
              </button>
            </div>
          </div>
        </div>

        <BasicSettings settings={settings.defaultSettings} onUpdate={updateDefaultSettings} locale={locale} />
        <AttributeTemplates templates={settings.attributeTemplates} onUpdate={updateAttributeTemplates} />

        <div className="flex justify-end gap-3">
          <button
            onClick={saveAndSyncAll}
            disabled={syncAllLoading}
            className="bg-purple-600 text-white px-6 py-2 rounded inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Copy size={18} /> {syncAllLoading ? '同步中...' : '保存并同步到所有站点'}
          </button>
          <button
            onClick={saveAll}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-2 rounded inline-flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={18} /> {saving ? '保存中...' : '保存所有设置'}
          </button>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}