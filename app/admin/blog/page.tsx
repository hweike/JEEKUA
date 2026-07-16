'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperBlogPostModal from './components/AiHelperBlogPostModal';

interface Post {
  id: string;
  title: string;
  category_id: string;
  category_name: string;
  updated_at: string;
  visibility: string;
  slug: string;
  locale: string;
  created_at: string;
}

interface Category {
  id: string;
  title: string;
}

interface PostGroup {
  id: string;
  versions: Record<string, Post | null>;
}

export default function BlogList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);
  const [allData, setAllData] = useState<Record<string, Post[]>>({});
  const [groups, setGroups] = useState<PostGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // AI 翻译相关状态
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [selectedPost, setSelectedPost] = useState<{ id: string; title: string } | null>(null);

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

  // 加载当前语言的分类列表（用于筛选）
  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/blog/categories?locale=${locale}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setCategories(data);
    } catch (error) {
      console.error('加载分类失败:', error);
    }
  }, [locale]);

  // 加载所有文章
  const loadAllPosts = useCallback(async () => {
    if (availableLocales.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/blog?locales=${availableLocales.join(',')}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setAllData(data);
    } catch (error) {
      showToast('加载文章失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [availableLocales, showToast]);

  // 初始化
  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
    }
  }, [fetchAvailableLocales]);

  // 语言变化时加载分类列表
  useEffect(() => {
    if (locale) {
      loadCategories();
    }
  }, [locale, loadCategories]);

  useEffect(() => {
    if (availableLocales.length > 0) {
      loadAllPosts();
    }
  }, [availableLocales]);

  // 聚合分组
  useEffect(() => {
    const allLocaleCodes = availableLocales;
    const idMap: Record<string, PostGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const list = allData[loc] || [];
      list.forEach((post) => {
        if (!idMap[post.id]) {
          idMap[post.id] = { id: post.id, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[post.id].versions[l] = null; });
        }
        idMap[post.id].versions[loc] = post;
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

  // 获取当前语言的文章
  const getCurrentPost = (group: PostGroup): Post | null => {
    return group.versions[locale] || null;
  };

  // 搜索过滤（只搜索当前语言）
  const filteredGroups = useMemo(() => {
    let result = groups;
    // 按标题/URL搜索
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(group => {
        const current = group.versions[locale];
        if (current) {
          return current.title.toLowerCase().includes(lower) || current.slug.toLowerCase().includes(lower);
        }
        return false;
      });
    }
    // 按分类筛选
    if (selectedCategory) {
      result = result.filter(group => {
        const current = group.versions[locale];
        return current && current.category_id === selectedCategory;
      });
    }
    return result;
  }, [groups, searchTerm, selectedCategory, locale]);

  // 普通模式数据
  const currentLocalePosts = useMemo(() => {
    return allData[locale] || [];
  }, [allData, locale]);

  const filteredSimple = useMemo(() => {
    let result = currentLocalePosts;
    if (searchTerm.trim()) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(post =>
        post.title.toLowerCase().includes(lower) || post.slug.toLowerCase().includes(lower)
      );
    }
    if (selectedCategory) {
      result = result.filter(post => post.category_id === selectedCategory);
    }
    return result;
  }, [currentLocalePosts, searchTerm, selectedCategory]);

  // 删除文章
  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除文章“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/blog?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      showToast('删除成功', 'success');
      await loadAllPosts();
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
    router.push(`/admin/blog?locale=${newLocale}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

  const getVisibilityLabel = (vis: string) => {
    return vis === 'visible' ? '可见' : '隐藏';
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 顶部区域 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">博客文章管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          <Link
            href={`/admin/blog/edit?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建文章
          </Link>
        </div>
      </div>

      {/* 搜索栏 + 分类筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="搜索当前语言文章标题或 URL..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>
        <button className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1">
          <Search size={16} /> 搜索
        </button>
      </div>

      {/* 表格容器 - 添加 overflow-x-hidden 防止横向滚动 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md overflow-x-hidden">
        {/* 表格改为 w-full 而非 min-w-full */}
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[60%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                标题
              </th>
              <th className="w-28 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                更新时间
              </th>
              <th className="w-20 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                可见性
              </th>
              <th className="w-44 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentPost(group);
                const isExpanded = expandedIds.has(group.id);
                const hasChildren = Object.values(group.versions).some(v => v !== null);
                const otherLocales = availableLocales.filter(loc => loc !== locale);

                return (
                  <React.Fragment key={group.id}>
                    {/* 父行 */}
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => toggleExpand(group.id)}
                    >
                      {/* 父行标题列 - 添加宽度控制 */}
                      <td className="px-6 py-4 w-[60%] min-w-0 overflow-hidden">
                        <div className="flex items-center min-w-0">
                          {hasChildren && (
                            <button className="mr-2 flex-shrink-0 focus:outline-none">
                              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                          )}
                          <span
                            className="font-medium text-gray-900 truncate"
                            title={current?.title || ''}
                          >
                            {current?.title || `${getLanguageDisplayName(locale, 'zh')}（未设置）`}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {current ? new Date(current.updated_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {current ? getVisibilityLabel(current.visibility) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {current ? (
                          <>
                            {(locale === 'zh' || locale === 'en') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPost({ id: group.id, title: current.title });
                                  setShowAiHelper(true);
                                }}
                                className="text-purple-600 hover:text-purple-800 mr-2"
                              >
                                🤖 AI翻译
                              </button>
                            )}
                            <Link
                              href={`/admin/blog/edit?locale=${locale}&id=${group.id}`}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(group.id, locale, current.title); }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} className="inline" /> 删除
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/blog/edit?locale=${locale}&id=${group.id}`}
                            className="text-blue-600 hover:text-blue-800"
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
                        const post = group.versions[loc] || null;
                        const exists = post !== null;
                        const isZhOrEn = loc === 'zh' || loc === 'en';

                        return (
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            {/* 子行标题列 - 宽度控制及溢出隐藏 */}
                            <td className="px-6 py-3 pl-12 w-[60%] min-w-0 overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span
                                  className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'} truncate`}
                                  title={exists ? post.title : ''}
                                >
                                  {exists ? post.title : '（未设置）'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {exists ? new Date(post.updated_at).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-700">
                              {exists ? getVisibilityLabel(post.visibility) : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm w-44">
                              {exists ? (
                                <>
                                  <Link
                                    href={`/admin/blog/edit?locale=${loc}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(group.id, loc, post.title)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={14} className="inline" /> 删除
                                  </button>
                                </>
                              ) : (
                                isZhOrEn ? (
                                  <Link
                                    href={`/admin/blog/edit?locale=${loc}&id=${group.id}`}
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
              // 普通模式（非 zh/en）
              filteredSimple.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50">
                  {/* 普通模式标题列 - 添加宽度控制 */}
                  <td className="px-6 py-4 w-[60%] min-w-0 overflow-hidden">
                    <span className="font-medium text-gray-900 truncate block" title={post.title}>
                      {post.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(post.updated_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {getVisibilityLabel(post.visibility)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/blog/edit?locale=${locale}&id=${post.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil size={16} className="inline" /> 编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(post.id, locale, post.title)}
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
                      暂无文章，点击“新建文章”创建
                    </td>
                  </tr>
                )
              : filteredSimple.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                      该语言暂无文章
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* AI 翻译模态框 */}
      {showAiHelper && selectedPost && (
        <AiHelperBlogPostModal
          sourceLocale={locale}
          postId={selectedPost.id}
          postTitle={selectedPost.title}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            loadAllPosts();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}