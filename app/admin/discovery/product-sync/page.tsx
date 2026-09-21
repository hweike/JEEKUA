// app/admin/discovery/product-sync/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LanguageSelector from '@/components/common/LanguageSelector';
import { RefreshCw, ExternalLink, ChevronRight, ChevronDown, Settings, Search, Info, X } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages/config';
import Toast from '@/components/Toast';
import ProductSyncDialog from '../components/ProductSyncDialog';
import TranslationConfigPanel from './components/TranslationConfigPanel';

interface ProductSyncItem {
  productId: string;
  product_name: string;
  sku: string;
  slug: string | null;
  main_image_url: string | null;
  updatedAt: string;
  source_locale: string | null;
  source_product_id: string | null;
  parent_product_id: string | null;
  syncedCount: number;
  totalTargetCount: number;
  needSync: boolean;
}

interface ProcessedProduct extends ProductSyncItem {
  level: number;
  children?: ProcessedProduct[];
}

const validLocaleCodes = LANGUAGES.map(lang => lang.code);
const PAGE_SIZE = 50;

const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return validLocaleCodes[0] || 'zh';
  const stored = localStorage.getItem('admin_selected_language');
  if (stored && validLocaleCodes.includes(stored)) return stored;
  return validLocaleCodes[0] || 'zh';
};

type TabKey = 'list' | 'config';
type ProgressFilter = 'all' | 'synced' | 'unsynced';

