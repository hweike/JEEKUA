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
  type: 'home' | 'policy' | 'custom';
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
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, PageItem[]>>({});
  const [groups, setGroups] = useState<PageGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pages' | 'policies'>('pages');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [selectedPage, setSelectedPage] = useState<{ id: string; title: string } | null>(null);
  const initialLoadRef = useRef(false);

  // 获取所有启用的语言
  const fetchAvailableLocales = useCallback(async () => {
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
    } catch {
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  // 加载所有语言的页面数据
  const loadAllPages = useCallback(async () => {
    if (availableLocales.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      let data: Record<string, PageItem[]>;
      const res = await fetch(`/api/admin/pages?locales=${availableLocales.join(',')}`);
      if (res.ok) {
        data = await res.json();
      } else {
        // 降级
        const results = await Promise.all(
          availableLocales.map(async (loc) => {
            const r = await fetch(`/api/admin/pages?locale=${loc}`);
            if (!r.ok) throw new Error(`加载 ${loc} 失败`);
            const d = await r.json();
            return { locale: loc, pages: d.pages || [] };
          })
        );
        data = {};
        results.forEach(({ locale, pages }) => { data[locale] = pages; });
      }
      setAllData(data);
    } catch (err) {
      console.error(err);
      setError('加载页面失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  }, [availableLocales]);

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
  }, [allData, availableLocales, locale]);

  const getCurrentPage = (group: PageGroup): PageItem | null => {
    return group.versions[locale] || null;
  };

  // 搜索过滤
  const filteredGroups = useMemo(() => {
    let result = groups;
    if (activeTab === 'pages') {
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && (current.type === 'custom' || current.type === 'home');
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
    return result;
  }, [groups, activeTab, searchTerm, locale]);

  const currentLocalePages = useMemo(() => {
    const list = allData[locale] || [];
    let result = activeTab === 'pages'
      ? list.filter(p => p.type === 'custom' || p.type === 'home')
      : list.filter(p => p.type === 'policy');
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(lower) || p.slug.toLowerCase().includes(lower));
    }
    return result;
  }, [allData, locale, activeTab, searchTerm]);

  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除页面“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}?locale=${locale}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      setToast({ message: '删除成功', type: 'success' });
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
    router.push(`/admin/pages?locale=${newLocale}`);
  };

  const handleTabChange = (tab: 'pages' | 'policies') => {
    setActiveTab(tab);
    setSearchTerm('');
    setExpandedIds(new Set());
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

      {/* 表格 - 使用 table-fixed 控制宽度 */}
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
                          <Link
                            href={`/${locale}/${current?.slug || ''}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline font-medium truncate"
                            title={current?.title || ''}
                          >
                            {current?.title || `${getLanguageDisplayName(locale, 'zh')}（未设置）`}
                          </Link>
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
                            href={`/admin/pages/new?locale=${locale}&id=${group.id}`}
                            className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus size={16} className="inline" /> 新增
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

                        return (
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12 w-[50%] min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span
                                  className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'} truncate`}
                                  title={exists ? page.title : ''}
                                >
                                  {exists ? page.title : '（未设置）'}
                                </span>
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
                                    href={`/admin/pages/new?locale=${loc}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
                                  >
                                    <Plus size={14} className="inline" /> 新增
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
            loadAllPages();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}