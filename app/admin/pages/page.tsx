'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, FileWarning, Plus, Pencil, Trash2, Search, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperPageModal from './components/AiHelperPageModal';

interface PageItem {
  id: string;
  title: string;
  slug: string;
  visible: string;
  updatedAt: string;
  type: 'home' | 'policy' | 'custom' | 'Inquiry';
  preset: boolean;
  locale: string;
}

interface PageGroup {
  id: string;
  versions: Record<string, PageItem | null>;
}

export default function PagesAdmin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const initialTab = searchParams.get('tab') as 'pages' | 'policies' | null;
  const [activeTab, setActiveTab] = useState<'pages' | 'policies'>(initialTab === 'policies' ? 'policies' : 'pages');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, PageItem[]>>({});
  const [groups, setGroups] = useState<PageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [selectedPage, setSelectedPage] = useState<{ id: string; title: string } | null>(null);
  const initialLoadRef = useRef(false);

  // ========== 处理 refresh 参数（清除缓存） ==========
  useEffect(() => {
    const refresh = searchParams.get('refresh');
    if (refresh === 'true') {
      console.log('[缓存] 检测到 refresh=true，清除缓存');
      // 清除所有 pages_all_ 开头的缓存
      const keys = Object.keys(sessionStorage);
      keys.forEach(key => {
        if (key.startsWith('pages_all_')) {
          sessionStorage.removeItem(key);
        }
      });
      // 移除 refresh 参数
      const params = new URLSearchParams(searchParams.toString());
      params.delete('refresh');
      const newUrl = `/admin/pages?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    }
  }, [searchParams, router]);

  // 获取所有启用的语言
  const fetchAvailableLocales = useCallback(async () => {
    console.time('[性能] fetchAvailableLocales');
    try {
      const res = await fetch('/api/languages/enabled');
      const data = await res.json();
      let locales: string[] = [];
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'string') {
          locales = data;
        } else {
          locales = data.map((item: any) => item.code || item);
        }
      } else if (data && Array.isArray(data.locales)) {
        locales = data.locales;
      }
      setAvailableLocales(locales.length > 0 ? locales : ['zh', 'en']);
      console.timeEnd('[性能] fetchAvailableLocales');
    } catch {
      setAvailableLocales(['zh', 'en']);
      console.timeEnd('[性能] fetchAvailableLocales');
    }
  }, []);

  // 清除缓存（工具函数）
  const clearCache = useCallback(() => {
    if (availableLocales.length === 0) return;
    const cacheKey = `pages_all_${availableLocales.sort().join(',')}`;
    sessionStorage.removeItem(cacheKey);
    console.log('[缓存] 已清除');
  }, [availableLocales]);

  // 后台刷新数据
  const refreshDataInBackground = useCallback(
    async (cacheKey: string) => {
      try {
        console.log('[缓存] 后台刷新开始');
        const res = await fetch(`/api/admin/pages?locales=${availableLocales.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          setAllData(data);
          sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
          console.log('[缓存] 后台刷新完成，已更新缓存');
        } else {
          console.warn('[缓存] 后台刷新失败，保留旧缓存');
        }
      } catch (e) {
        console.warn('[缓存] 后台刷新出错，保留旧缓存', e);
      }
    },
    [availableLocales]
  );

  // 加载所有语言的页面数据（带缓存）
  const loadAllPages = useCallback(async () => {
    if (availableLocales.length === 0) return;
    console.time('[性能] loadAllPages 总耗时');

    const cacheKey = `pages_all_${availableLocales.sort().join(',')}`;
    const cached = sessionStorage.getItem(cacheKey);
    const now = Date.now();

    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (now - timestamp < 5 * 60 * 1000) {
          console.log('[缓存] 命中，使用 sessionStorage 缓存，数据量:', Object.keys(data).length);
          setAllData(data);
          setLoading(false);
          refreshDataInBackground(cacheKey);
          console.timeEnd('[性能] loadAllPages 总耗时');
          return;
        } else {
          console.log('[缓存] 已过期，重新请求');
        }
      } catch (e) {
        console.log('[缓存] 解析失败，重新请求', e);
      }
    }

    setLoading(true);
    setError(null);
    try {
      let data: Record<string, PageItem[]>;
      console.time('[性能] fetch /api/admin/pages (批量)');
      const res = await fetch(`/api/admin/pages?locales=${availableLocales.join(',')}`);
      console.timeEnd('[性能] fetch /api/admin/pages (批量)');
      if (res.ok) {
        console.time('[性能] 解析 JSON');
        data = await res.json();
        console.timeEnd('[性能] 解析 JSON');
      } else {
        console.time('[性能] 降级: 逐个请求语言');
        const results = await Promise.all(
          availableLocales.map(async (loc) => {
            const r = await fetch(`/api/admin/pages?locale=${loc}`);
            if (!r.ok) throw new Error(`加载 ${loc} 失败`);
            const d = await r.json();
            return { locale: loc, pages: d.pages || [] };
          })
        );
        console.timeEnd('[性能] 降级: 逐个请求语言');
        data = {};
        results.forEach(({ locale, pages }) => { data[locale] = pages; });
      }
      setAllData(data);
      sessionStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: now }));
      console.log(`[性能] 加载完成，语言数: ${Object.keys(data).length}`);
    } catch (err) {
      console.error(err);
      setError('加载页面失败，请刷新重试');
    } finally {
      setLoading(false);
      console.timeEnd('[性能] loadAllPages 总耗时');
    }
  }, [availableLocales, refreshDataInBackground]);

  // 初始化
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
    }
  }, [fetchAvailableLocales]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllPages();
    }
  }, [availableLocales, loadAllPages]);

  // 聚合分组
  useEffect(() => {
    console.time('[性能] 聚合分组和排序');
    const allLocaleCodes = Array.from(new Set([...availableLocales, ...Object.keys(allData)]));
    const idMap: Record<string, PageGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const list = allData[loc] || [];
      list.forEach((page) => {
        if (!idMap[page.id]) {
          idMap[page.id] = { id: page.id, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[page.id].versions[l] = null; });
        }
        const pageWithType = { ...page };
        if (!pageWithType.type) {
          if (pageWithType.preset) pageWithType.type = 'home';
          else pageWithType.type = 'custom';
        }
        idMap[page.id].versions[loc] = pageWithType;
      });
    });

    const groupsArray = Object.values(idMap);
    groupsArray.sort((a, b) => {
      const titleA = a.versions[locale]?.title || '';
      const titleB = b.versions[locale]?.title || '';
      if (!titleA && !titleB) return 0;
      if (!titleA) return 1;
      if (!titleB) return -1;
      return titleA.localeCompare(titleB);
    });
    setGroups(groupsArray);
    setExpandedIds(new Set());
    console.timeEnd('[性能] 聚合分组和排序');
    console.log(`[性能] 分组完成，组数: ${groupsArray.length}`);
  }, [allData, availableLocales, locale]);

  const getCurrentPage = (group: PageGroup): PageItem | null => {
    return group.versions[locale] || null;
  };

  // 搜索过滤
  const filteredGroups = useMemo(() => {
    console.time('[性能] useMemo filteredGroups');
    let result = groups;
    if (activeTab === 'pages') {
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && (current.type === 'custom' || current.type === 'home' || current.type === 'Inquiry');
      });
    } else {
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && current.type === 'policy';
      });
    }
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && (current.title.toLowerCase().includes(lower) || current.slug.toLowerCase().includes(lower));
      });
    }
    console.timeEnd('[性能] useMemo filteredGroups');
    return result;
  }, [groups, activeTab, searchTerm, locale]);

  const currentLocalePages = useMemo(() => {
    console.time('[性能] useMemo currentLocalePages');
    const list = allData[locale] || [];
    let result = activeTab === 'pages'
      ? list.filter(p => p.type === 'custom' || p.type === 'home' || p.type === 'Inquiry')
      : list.filter(p => p.type === 'policy');
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lower) || p.slug.toLowerCase().includes(lower));
    }
    console.timeEnd('[性能] useMemo currentLocalePages');
    return result;
  }, [allData, locale, activeTab, searchTerm]);

  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除页面“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}?locale=${locale}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setToast({ message: '删除成功', type: 'success' });
      clearCache();
      await loadAllPages();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : '删除失败', type: 'error' });
    }
  };

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    const currentTab = activeTab === 'pages' ? 'pages' : 'policies';
    router.push(`/admin/pages?locale=${newLocale}&tab=${currentTab}`);
  };

  const handleTabChange = (tab: 'pages' | 'policies') => {
    setActiveTab(tab);
    setSearchTerm('');
    setExpandedIds(new Set());
    router.push(`/admin/pages?locale=${locale}&tab=${tab}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 顶部区域 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">页面管理</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索标题/URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <LanguageSelector currentLocale={locale} onLocaleChange={handleLocaleChange} displayMode="zh" />
          <button
            onClick={async () => {
              if (!confirm(`确定要初始化当前语言 (${locale}) 的预设页面吗？\n这将创建缺失的页面文件并同步到数据库。`)) return;
              try {
                const res = await fetch(`/api/admin/pages/init?locale=${locale}`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                  setToast({ message: `初始化完成 (${locale})，共处理 ${data.total} 个页面`, type: 'success' });
                  clearCache();
                  await loadAllPages();
                } else {
                  setToast({ message: data.error || '初始化失败', type: 'error' });
                }
              } catch (err) {
                setToast({ message: '初始化失败', type: 'error' });
              }
            }}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition"
          >
            <RefreshCw size={18} /> 初始化页面
          </button>
          <Link
            href={`/admin/pages/new?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={18} /> 添加页面
          </Link>
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => handleTabChange('pages')}
          className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
            activeTab === 'pages'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} /> 页面
        </button>
        <button
          onClick={() => handleTabChange('policies')}
          className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
            activeTab === 'policies'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileWarning size={16} /> 网站政策
        </button>
      </div>

      {/* 表格 */}
      <div className="overflow-x-hidden bg-white rounded-lg shadow">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[50%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                页面标题
              </th>
              <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                URL名称
              </th>
              <th className="w-[10%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                可见性
              </th>
              <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentPage(group);
                const isExpanded = expandedIds.has(group.id);
                const hasChildren = Object.values(group.versions).some(v => v !== null);
                const otherLocales = Array.from(new Set([...availableLocales, ...Object.keys(allData)])).filter(loc => loc !== locale);
                const addLabel = locale === 'zh' ? '发布中文版' : locale === 'en' ? '发布英文版' : '新增';

                return (
                  <React.Fragment key={group.id}>
                    {/* 父行 */}
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(group.id)}
                    >
                      <td className="px-6 py-4 w-[50%] min-w-0 overflow-hidden">
                        <div className="flex items-center min-w-0">
                          {hasChildren && (
                            <button className="mr-2 flex-shrink-0 focus:outline-none">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span className="text-sm font-medium text-gray-500 flex-shrink-0 mr-1">
                            {getLanguageDisplayName(locale, 'zh')}站
                          </span>
                          {current ? (
                            <Link
                              href={`/${locale}/${current.slug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline font-medium truncate"
                              title={current.title}
                            >
                              {current.title}
                            </Link>
                          ) : (
                            <span className="text-gray-400 truncate">未发布</span>
                          )}
                          {current?.preset && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0 ml-1">
                              预设
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate">
                        {current ? `/${current.slug}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {current ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            current.visible === 'visible' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {current.visible === 'visible' ? '可见' : '隐藏'}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {current ? (
                          <div className="flex flex-wrap items-center gap-1">
                            {(locale === 'zh' || locale === 'en') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPage({ id: group.id, title: current.title });
                                  setShowAiHelper(true);
                                }}
                                className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                              >
                                🤖 AI翻译
                              </button>
                            )}
                            <Link
                              href={`/admin/pages/${group.id}/edit?locale=${locale}`}
                              className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            {!current.preset && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(group.id, locale, current.title); }}
                                className="text-red-600 hover:text-red-900 whitespace-nowrap"
                              >
                                <Trash2 size={16} className="inline" /> 删除
                              </button>
                            )}
                          </div>
                        ) : (
                          <Link
                            href={`/admin/pages/new?locale=${locale}&id=${group.id}&type=${current?.type || 'custom'}`}
                            className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus size={16} className="inline" /> {addLabel}
                          </Link>
                        )}
                      </td>
                    </tr>

                    {/* 子行 */}
                    {isExpanded &&
                      otherLocales.map((loc) => {
                        const page = group.versions[loc] || null;
                        const exists = page !== null;
                        const isZhOrEn = loc === 'zh' || loc === 'en';
                        const childAddLabel = loc === 'zh' ? '发布中文版' : loc === 'en' ? '发布英文版' : '新增';

                        return (
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12 w-[50%] min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}站
                                </span>
                                {exists ? (
                                  <Link
                                    href={`/${loc}/${page.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate"
                                    title={page.title}
                                  >
                                    {page.title}
                                  </Link>
                                ) : (
                                  <span className="text-sm text-gray-400 truncate">未发布</span>
                                )}
                                {exists && page.preset && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                                    预设
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-3 text-sm text-gray-700 truncate">
                              {exists ? `/${page.slug}` : '-'}
                            </td>
                            <td className="px-6 py-3">
                              {exists ? (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  page.visible === 'visible' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {page.visible === 'visible' ? '可见' : '隐藏'}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-3 text-sm">
                              {exists ? (
                                <div className="flex flex-wrap items-center gap-1">
                                  {(locale === 'zh' || locale === 'en') && (
                                    <button
                                      onClick={() => {
                                        setSelectedPage({ id: group.id, title: page.title });
                                        setShowAiHelper(true);
                                      }}
                                      className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                                    >
                                      🤖 AI翻译
                                    </button>
                                  )}
                                  <Link
                                    href={`/admin/pages/${group.id}/edit?locale=${loc}`}
                                    className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  {!page.preset && (
                                    <button
                                      onClick={() => handleDelete(group.id, loc, page.title)}
                                      className="text-red-600 hover:text-red-900 whitespace-nowrap"
                                    >
                                      <Trash2 size={14} className="inline" /> 删除
                                    </button>
                                  )}
                                </div>
                              ) : (
                                isZhOrEn ? (
                                  <Link
                                    href={`/admin/pages/new?locale=${loc}&id=${group.id}&type=${page?.type || current?.type || 'custom'}`}
                                    className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                  >
                                    <Plus size={14} className="inline" /> {childAddLabel}
                                  </Link>
                                ) : null
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            ) : (
              // 普通模式（非 zh/en）
              currentLocalePages.map((page) => (
                <tr key={page.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 w-[50%] min-w-0 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <Link
                        href={`/${locale}/${page.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-medium truncate"
                        title={page.title}
                      >
                        {page.title}
                      </Link>
                      {page.preset && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                          预设
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 truncate">
                    /{page.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      page.visible === 'visible' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {page.visible === 'visible' ? '可见' : '隐藏'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap items-center gap-1">
                      {(locale === 'zh' || locale === 'en') && (
                        <button
                          onClick={() => {
                            setSelectedPage({ id: page.id, title: page.title });
                            setShowAiHelper(true);
                          }}
                          className="text-purple-600 hover:text-purple-800 whitespace-nowrap"
                        >
                          🤖 AI翻译
                        </button>
                      )}
                      <Link
                        href={`/admin/pages/${page.id}/edit?locale=${locale}`}
                        className="text-indigo-600 hover:text-indigo-900 whitespace-nowrap"
                      >
                        <Pencil size={16} className="inline" /> 编辑
                      </Link>
                      {!page.preset && (
                        <button
                          onClick={() => handleDelete(page.id, locale, page.title)}
                          className="text-red-600 hover:text-red-900 whitespace-nowrap"
                        >
                          <Trash2 size={16} className="inline" /> 删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            {(isCollapsibleMode ? filteredGroups.length === 0 : currentLocalePages.length === 0) && (
              <tr>
                <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                  暂无{activeTab === 'pages' ? '页面' : '政策'}数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && selectedPage && (
        <AiHelperPageModal
          sourceLocale={locale}
          pageId={selectedPage.id}
          pageTitle={selectedPage.title}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            clearCache();
            loadAllPages();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}