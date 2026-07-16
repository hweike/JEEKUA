'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperVideoCategoryModal from './components/AiHelperVideoCategoryModal';

interface CategoryData {
  key: string;
  name: string;
  order: number;
  slug: string;
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  commentStatus?: 'disabled' | 'pending' | 'allowed';
  isSystem?: boolean;
}

interface CategoryGroup {
  key: string;
  versions: Record<string, CategoryData | null>;
}

export default function CategoriesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, Record<string, CategoryData>>>({});
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAiHelper, setShowAiHelper] = useState(false);

  const initialLoadRef = useRef(false);

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
    } catch (error) {
      console.error('获取语言列表失败:', error);
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  const loadAllCategories = useCallback(async () => {
    if (availableLocales.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/videosys-categories?locales=${availableLocales.join(',')}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setAllData(data);
    } catch (error) {
      showToast('加载分类失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [availableLocales, showToast]);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
    }
  }, [fetchAvailableLocales]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllCategories();
    }
  }, [availableLocales]);

  useEffect(() => {
    const allLocaleCodes = availableLocales;
    const idMap: Record<string, CategoryGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const obj = allData[loc] || {};
      Object.entries(obj).forEach(([key, cat]) => {
        if (!idMap[key]) {
          idMap[key] = { key, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[key].versions[l] = null; });
        }
        idMap[key].versions[loc] = cat;
      });
    });

    const groupsArray = Object.values(idMap);
    groupsArray.sort((a, b) => {
      const orderA = a.versions[locale]?.order ?? 999;
      const orderB = b.versions[locale]?.order ?? 999;
      return orderA - orderB;
    });
    setGroups(groupsArray);
  }, [allData, availableLocales, locale]);

  const getCurrentCategory = (group: CategoryGroup): CategoryData | null => {
    return group.versions[locale] || null;
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const lower = searchTerm.toLowerCase();
    return groups.filter(group => {
      const current = group.versions[locale];
      if (current) {
        return current.name.toLowerCase().includes(lower) || current.slug.toLowerCase().includes(lower);
      }
      return false;
    });
  }, [groups, searchTerm, locale]);

  const currentLocaleCategories = useMemo(() => {
    const obj = allData[locale] || {};
    return Object.entries(obj).map(([key, cat]) => ({ key, ...cat }));
  }, [allData, locale]);

  const filteredSimple = useMemo(() => {
    if (!searchTerm.trim()) return currentLocaleCategories;
    const lower = searchTerm.toLowerCase();
    return currentLocaleCategories.filter(cat =>
      cat.name.toLowerCase().includes(lower) || cat.slug.toLowerCase().includes(lower)
    );
  }, [currentLocaleCategories, searchTerm]);

  const handleDelete = async (key: string, locale: string, name: string, isSystem: boolean) => {
    if (isSystem) {
      showToast('系统分类不可删除', 'error');
      return;
    }
    if (!confirm(`确定删除分类“${name}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/videosys-categories?locale=${locale}&key=${key}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      showToast('删除成功', 'success');
      await loadAllCategories();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  const toggleExpand = (key: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(key)) newSet.delete(key);
    else newSet.add(key);
    setExpandedIds(newSet);
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    router.push(`/admin/videosys/categories?locale=${newLocale}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">视频分类管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          {(locale === 'zh' || locale === 'en') && (
            <button
              onClick={() => setShowAiHelper(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition"
            >
              🤖 AI翻译
            </button>
          )}
          <Link
            href={`/admin/videosys/categories/new?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建分类
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="搜索当前语言分类名称或 URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1">
            <Search size={16} /> 搜索
          </button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-hidden">
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[60%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                分类名称
              </th>
              <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                URL
              </th>
              <th className="w-[20%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentCategory(group);
                const isExpanded = expandedIds.has(group.key);
                const hasChildren = Object.values(group.versions).some(v => v !== null);
                const otherLocales = availableLocales.filter(loc => loc !== locale);

                return (
                  <React.Fragment key={group.key}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(group.key)}
                    >
                      <td className="px-6 py-4 w-[60%] min-w-0 overflow-hidden">
                        <div className="flex items-center min-w-0">
                          {hasChildren && (
                            <button className="mr-2 flex-shrink-0 focus:outline-none">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span
                            className="font-medium text-gray-900 truncate"
                            title={current?.name || ''}
                          >
                            {current?.name || `${getLanguageDisplayName(locale, 'zh')}（未设置）`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate">
                        {current ? `/${current.slug}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {current ? (
                          <>
                            <Link
                              href={`/admin/videosys/categories/${group.key}/edit?locale=${locale}`}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(group.key, locale, current.name, !!current.isSystem); }}
                              className="text-red-600 hover:text-red-800"
                              disabled={current.isSystem}
                            >
                              <Trash2 size={16} className="inline" /> 删除
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/videosys/categories/new?locale=${locale}&key=${group.key}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Plus size={14} className="inline" /> 新增
                          </Link>
                        )}
                      </td>
                    </tr>

                    {isExpanded &&
                      otherLocales.map((loc) => {
                        const cat = group.versions[loc] || null;
                        const exists = cat !== null;
                        const isZhOrEn = loc === 'zh' || loc === 'en';

                        return (
                          <tr key={`${group.key}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12 w-[60%] min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span
                                  className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'} truncate`}
                                  title={exists ? cat.name : ''}
                                >
                                  {exists ? cat.name : '（未设置）'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700 truncate">
                              {exists ? `/${cat.slug}` : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm">
                              {exists ? (
                                <>
                                  <Link
                                    href={`/admin/videosys/categories/${group.key}/edit?locale=${loc}`}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(group.key, loc, cat.name, !!cat.isSystem)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={cat.isSystem}
                                  >
                                    <Trash2 size={14} className="inline" /> 删除
                                  </button>
                                </>
                              ) : (
                                isZhOrEn && (
                                  <Link
                                    href={`/admin/videosys/categories/new?locale=${loc}&key=${group.key}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                  >
                                    <Plus size={14} className="inline" /> 新增
                                  </Link>
                                )
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })
            ) : (
              filteredSimple.map((cat) => (
                <tr key={cat.key} className="hover:bg-gray-50">
                  <td className="px-6 py-4 w-[60%] min-w-0 overflow-hidden">
                    <span className="font-medium text-gray-900 truncate block" title={cat.name}>
                      {cat.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 truncate">
                    /{cat.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/videosys/categories/${cat.key}/edit?locale=${locale}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil size={16} className="inline" /> 编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(cat.key, locale, cat.name, !!cat.isSystem)}
                      className="text-red-600 hover:text-red-800"
                      disabled={cat.isSystem}
                    >
                      <Trash2 size={16} className="inline" /> 删除
                    </button>
                  </td>
                </tr>
              ))
            )}
            {isCollapsibleMode
              ? filteredGroups.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                      暂无分类，点击“新建分类”创建
                    </td>
                  </tr>
                )
              : filteredSimple.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                      该语言暂无分类
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {showAiHelper && (
        <AiHelperVideoCategoryModal
          sourceLocale={locale}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            loadAllCategories();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}