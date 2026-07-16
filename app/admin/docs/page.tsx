'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Search, FolderOpen } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';
import { getLanguageDisplayName } from '@/lib/languages/config';
import AiHelperDocModal from './components/AiHelperDocModal';

interface Doc {
  id: string;
  title: string;
  slug: string;
  locale: string;
  updatedAt?: string;
  createdAt?: string;
  parentId?: string | null;
  order?: number;
}

interface DocGroup {
  id: string;
  versions: Record<string, Doc | null>;
}

interface DocsLib {
  id: string;
  name: string;
}

export default function DocsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [availableLocales, setAvailableLocales] = useState<string[]>([]);

  const [docsLibs, setDocsLibs] = useState<DocsLib[]>([]);
  const [currentLibId, setCurrentLibId] = useState(searchParams.get('docsLibId') || '');

  const [allData, setAllData] = useState<Record<string, Doc[]>>({});
  const [groups, setGroups] = useState<DocGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copying, setCopying] = useState<{ id: string; target: string } | null>(null);

  const [showAiHelper, setShowAiHelper] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; title: string } | null>(null);

  const initialLoadRef = useRef(false);
  const isLoadingRef = useRef(false);

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

  const fetchDocsLibs = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/docs-libs?locale=zh`);
      if (!res.ok) throw new Error('加载文档库失败');
      const data = await res.json();
      setDocsLibs(data);
      const libIdFromUrl = searchParams.get('docsLibId');
      if (libIdFromUrl && data.some((lib: DocsLib) => lib.id === libIdFromUrl)) {
        setCurrentLibId(libIdFromUrl);
      } else if (data.length > 0) {
        setCurrentLibId(data[0].id);
      }
    } catch (error) {
      showToast('加载文档库失败', 'error');
    }
  }, [searchParams, showToast]);

  const loadAllDocs = useCallback(async () => {
    if (!currentLibId || availableLocales.length === 0) return;
    try {
      const res = await fetch(`/api/admin/docs?docsLibId=${currentLibId}&locales=${availableLocales.join(',')}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setAllData(data);
    } catch (error) {
      console.warn('批量接口失败，使用并发请求降级', error);
      try {
        const results = await Promise.all(
          availableLocales.map(async (loc) => {
            const res = await fetch(`/api/admin/docs?locale=${loc}&docsLibId=${currentLibId}`);
            if (!res.ok) throw new Error(`加载 ${loc} 失败`);
            const data = await res.json();
            return { locale: loc, docs: data };
          })
        );
        const fallbackData: Record<string, Doc[]> = {};
        results.forEach(({ locale, docs }) => {
          fallbackData[locale] = docs;
        });
        setAllData(fallbackData);
      } catch (fallbackError) {
        showToast('加载文档失败', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [currentLibId, availableLocales, showToast]);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      fetchAvailableLocales();
      fetchDocsLibs();
    }
  }, [fetchAvailableLocales, fetchDocsLibs]);

  useEffect(() => {
    if (availableLocales.length > 0 && currentLibId && !isLoadingRef.current) {
      isLoadingRef.current = true;
      loadAllDocs().finally(() => {
        isLoadingRef.current = false;
      });
    }
  }, [availableLocales, currentLibId, loadAllDocs]);

  useEffect(() => {
    const allLocaleCodes = Array.from(new Set([...availableLocales, ...Object.keys(allData)]));
    const idMap: Record<string, DocGroup> = {};

    allLocaleCodes.forEach((loc) => {
      const list = allData[loc] || [];
      list.forEach((doc) => {
        if (!idMap[doc.id]) {
          idMap[doc.id] = { id: doc.id, versions: {} };
          allLocaleCodes.forEach((l) => { idMap[doc.id].versions[l] = null; });
        }
        idMap[doc.id].versions[loc] = doc;
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

  const getCurrentDoc = (group: DocGroup): Doc | null => {
    return group.versions[locale] || null;
  };

  const hasEnglishVersion = (group: DocGroup): boolean => {
    return group.versions['en'] !== null;
  };

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const lower = searchTerm.toLowerCase();
    return groups.filter(group => {
      const current = group.versions[locale];
      return current && (current.title.toLowerCase().includes(lower) || current.slug.toLowerCase().includes(lower));
    });
  }, [groups, searchTerm, locale]);

  const filteredSimple = useMemo(() => {
    const list = allData[locale] || [];
    if (!searchTerm.trim()) return list;
    const lower = searchTerm.toLowerCase();
    return list.filter(doc =>
      doc.title.toLowerCase().includes(lower) ||
      doc.slug.toLowerCase().includes(lower)
    );
  }, [allData, locale, searchTerm]);

  const handleDelete = async (id: string, locale: string, title: string) => {
    if (!confirm(`确定删除文档“${title}” (${locale}) 吗？`)) return;
    try {
      const res = await fetch(`/api/admin/docs?locale=${locale}&docsLibId=${currentLibId}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('删除失败');
      showToast('删除成功', 'success');
      await loadAllDocs();
    } catch (error) {
      showToast('删除失败', 'error');
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
    const params = new URLSearchParams(searchParams.toString());
    params.set('locale', newLocale);
    params.set('docsLibId', currentLibId);
    router.push(`/admin/docs?${params.toString()}`);
  };

  const handleLibChange = (libId: string) => {
    setCurrentLibId(libId);
    const params = new URLSearchParams(searchParams.toString());
    params.set('docsLibId', libId);
    params.set('locale', locale);
    router.push(`/admin/docs?${params.toString()}`);
  };

  const isCollapsibleMode = locale === 'zh' || locale === 'en';

  const handleNewDoc = () => {
    router.push(`/admin/docs/edit?locale=${locale}&docsLibId=${currentLibId}`);
  };

  if (loading) return <div className="p-6 text-center">加载中...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部 */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">文档管理</h1>
          <span className="text-sm text-gray-500">文档库：</span>
          <select
            value={currentLibId}
            onChange={(e) => handleLibChange(e.target.value)}
            className="border rounded px-3 py-1 bg-white"
            disabled={docsLibs.length === 0}
          >
            {docsLibs.map(lib => (
              <option key={lib.id} value={lib.id}>{lib.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          <button
            onClick={handleNewDoc}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建文档
          </button>
        </div>
      </div>

      {/* 搜索 */}
      <div className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="搜索当前语言文档标题或 URL..."
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
        <table className="w-full table-fixed divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[60%] px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-0">
                标题
              </th>
              <th className="w-32 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                更新时间
              </th>
              <th className="w-44 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isCollapsibleMode ? (
              filteredGroups.map((group) => {
                const current = getCurrentDoc(group);
                const hasEnglish = hasEnglishVersion(group);
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
                      <td className="px-6 py-4">
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
                        {current ? (current.updatedAt ? new Date(current.updatedAt).toLocaleDateString() : '-') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {current ? (
                          <>
                            <Link
                              href={`/admin/docs/edit?locale=${locale}&docsLibId=${currentLibId}&id=${group.id}`}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Pencil size={16} className="inline" /> 编辑
                            </Link>
                            {(locale === 'zh' || locale === 'en') && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedDoc({ id: group.id, title: current.title });
                                  setShowAiHelper(true);
                                }}
                                className="text-blue-600 hover:text-blue-800 mr-3"
                              >
                                🤖 AI翻译
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(group.id, locale, current.title); }}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 size={16} className="inline" /> 删除
                            </button>
                          </>
                        ) : (
                          <Link
                            href={`/admin/docs/edit?locale=${locale}&docsLibId=${currentLibId}&id=${group.id}`}
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
                        const doc = group.versions[loc] || null;
                        const exists = doc !== null;
                        const isZhOrEn = loc === 'zh' || loc === 'en';

                        return (
                          <tr key={`${group.id}-${loc}`} className="bg-gray-50 hover:bg-gray-100">
                            <td className="px-6 py-3 pl-12">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-medium text-gray-500 w-16 flex-shrink-0">
                                  {getLanguageDisplayName(loc, 'zh')}
                                </span>
                                <span
                                  className={`text-sm ${exists ? 'text-gray-900' : 'text-gray-400'} truncate`}
                                  title={exists ? doc.title : ''}
                                >
                                  {exists ? doc.title : '（未设置）'}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                              {exists ? (doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : '-') : '-'}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap text-sm">
                              {exists ? (
                                <>
                                  <Link
                                    href={`/admin/docs/edit?locale=${loc}&docsLibId=${currentLibId}&id=${group.id}`}
                                    className="text-blue-600 hover:text-blue-800 mr-3"
                                  >
                                    <Pencil size={14} className="inline" /> 编辑
                                  </Link>
                                  <button
                                    onClick={() => handleDelete(group.id, loc, doc.title)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 size={14} className="inline" /> 删除
                                  </button>
                                </>
                              ) : (
                                isZhOrEn ? (
                                  <Link
                                    href={`/admin/docs/edit?locale=${loc}&docsLibId=${currentLibId}&id=${group.id}`}
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
              filteredSimple.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-medium text-gray-900 truncate block" title={doc.title}>
                      {doc.title}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Link
                      href={`/admin/docs/edit?locale=${locale}&docsLibId=${currentLibId}&id=${doc.id}`}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Pencil size={16} className="inline" /> 编辑
                    </Link>
                    <button
                      onClick={() => handleDelete(doc.id, locale, doc.title)}
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
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                      暂无文档，点击“新建文档”创建
                    </td>
                  </tr>
                )
              : filteredSimple.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-gray-400">
                      该语言暂无文档
                    </td>
                  </tr>
                )}
          </tbody>
        </table>
      </div>

      {/* AI 翻译助手模态框 */}
      {showAiHelper && selectedDoc && (
        <AiHelperDocModal
          sourceLocale={locale}
          docId={selectedDoc.id}
          docTitle={selectedDoc.title}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            loadAllDocs();
            setShowAiHelper(false);
          }}
        />
      )}
    </div>
  );
}