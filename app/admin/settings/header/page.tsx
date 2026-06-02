'use client';

import { useEffect, useState } from 'react';
import HeaderForm from '@/components/SiteHeadersFooters/HeaderForm';
import { HeaderConfig } from '@/lib/SiteHeadersFooters/types';
import LanguageSelector from '@/components/common/LanguageSelector';
import { RefreshCw } from 'lucide-react';
import SiteSyncDialog from '@/components/common/SiteSyncDialog';
import Toast from '@/components/common/Toast';
import SyncLogsDialog from '@/components/common/SyncLogsDialog';

export default function HeaderSettingsPage() {
  const [locale, setLocale] = useState('zh');
  const [config, setConfig] = useState<HeaderConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showLogsDialog, setShowLogsDialog] = useState(false);

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

  const handleSync = async (sourceLocale: string, targetLocales: string[]) => {
    try {
      const res = await fetch('/api/sync/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'header',
          sourceLocale,
          targetLocales,
          itemId: 'header',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失败');
      const failed = data.results?.filter((r: any) => r.status === 'failed') || [];
      if (failed.length > 0) {
        setToast({ message: `同步完成，但 ${failed.length} 个站点失败`, type: 'error' });
        return { success: false };
      }
      setToast({ message: `成功同步到 ${targetLocales.length} 个站点`, type: 'success' });
      return { success: true };
    } catch (error: any) {
      setToast({ message: error.message || '同步失败', type: 'error' });
      throw error;
    }
  };

  useEffect(() => {
    loadConfig(locale);
  }, [locale]);

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center">加载中...</div>;

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-4/5 mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">页头设置 - {locale.toUpperCase()}</h1>
            <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">当前语言尚无页头配置数据</p>
            <button
              onClick={() => initConfig(locale)}
              className="bg-blue-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
            >
              <RefreshCw size={16} /> 从样本初始化
            </button>
          </div>
        </div>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="w-4/5 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">页头设置 - {locale.toUpperCase()}</h1>
          <div className="flex items-center gap-4">
            <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
            <button
              onClick={handleInitCurrent}
              className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm inline-flex items-center gap-2"
            >
              <RefreshCw size={14} /> 初始化设置
            </button>
             {/* 仅当 locale 为 zh 或 en 时显示同步按钮 */}
            {(locale === 'zh' || locale === 'en') && (
            <button
              onClick={() => setShowSyncDialog(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm inline-flex items-center gap-2"
            >
              🌐 多语言站点一键同步
            </button>
            )}
            <button
  onClick={() => setShowLogsDialog(true)}
  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded text-sm inline-flex items-center gap-2"
>
  📋 同步日志
</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-[50px]">
          <HeaderForm initialConfig={config} locale={locale} />
        </div>
      </div>

      <SiteSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        onSync={handleSync}
        currentLocale={locale}
        title="同步页头配置到其他语言"
      />
       <SyncLogsDialog
      isOpen={showLogsDialog}
      onClose={() => setShowLogsDialog(false)}
      syncType="header"
    />
      
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
