'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import HeaderForm from '@/components/SiteHeadersFooters/HeaderForm';
import { HeaderConfig } from '@/lib/SiteHeadersFooters/types';
import { RefreshCw } from 'lucide-react';
import Toast from '@/components/common/Toast';
import { getLanguageDisplayName } from '@/lib/languages/config'; // 新增导入

export default function HeaderSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'zh';
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [saving, setSaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadConfig = async (lang: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/SiteHeadersFooters/config?type=header&locale=${lang}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      if (data && Object.keys(data).length > 0) {
        setConfig(data);
      } else {
        setConfig(null);
      }
    } catch (error) {
      console.error(error);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const initConfig = async (lang: string) => {
    try {
      const res = await fetch('/api/SiteHeadersFooters/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'header', locale: lang }),
      });
      if (!res.ok) throw new Error('初始化失败');
      setToast({ message: `${lang} 页头配置初始化成功`, type: 'success' });
      await loadConfig(lang);
    } catch (error) {
      setToast({ message: `${lang} 页头配置初始化失败`, type: 'error' });
    }
  };

  const handleInitCurrent = async () => {
    if (confirm(`确定要将 ${locale} 语言的页头设置恢复为样本默认值吗？`)) {
      await initConfig(locale);
    }
  };

  // 触发表单提交
  const handleSave = async () => {
    setSaving(true);
    try {
      const form = containerRef.current?.querySelector('form');
      if (form) {
        form.requestSubmit();
        // 假设表单提交成功后会由内部处理 Toast，这里只管理按钮状态
        setTimeout(() => setSaving(false), 1500);
      } else {
        throw new Error('未找到表单');
      }
    } catch (error) {
      setToast({ message: '保存失败，请检查表单', type: 'error' });
      setSaving(false);
    }
  };

  useEffect(() => {
    loadConfig(locale);
  }, [locale]);

  // 使用 getLanguageDisplayName 获取语言中文名
  const siteName = getLanguageDisplayName(locale, 'zh');

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">加载中...</div>;

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-4/5 mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">页头设置（{siteName}）</h1> {/* 修改标题 */}
            <button
              onClick={() => initConfig(locale)}
              className="bg-blue-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> 从样本初始化
            </button>
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">当前语言尚无页头配置数据</p>
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 pb-24">
      <div className="w-4/5 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">页头设置（{siteName}）</h1> {/* 修改标题 */}
          <button
            onClick={handleInitCurrent}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm inline-flex items-center gap-2"
          >
            <RefreshCw size={14} /> 初始化设置
          </button>
        </div>

        <div className="bg-white rounded-lg shadow p-[50px]" ref={containerRef}>
          <HeaderForm initialConfig={config} locale={locale} />
        </div>
      </div>

      {/* 悬浮按钮 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-end gap-4 z-50">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-300 hover:bg-gray-400 px-4 py-2 rounded"
        >
          取消
        </button>
        <button
          type="submit"
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {saving ? '保存中...' : '保存页头'}
        </button>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}