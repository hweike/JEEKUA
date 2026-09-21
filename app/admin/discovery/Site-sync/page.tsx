// app/admin/discovery/Site-sync/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LanguageSelector from '@/components/common/LanguageSelector';
import { RefreshCw, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages/config';
import SiteSyncDialog from '../components/SiteSyncDialog';
import Toast from '@/components/Toast';

type TabKey = 'productCollection' | 'product';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'productCollection', label: '产品分类' },
  { key: 'product', label: '产品' },
];

interface SyncPage {
  id: string;
  locale: string;
  type: string;
  title: string;
  slug: string;
  url: string;
  updatedAt: string;
  content_hash: string;
  syncedCount: number;
  totalTargetCount: number;
  needSync: boolean;
  source_locale?: string | null;
  source_content_hash?: string | null;
}

interface ProcessedPage extends SyncPage {
  level: number;
  children?: ProcessedPage[];
}

const validLocaleCodes = LANGUAGES.map(lang => lang.code);
const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return validLocaleCodes[0] || 'en';
  const stored = localStorage.getItem('admin_selected_language');
  if (stored && validLocaleCodes.includes(stored)) return stored;
  return validLocaleCodes[0] || 'en';
};

export default function SiteSyncPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [locale, setLocale] = useState(getInitialLocale);
  const [pages, setPages] = useState<SyncPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalTargetCount, setTotalTargetCount] = useState(0);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  const currentTab = (searchParams.get('tab') as TabKey) || 'productCollection';
  const isEn = locale === 'en';

  // 初始化语言设置
  useEffect(() => {
    const initLocale = async () => {
      const stored = localStorage.getItem('admin_selected_language');
      if (!stored) {
        try {
          const res = await fetch('/api/admin/languages/settings');
          const data = await res.json();
          const defaultLang = data.defaultLanguage || validLocaleCodes[0];
          localStorage.setItem('admin_selected_language', defaultLang);
          setLocale(defaultLang);
        } catch {
          const fallback = validLocaleCodes[0];
          localStorage.setItem('admin_selected_language', fallback);
          setLocale(fallback);
        }
      }
    };
    initLocale();
  }, []);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const res = await fetch(
        `/api/discovery/Site-sync?sourceLocale=${locale}&types=${currentTab}&_=${timestamp}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      console.log('✅ API 响应数据:', data);
      console.log('📦 页面数量:', data.pages?.length || 0);
      // 确保 pages 始终为数组
      setPages(data.pages || []);
      setTotalTargetCount(data.totalTargetCount || 0);
      // 重置选中和展开状态
      setSelectedIds(new Set());
      setExpandedParents(new Set());
      console.log('✅ pages 状态已设置');
    } catch (error) {
      console.error('❌ 加载失败:', error);
      setToast({ message: '加载数据失败', type: 'error' });
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [locale, currentTab]);

  // 初次加载和参数变化时重新加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 监听 pages 变化
  useEffect(() => {
    console.log('📌 pages 状态变化:', pages.length, '条');
  }, [pages]);

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    localStorage.setItem('admin_selected_language', newLocale);
    setLocale(newLocale);
    router.push(`/admin/discovery/Site-sync?tab=${currentTab}`);
  };

  const handleTabChange = (tab: TabKey) => {
    router.push(`/admin/discovery/Site-sync?tab=${tab}`);
  };

  // 构建层级结构
  const buildHierarchy = useCallback((pages: SyncPage[]): ProcessedPage[] => {
    const parentMap = new Map<string, ProcessedPage>();
    const childrenMap = new Map<string, ProcessedPage[]>();

    for (const page of pages) {
      const parts = page.id.split('/');
      if (parts.length === 1) {
        // 父级
        const processed: ProcessedPage = { ...page, level: 0, children: [] };
        parentMap.set(page.id, processed);
      } else if (parts.length === 2) {
        // 子级：父ID/子ID
        const parentId = parts[0];
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)!.push({ ...page, level: 1 });
      } else {
        // 其他（如多层）作为父级
        const processed: ProcessedPage = { ...page, level: 0, children: [] };
        parentMap.set(page.id, processed);
      }
    }

    const result: ProcessedPage[] = [];
    for (const [parentId, parent] of parentMap) {
      const children = childrenMap.get(parentId) || [];
      children.sort((a, b) => a.title.localeCompare(b.title));
      parent.children = children;
      result.push(parent);
    }
    result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, []);

  const hierarchicalPages = useMemo(() => {
    const result = buildHierarchy(pages);
    console.log('🏗️ hierarchicalPages:', result.length);
    return result;
  }, [pages, buildHierarchy]);

  const flattenedPages = useMemo(() => {
    const result: ProcessedPage[] = [];
    for (const parent of hierarchicalPages) {
      result.push(parent);
      if (expandedParents.has(parent.id)) {
        result.push(...(parent.children || []));
      }
    }
    console.log('📋 flattenedPages:', result.length);
    return result;
  }, [hierarchicalPages, expandedParents]);

  // 可选页面
  const selectableParents = useMemo(() => {
    if (!isEn) return [];
    return hierarchicalPages.filter(p => p.source_locale === null);
  }, [hierarchicalPages, isEn]);

  const isAllSelected = selectableParents.length > 0 && selectedIds.size === selectableParents.length;

  const handleSelectAll = (checked: boolean) => {
    if (!isEn) return;
    if (checked) {
      const ids = selectableParents.map(p => p.id);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (!isEn) return;
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const getFullSyncIds = useCallback(() => {
    const allIds = new Set<string>(selectedIds);
    for (const page of pages) {
      if (!page.id.includes('/') && selectedIds.has(page.id)) {
        for (const child of pages) {
          if (child.id.startsWith(page.id + '/')) {
            allIds.add(child.id);
          }
        }
      }
    }
    return Array.from(allIds);
  }, [selectedIds, pages]);

  const handleBatchSync = () => {
    const fullIds = getFullSyncIds();
    if (fullIds.length === 0) {
      setToast({ message: '请至少选择一个页面', type: 'error' });
      return;
    }
    setShowSyncDialog(true);
  };

  const handleSyncConfirm = async (
    source: string,
    targets: string[],
    options: { mode: 'repair' | 'copy' | 'copy_translate' }
  ): Promise<{ success: boolean; message?: string }> => {
    try {
      const fullIds = getFullSyncIds();
      const res = await fetch('/api/discovery/sync-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocale: source,
          targetLocales: targets,
          pageIds: fullIds,
          mode: options.mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失败');
      await loadData();
      setToast({ message: '同步完成！', type: 'success' });
      return { success: true };
    } catch (error: any) {
      const errMsg = error.message || '同步失败';
      setToast({ message: errMsg, type: 'error' });
      return { success: false, message: errMsg };
    }
  };

  const getSiteBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL;
    }
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  };

  const renderSyncProgress = (page: ProcessedPage) => {
    if (isEn) {
      if (page.source_locale === null) {
        return (
          <div className="flex items-center">
            <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${totalTargetCount > 0 ? (page.syncedCount / totalTargetCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-gray-700">
              {page.syncedCount}/{totalTargetCount}
            </span>
            {page.needSync && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                待同步
              </span>
            )}
          </div>
        );
      } else {
        const sourceLang = page.source_locale === 'zh' ? '中文' : (page.source_locale || '其他');
        return <span className="text-sm text-green-600">已从{sourceLang}站同步</span>;
      }
    } else {
      if (page.source_locale === null) {
        return <span className="text-sm text-yellow-600">待同步</span>;
      } else {
        return <span className="text-sm text-green-600">已从英文站同步</span>;
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">站点同步管理</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              title="刷新数据"
              disabled={loading}
            >
              <RefreshCw size={20} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <LanguageSelector
              currentLocale={locale}
              onLocaleChange={handleLocaleChange}
              displayMode="zh"
            />
          </div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`
                  py-2 px-1 border-b-2 font-medium text-sm
                  ${currentTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isEn && (
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="select-all"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="select-all" className="text-sm text-gray-700">
                全选
              </label>
              {selectedIds.size > 0 && (
                <span className="text-sm text-gray-500 ml-2">
                  已选择 {selectedIds.size} 项
                </span>
              )}
            </div>
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : flattenedPages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无数据</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {isEn && (
                    <th scope="col" className="min-w-[40px] w-10 px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    标题
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    类型
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后更新
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    同步进度
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flattenedPages.map((page) => {
                  const isParent = page.level === 0;
                  const isChild = page.level === 1;
                  const isSelectable = isEn && isParent && page.source_locale === null;

                  return (
                    <tr key={page.id} className={`hover:bg-gray-50 ${isParent ? 'bg-gray-50' : 'bg-white'}`}>
                      {isEn && (
                        <td className="min-w-[40px] w-10 px-6 py-4 whitespace-nowrap">
                          {isSelectable ? (
                            <input
                              type="checkbox"
                              checked={selectedIds.has(page.id)}
                              onChange={(e) => handleSelect(page.id, e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          ) : (
                            <span className="inline-block w-4 h-4" />
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 text-left">
                        <div className="flex items-center">
                          {isParent && page.children && page.children.length > 0 && (
                            <button
                              onClick={() => toggleExpand(page.id)}
                              className="mr-2 focus:outline-none"
                            >
                              {expandedParents.has(page.id) ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                          )}
                          {isParent && (!page.children || page.children.length === 0) && (
                            <span className="inline-block w-6" />
                          )}
                          <div
                            className={`text-sm ${isChild ? 'ml-6' : 'font-medium'} text-gray-900`}
                          >
                            {page.title}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {page.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(page.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderSyncProgress(page)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`${getSiteBaseUrl()}/${locale}${page.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          访问页面 <ExternalLink className="w-4 h-4 ml-1" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* 底部悬浮条 */}
      {isEn && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-between items-center z-50">
          <span className="text-sm text-gray-700">已选择 {selectedIds.size} 个页面</span>
          <div className="flex gap-4">
            <button
              onClick={() => handleSelectAll(false)}
              className="px-4 py-2 border rounded hover:bg-gray-50 transition"
            >
              取消选择
            </button>
            <button
              onClick={handleBatchSync}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              批量同步
            </button>
          </div>
        </div>
      )}

      <SiteSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        pageIds={getFullSyncIds()}
        onComplete={loadData}
        selectedCount={getFullSyncIds().length}
        title="批量同步到目标站点"
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}