'use client';

import { useEffect, useState } from 'react';
import { LANGUAGES } from '@/lib/languages/config';
import Toast from '@/components/Toast';

export default function LanguageSettingsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [defaultLanguage, setDefaultLanguage] = useState<string>('zh');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [countryList, setCountryList] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/languages/settings').then(res => res.json()),
      fetch('/api/admin/languages/country').then(res => res.json()),
    ]).then(([settingsData, countryData]) => {
      setEnabled(settingsData.enabled || {});
      setDefaultLanguage(settingsData.defaultLanguage || 'zh');
      setCountryList(countryData);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const handleToggle = (code: string) => {
    setEnabled(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const handleSelectAll = () => {
    const allSelected = LANGUAGES.every(lang => enabled[lang.code] ?? true);
    const newEnabled = { ...enabled };
    LANGUAGES.forEach(lang => {
      newEnabled[lang.code] = !allSelected;
    });
    setEnabled(newEnabled);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/languages/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, defaultLanguage }),
      });
      if (res.ok) {
        setToast({ message: '保存成功', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '保存失败，请重试', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">加载中...</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="w-4/5 mx-auto space-y-6">
        {/* 卡片1：多语言站点开通配置 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">多语言站点开通配置</h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {LANGUAGES.every(lang => enabled[lang.code] ?? true) ? '取消全选' : '全选'}
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">开启/关闭前台可用的语言站点</p>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {LANGUAGES.map(lang => (
              <label key={lang.code} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enabled[lang.code] ?? true}
                  onChange={() => handleToggle(lang.code)}
                  className="w-4 h-4"
                />
                <span>{lang.zhName} ({lang.code})</span>
              </label>
            ))}
          </div>

          {/* 默认站点选择 */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-md font-medium mb-3">默认站点</h3>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="defaultLanguage"
                  value="zh"
                  checked={defaultLanguage === 'zh'}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-4 h-4"
                />
                <span>中文站 (zh)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="defaultLanguage"
                  value="en"
                  checked={defaultLanguage === 'en'}
                  onChange={(e) => setDefaultLanguage(e.target.value)}
                  className="w-4 h-4"
                />
                <span>英文站 (en)</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">默认站点将在前台语言选择器中作为默认选中项</p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
          </div>
        </div>

        {/* 卡片2：国家官方语言（只读） */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">国家官方语言（参考）</h2>
          <p className="text-sm text-gray-500 mb-4">根据用户IP所在国家自动切换对应语言</p>
          <div className="overflow-x-auto max-h-96">
            <table className="min-w-full border text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr>
                  <th className="border px-3 py-2 text-left">国家代码</th>
                  <th className="border px-3 py-2 text-left">中文名称</th>
                  <th className="border px-3 py-2 text-left">原生名称</th>
                  <th className="border px-3 py-2 text-left">官方语言代码</th>
                </tr>
              </thead>
              <tbody>
                {countryList.map(item => (
                  <tr key={item.countryCode}>
                    <td className="border px-3 py-1">{item.countryCode}</td>
                    <td className="border px-3 py-1">{item.countryZhName}</td>
                    <td className="border px-3 py-1">{item.countryNativeName}</td>
                    <td className="border px-3 py-1">{item.officialLanguageCode || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}