export default function ProductSyncPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [uiLocale, setUiLocale] = useState(getInitialLocale);
  const [products, setProducts] = useState<ProductSyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [totalTargetCount, setTotalTargetCount] = useState(0);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [progressFilter, setProgressFilter] = useState<ProgressFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [syncProductIds, setSyncProductIds] = useState<string[]>([]);
  const [syncStrategy, setSyncStrategy] = useState<'full' | 'incremental'>('full');

  // 同步详情模态框状态
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailProductId, setDetailProductId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ locale: string; synced: boolean }[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const currentTab = (searchParams.get('tab') as TabKey) || 'list';
  const isEn = uiLocale === 'en';

  // 初始化界面语言
  useEffect(() => {
    const initLocale = async () => {
      const stored = localStorage.getItem('admin_selected_language');
      if (!stored) {
        try {
          const res = await fetch('/api/admin/languages/settings');
          const data = await res.json();
          const defaultLang = data.defaultLanguage || validLocaleCodes[0];
          localStorage.setItem('admin_selected_language', defaultLang);
          setUiLocale(defaultLang);
        } catch {
          const fallback = validLocaleCodes[0];
          localStorage.setItem('admin_selected_language', fallback);
          setUiLocale(fallback);
        }
      }
    };
    initLocale();
  }, []);

  // 加载数据（根据当前界面语言动态获取对应源语言的产品）
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const sourceLang = uiLocale;
      const res = await fetch(
        `/api/discovery/product-sync?sourceLocale=${sourceLang}&_=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProducts(data.items || []);
      setTotalTargetCount(data.totalTargetCount || 0);
      setSelectedIds(new Set());
      setExpandedParents(new Set());
      setCurrentPage(1);
    } catch (error) {
      console.error('加载失败:', error);
      setToast({ message: '加载数据失败', type: 'error' });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [uiLocale]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 构建层级
  const buildHierarchy = useCallback((items: ProductSyncItem[]): ProcessedProduct[] => {
    const parentMap = new Map<string, ProcessedProduct>();
    const childrenMap = new Map<string, ProcessedProduct[]>();
    for (const item of items) {
      if (!item.parent_product_id) {
        const processed: ProcessedProduct = { ...item, level: 0, children: [] };
        parentMap.set(item.productId, processed);
      } else {
        const parentId = item.parent_product_id;
        if (!childrenMap.has(parentId)) childrenMap.set(parentId, []);
        childrenMap.get(parentId)!.push({ ...item, level: 1 });
      }
    }
    const result: ProcessedProduct[] = [];
    for (const [parentId, parent] of parentMap) {
      const children = childrenMap.get(parentId) || [];
      children.sort((a, b) => a.product_name.localeCompare(b.product_name));
      parent.children = children;
      result.push(parent);
    }
    result.sort((a, b) => a.product_name.localeCompare(b.product_name));
    return result;
  }, []);

  const hierarchicalProducts = useMemo(() => buildHierarchy(products), [products, buildHierarchy]);

  // 构建父产品映射（用于变体快速查找）
  const parentMap = useMemo(() => {
    const map = new Map<string, ProcessedProduct>();
    for (const parent of hierarchicalProducts) {
      map.set(parent.productId, parent);
    }
    return map;
  }, [hierarchicalProducts]);

  // 扁平化（根据展开状态）
  const flattenedProducts = useMemo(() => {
    const result: ProcessedProduct[] = [];
    for (const parent of hierarchicalProducts) {
      result.push(parent);
      if (expandedParents.has(parent.productId)) {
        result.push(...(parent.children || []));
      }
    }
    return result;
  }, [hierarchicalProducts, expandedParents]);

  // 搜索和过滤（基于 flattenedProducts）
  const filteredProducts = useMemo(() => {
    let result = flattenedProducts;
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase();
      result = result.filter(p => 
        p.product_name.toLowerCase().includes(kw) || 
        p.sku.toLowerCase().includes(kw)
      );
    }
    if (progressFilter !== 'all') {
      result = result.filter(p => {
        if (isEn) {
          if (progressFilter === 'synced') return !p.needSync;
          if (progressFilter === 'unsynced') return p.needSync;
        } else {
          const isSynced = p.source_locale === 'en';
          if (progressFilter === 'synced') return isSynced;
          if (progressFilter === 'unsynced') return !isSynced;
        }
        return true;
      });
    }
    return result;
  }, [flattenedProducts, keyword, progressFilter, isEn]);

  // 分页
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage]);

  // 可选择的父产品（仅英文站显示复选框）
  const selectableParents = useMemo(() => {
    return hierarchicalProducts.filter(p => 
      p.source_locale === null || p.source_locale === 'zh'
    );
  }, [hierarchicalProducts]);

  const isAllSelected = selectableParents.length > 0 && selectedIds.size === selectableParents.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = paginatedProducts
        .filter(p => p.level === 0 && (p.source_locale === null || p.source_locale === 'zh'))
        .map(p => p.productId);
      setSelectedIds(prev => new Set([...prev, ...ids]));
    } else {
      const ids = paginatedProducts
        .filter(p => p.level === 0 && (p.source_locale === null || p.source_locale === 'zh'))
        .map(p => p.productId);
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        ids.forEach(id => newSet.delete(id));
        return newSet;
      });
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
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

  // 获取完整同步 ID 列表
  const getFullSyncIds = useCallback((ids: string[]) => {
    const allIds = new Set<string>(ids);
    for (const product of products) {
      if (ids.includes(product.productId) && !product.parent_product_id) {
        for (const child of products) {
          if (child.parent_product_id === product.productId) {
            allIds.add(child.productId);
          }
        }
      }
    }
    return Array.from(allIds);
  }, [products]);

  // 打开同步对话框
  const openSyncDialog = (ids: string[], strategy: 'full' | 'incremental' = 'full') => {
    if (!isEn) {
      setToast({ message: '只有英文站可作为源站点进行同步', type: 'error' });
      return;
    }
    if (ids.length === 0) {
      setToast({ message: '没有可同步的产品', type: 'error' });
      return;
    }
    setSyncProductIds(getFullSyncIds(ids));
    setSyncStrategy(strategy);
    setShowSyncDialog(true);
  };

  // 全量同步（针对所选产品）
  const handleFullSync = () => {
    if (selectedIds.size === 0) {
      setToast({ message: '请先选择产品', type: 'error' });
      return;
    }
    openSyncDialog(Array.from(selectedIds), 'full');
  };

  // 增量同步（针对所选产品）
  const handleIncrementalSync = () => {
    if (selectedIds.size === 0) {
      setToast({ message: '请先选择产品', type: 'error' });
      return;
    }
    openSyncDialog(Array.from(selectedIds), 'incremental');
  };

  const handleSyncComplete = () => {
    loadData();
    setToast({ message: '同步完成！', type: 'success' });
  };

  // 打开详情模态框（支持变体重定向到父产品）
  const openDetailModal = async (productId: string, parentId?: string) => {
    const targetId = parentId || productId;
    setDetailProductId(targetId);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/discovery/product-sync/detail?productId=${targetId}&sourceLocale=en`);
      const data = await res.json();
      setDetailData(data.details || []);
    } catch (err) {
      console.error(err);
      setDetailData([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const getSiteBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  };

  // 渲染同步进度（变体继承父产品数据）
  const renderSyncProgress = (item: ProcessedProduct) => {
    // 如果是变体，获取父产品数据
    let effectiveItem = item;
    if (item.level === 1 && item.parent_product_id) {
      const parent = parentMap.get(item.parent_product_id);
      if (parent) {
        effectiveItem = parent;
      }
    }

    if (isEn) {
      if (effectiveItem.source_locale === null) {
        // 原始英文产品（或父产品为原始英文）
        return (
          <div 
            className="flex items-center cursor-pointer hover:opacity-80"
            onClick={() => openDetailModal(item.productId, effectiveItem.productId)}
            title="点击查看同步详情"
          >
            <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{ width: `${totalTargetCount > 0 ? (effectiveItem.syncedCount / totalTargetCount) * 100 : 0}%` }}
              />
            </div>
            <span className="text-sm text-gray-700">
              {effectiveItem.syncedCount}/{totalTargetCount}
            </span>
            {effectiveItem.needSync && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                待同步
              </span>
            )}
          </div>
        );
      } else {
        const sourceLang = effectiveItem.source_locale === 'zh' ? '中文' : (effectiveItem.source_locale || '其他');
        return <span className="text-sm text-green-600">已从{sourceLang}站同步</span>;
      }
    } else {
      // 非英文站
      if (effectiveItem.source_locale === 'en') {
        return <span className="text-sm text-green-600">已从英文站同步</span>;
      } else {
        return <span className="text-sm text-yellow-600">待同步</span>;
      }
    }
  };

  // Tab 切换
  const handleTabChange = (tab: TabKey) => {
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`?${params.toString()}`);
  };

  // ========== 渲染列表 ==========
  const renderListTab = () => (
    <>
      {/* 搜索与过滤 */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索产品名称 / SKU"
            className="pl-9 pr-4 py-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <select
            value={progressFilter}
            onChange={e => setProgressFilter(e.target.value as ProgressFilter)}
            className="border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">全部进度</option>
            {isEn ? (
              <>
                <option value="synced">完全同步</option>
                <option value="unsynced">部分同步</option>
              </>
            ) : (
              <>
                <option value="synced">已从英文站同步</option>
                <option value="unsynced">待同步</option>
              </>
            )}
          </select>
        </div>
        <div className="text-sm text-gray-500">
          共 {filteredProducts.length} 个产品
        </div>
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
              全选当前页
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
        ) : paginatedProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无匹配产品</div>
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
                  产品名称
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
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
              {paginatedProducts.map((item) => {
                const isParent = item.level === 0;
                const isChild = item.level === 1;
                const isSelectable = isParent && (item.source_locale === null || item.source_locale === 'zh');

                return (
                  <tr key={item.productId} className={`hover:bg-gray-50 ${isParent ? 'bg-gray-50' : 'bg-white'}`}>
                    {isEn && (
                      <td className="min-w-[40px] w-10 px-6 py-4 whitespace-nowrap">
                        {isSelectable ? (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.productId)}
                            onChange={(e) => handleSelect(item.productId, e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                        ) : (
                          <span className="inline-block w-4 h-4" />
                        )}
                      </td>
                    )}
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center">
                        {isParent && item.children && item.children.length > 0 && (
                          <button
                            onClick={() => toggleExpand(item.productId)}
                            className="mr-2 focus:outline-none"
                          >
                            {expandedParents.has(item.productId) ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        )}
                        {isParent && (!item.children || item.children.length === 0) && (
                          <span className="inline-block w-6" />
                        )}
                        <div className={`text-sm ${isChild ? 'ml-6' : 'font-medium'} text-gray-900`}>
                          {item.product_name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderSyncProgress(item)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a
                        href={`${getSiteBaseUrl()}/${uiLocale}/product/${item.slug || item.productId}`}
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

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-4">
          <div className="text-sm text-gray-500">
            第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              上一页
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </>
  );

  // ========== 渲染配置面板 ==========
  const renderConfigTab = () => <TranslationConfigPanel />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">产品多语言同步与发布（源语言：英文）</h1>
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
              currentLocale={uiLocale}
              onLocaleChange={(newLocale) => {
                if (newLocale === uiLocale) return;
                localStorage.setItem('admin_selected_language', newLocale);
                setUiLocale(newLocale);
              }}
              displayMode="zh"
            />
          </div>
        </div>

        {/* 提示说明面板（仅英文站显示） */}
        {isEn && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p><strong>📌 使用说明：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>本功能仅支持以 <strong>英文站</strong> 作为源站点，可将产品发布到系统支持的任意语言（包括中文、德语等），并自动调用 AI 完成翻译。</li>
                  <li>翻译服务由 <strong>DeepSeek</strong> 提供。由于 AI 对输出长度有限制，建议每次同步选择 <strong>少于 5 个</strong> 目标语言，分多次完成，以保证翻译质量。</li>
                  <li>同步过程中 <strong>请勿关闭当前页面</strong>，否则会中断操作，无法查看实时进度。如需后台运行，请等待任务完成后刷新页面确认结果。</li>
                  <li>AI 翻译会消耗 API Token，请合理规划同步任务，避免不必要的重复发布、翻译或覆盖。</li>
                  <li><strong>覆盖规则：</strong> 若目标语言已存在相同 ID 的产品，在“复制”或“复制并翻译”模式下，现有数据将被覆盖。</li>
                  <li>使用“<strong>全量同步</strong>”将同步所选产品到所有选中的目标语言（覆盖）；“<strong>增量同步</strong>”仅同步尚未同步过的语言。</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 导航 */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('list')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'list'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              产品列表
            </button>
            <button
              onClick={() => handleTabChange('config')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                currentTab === 'config'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="inline w-4 h-4 mr-1" />
              翻译配置
            </button>
          </nav>
        </div>

        {/* Tab 内容 */}
        {currentTab === 'list' ? renderListTab() : renderConfigTab()}
      </div>

      {/* ===== 底部悬浮条（仅英文站显示，且有选中产品时） ===== */}
      {isEn && selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">
              已选择 {selectedIds.size} 个产品
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => handleSelectAll(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50 transition text-gray-700"
              >
                取消选择
              </button>
              <button
                onClick={handleIncrementalSync}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                增量同步
              </button>
              <button
                onClick={handleFullSync}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                全量同步
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 同步对话框 */}
      <ProductSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        productIds={syncProductIds}
        onComplete={handleSyncComplete}
        selectedCount={syncProductIds.length}
        title="同步产品到目标站点"
        syncStrategy={syncStrategy}
      />

      {/* ===== 同步详情模态框（带滚动条） ===== */}
      {detailModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">同步详情</h3>
              <button onClick={() => setDetailModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="text-center py-4">加载中...</div>
              ) : (
                <div>
                  {detailData.length === 0 ? (
                    <p className="text-gray-500">暂无同步数据</p>
                  ) : (
                    <ul className="space-y-2">
                      {detailData.map((item) => {
                        const langName = LANGUAGES.find(l => l.code === item.locale)?.zhName || item.locale;
                        return (
                          <li key={item.locale} className="flex justify-between items-center">
                            <span>{langName}</span>
                            <span className={item.synced ? 'text-green-600' : 'text-gray-400'}>
                              {item.synced ? '✅ 已同步' : '⬜ 未同步'}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="p-4 border-t flex justify-end flex-shrink-0">
              <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition">
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}