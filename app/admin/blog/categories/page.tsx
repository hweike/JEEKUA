'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperBlogCategoryModal from './components/AiHelperBlogCategoryModal';

interface CategoryData {
  id: string;
  title: string;
  slug: string;
  comment_status: string;
  template: string;
  seo_keywords?: string;
  seo_title?: string;
  seo_description?: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

interface CategoryGroup {
  id: string;
  versions: Record<string, CategoryData | null>;
}

export default function CategoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, CategoryData[]>>({});
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState<{ id: string; target: string } | null>(null);
  const [showAiHelper, setShowAiHelper] = useState(false);

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
    } catch (error) {
      console.error('获取语言列表失败:', error);
      setAvailableLocales(['zh', 'en']);
    }
  }, []);

  // 加载所有分类
  const loadAllCategories = useCallback(async () => {
    if (availableLocales.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog/categories?locales=${availableLocales.join(',')}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setAllData(data);
    } catch (error) {
      showToast('加载分类失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [availableLocales, showToast]);

  // 初始化：获取语言列表
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
    }
  }, [fetchAvailableLocales]);

  // 语言列表更新后加载数据
  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllCategories();
    }
  }, [availableLocales]);

  // 聚合分组
  useEffect(() => {
    const allLocaleCodes = availableLocales;
    const idMap: Record<string, CategoryGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const list = allData[loc] || [];
      list.forEach((cat) => {
        if (!idMap[cat.id]) {
          idMap[cat.id] = { id: cat.id, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[cat.id].versions[l] = null; });
        }
        idMap[cat.id].versions[loc] = cat;
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
  }, [allData, availableLocales, locale]);

  // 获取当前语言的分类数据
  const getCurrentCategory = (group: CategoryGroup): CategoryData | null => {
    return group.versions[locale] || null;
  };

  // 检查英文版本是否存在（保留以备后用，但已不在UI显示复制按钮）
  const hasEnglishVersion = (group: CategoryGroup): boolean => {
    return group.versions['en'] !== null;
  };

  // 搜索过滤（折叠模式）
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const lower = searchTerm.toLowerCase();
    return groups.filter(group => {
      const current = group.versions[locale];
      if (current) {
        const titleMatch = current.title.toLowerCase().includes(lower);
        const slugMatch = current.slug.toLowerCase().includes(lower);
        if (titleMatch || slugMatch) return true;
      }
      return false;
    });
  }, [groups, searchTerm, locale]);

  // 普通模式数据
  const currentLocaleCategories = useMemo(() => {
    return allData[locale] || [];
  }, [allData, locale]);

  const filteredSimple = useMemo(() => {
    if (!searchTerm.trim()) return currentLocaleCategories;
    const lower = searchTerm.toLowerCase();
    return currentLocaleCategories.filter(cat =>
      cat.title.toLowerCase().includes(lower) || cat.slug.toLowerCase().includes(lower)
    );
  }, [currentLocaleCategories, searchTerm]);

  // 复制操作（按钮已移除，但保留函数以防其他地方调用）
  const handleCopy = async (id: string, targetLocale: string) => {
    if (!confirm(`确定将分类从英文复制到 ${getLanguageDisplayName(targetLocale, 'zh')} 吗？`)) return;
    setCopying({ id, target: targetLocale });
    try {
      const res = await fetch('/api/admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy',
          sourceLocale: 'en',
          targetLocale,
          id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '复制失败');
      }
      showToast(`复制到 ${getLanguageDisplayName(targetLocale, 'zh')} 成功`, 'success');
      await loadAllCategories();
    } catch (error: any) {
      showToast(error.message || '复制失败', 'error');
    } finally {
      setCopying(null);
    }
  };

  // 删除操作
  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除分类“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/blog/categories?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      showToast('删除成功', 'success');
      await loadAllCategories();
    } catch (error) {
      showToast('删除失败', 'error');
    }
  };

  // 切换展开
  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedIds(newSet);
  };

  // 语言切换
  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    router.push(`/admin/blog/categories?locale=${newLocale}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

  // 评论状态标签（已不再使用，但保留函数不影响）
  const getCommentStatusLabel = (status: string) => {
    switch (status) {
      case 'allowed': return '允许';
      case 'moderate': return '待审核';
      case 'disabled': return '禁用';
      default: return status;
    }
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">分类管理</h1>
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
            href={`/admin/blog/categories/edit?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建分类
          </Link>
        </div>
      </div>

      {/* 搜索区域 */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="搜索当前语言分类标题或 URL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1">
            <Search size={16} /> 搜索
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="w-1/2 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                分类名称
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentCategory(group);
                const isExpanded = expandedIds.has(group.id);
                const hasChildren = Object.values(group.versions).some(v => v !== null);
                const otherLocales = availableLocales.filter(loc => loc !== locale);

                return (
                  <React.Fragment key={group.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(group.id)}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {hasChildren && (
                            <button className="mr-2 focus:outline-none">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span className="font-medium text-gray-900">
                            {current?.title || `${getLanguageDisplayName(locale, 'zh')}（未设置）`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {current ? `/${current.slug}` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {current ? new Date(current.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {current ? (
                          <>
                            <Link
                              href={`/admin/blog/categories/edit?locale=${locale}&id=${group.id}`}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(group.id, locale, current.title); }}
                              className="text-red-600 hover:text-red-800 mr-3"
                            >
                              <Trash2 size={16} className="inline" /> 删除
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/blog/categories/edit?locale=${locale}&id=${group.id}`}
                            className="text-blue-600 hover:text-blue-800"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Plus size={16} className="inline" /> 新增
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
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-500 w-16">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'}`}>
                                  {exists ? cat.title : '（未设置）'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                              {exists ? `/${cat.slug}` : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {exists ? new Date(cat.created_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm">
                              {exists ? (
                                <>
                                  <Link
                                    href={`/admin/blog/categories/edit?locale=${loc}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(group.id, loc, cat.title)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={14} className="inline" /> 删除
                                  </button>
                                </>
                              ) : (
                                isZhOrEn ? (
                                  <Link
                                    href={`/admin/blog/categories/edit?locale=${loc}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
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
              filteredSimple.map((cat) => (
                <tr key={cat.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900">{cat.title}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    /{cat.slug}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(cat.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/blog/categories/edit?locale=${locale}&id=${cat.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil size={16} className="inline" /> 编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(cat.id, locale, cat.title)}
                      className="text-red-600 hover:text-red-800"
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
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      暂无分类，点击“新建分类”创建
                    </td>
                  </tr>
                )
              : filteredSimple.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      该语言暂无分类
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && (
        <AiHelperBlogCategoryModal
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