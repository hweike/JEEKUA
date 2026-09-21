// app/admin/settings/header-footer/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Toast from '@/components/common/Toast';
import HeaderFooterCategory from './components/HeaderFooterCategory';
import AiHelperHeaderFooterModal from './components/AiHelperHeaderFooterModal';
import { HeaderConfig, FooterConfig } from '@/lib/SiteHeadersFooters/types';

type ConfigType = 'header' | 'footer';

export default function HeaderFooterPage() {
  const [allHeaders, setAllHeaders] = useState<Record<string, HeaderConfig | null>>({});
  const [allFooters, setAllFooters] = useState<Record<string, FooterConfig | null>>({});
  const [availableLocales, setAvailableLocales] = useState<string[]>(['zh', 'en']);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // AI 翻译相关状态
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [aiHelperType, setAiHelperType] = useState<'header' | 'footer'>('header');
  const [aiHelperSourceLocale, setAiHelperSourceLocale] = useState<string>('');

  const fetchAvailableLocales = useCallback(async () => {
    try {
      const res = await fetch('/api/languages/enabled');
      const data = await res.json();
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
    } catch {
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  const fetchAllConfigs = useCallback(async (type: ConfigType, locales: string[], signal?: AbortSignal) => {
    if (locales.length === 0) return {};
    const url = `/api/SiteHeadersFooters/config?type=${type}&locales=${locales.join(',')}`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      console.error(`获取所有 ${type} 配置失败:`, error);
      return {};
    }
  }, []);

  const loadAllData = useCallback(async () => {
    if (availableLocales.length === 0) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    let isCancelled = false;

    try {
      const [headers, footers] = await Promise.all([
        fetchAllConfigs('header', availableLocales, controller.signal),
        fetchAllConfigs('footer', availableLocales, controller.signal),
      ]);

      if (!controller.signal.aborted) {
        setAllHeaders(headers);
        setAllFooters(footers);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        isCancelled = true;
        console.log('请求已取消');
        return;
      }
      console.error('加载数据失败:', error);
      setToast({ message: '加载页头/页脚配置失败', type: 'error' });
    } finally {
      if (!isCancelled && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [availableLocales, fetchAllConfigs]);

  useEffect(() => {
    fetchAvailableLocales();
  }, [fetchAvailableLocales]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllData();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [availableLocales, loadAllData]);

  const refreshAll = useCallback(() => {
    if (availableLocales.length > 0) {
      loadAllData();
    }
  }, [availableLocales, loadAllData]);

  const initConfig = useCallback(
    async (type: ConfigType, locale: string) => {
      if (!confirm(`确定要将 ${locale} 语言的${type === 'header' ? '页头' : '页脚'}设置恢复为样本默认值吗？`)) return;
      try {
        const res = await fetch('/api/SiteHeadersFooters/init', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, locale }),
        });
        if (!res.ok) throw new Error('初始化失败');
        setToast({ message: `${locale} ${type}配置初始化成功`, type: 'success' });
        refreshAll();
      } catch (error) {
        setToast({ message: `${locale} ${type}配置初始化失败`, type: 'error' });
      }
    },
    [refreshAll]
  );

  // AI 翻译处理函数
  const handleAiTranslate = useCallback((locale: string, type: 'header' | 'footer') => {
    setAiHelperSourceLocale(locale);
    setAiHelperType(type);
    setShowAiHelper(true);
  }, []);

  const headerEntries = useMemo(() => {
    return availableLocales.map((locale) => ({
      locale,
      config: allHeaders[locale] || null,
    }));
  }, [availableLocales, allHeaders]);

  const footerEntries = useMemo(() => {
    return availableLocales.map((locale) => ({
      locale,
      config: allFooters[locale] || null,
    }));
  }, [availableLocales, allFooters]);

  if (loading && !Object.keys(allHeaders).length && !Object.keys(allFooters).length) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
        <p className="mt-2">加载页头/页脚配置...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">页头 | 页脚配置</h1>
      </div>

      <div className="space-y-6">
        <HeaderFooterCategory
          key={`header-${JSON.stringify(allHeaders)}`}
          title="页头配置"
          type="header"
          entries={headerEntries}
          availableLocales={availableLocales}
          onRefresh={refreshAll}
          onInit={(locale) => initConfig('header', locale)}
          onAiTranslate={handleAiTranslate}
        />
        <HeaderFooterCategory
          key={`footer-${JSON.stringify(allFooters)}`}
          title="页脚配置"
          type="footer"
          entries={footerEntries}
          availableLocales={availableLocales}
          onRefresh={refreshAll}
          onInit={(locale) => initConfig('footer', locale)}
          onAiTranslate={handleAiTranslate}
        />
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && (
        <AiHelperHeaderFooterModal
          sourceLocale={aiHelperSourceLocale}
          type={aiHelperType}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            refreshAll();
            setShowAiHelper(false);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}