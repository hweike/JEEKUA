// app/admin/discovery/cn2en-sync/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { RefreshCw, ExternalLink, ChevronRight, ChevronDown } from 'lucide-react';
import Cn2enSyncDialog from '../components/Cn2enSyncDialog';
import Toast from '@/components/Toast';

// ========== 从 products 表读取的数据结构 ==========
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
  syncedCount: number;          // 1 表示已同步到英文，0 表示未同步
  totalTargetCount: number;     // 固定为 1（英文）
  needSync: boolean;
}

interface ProcessedProduct extends ProductSyncItem {
  level: number;
  children?: ProcessedProduct[];
}

export default function Cn2EnSyncPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<ProductSyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // 加载中文产品数据（仅父产品+变体）
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/discovery/product-sync?sourceLocale=zh&_=${Date.now()}`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      // 只保留中文产品（sourceLocale=zh 已经指定，返回的就是中文）
      setProducts(data.items || []);
      setSelectedIds(new Set());
      setExpandedParents(new Set());
    } catch (error) {
      console.error(error);
      setToast({ message: '加载数据失败', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 构建层级结构（基于 parent_product_id）
  const buildHierarchy = useCallback((items: ProductSyncItem[]): ProcessedProduct[] => {
    const parentMap = new Map<string, ProcessedProduct>();
    const childrenMap = new Map<string, ProcessedProduct[]>();

    for (const item of items) {
      if (!item.parent_product_id) {
        // 父级
        const processed: ProcessedProduct = { ...item, level: 0, children: [] };
        parentMap.set(item.productId, processed);
      } else {
        // 子级
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

  // ✅ 所有父产品都可选（无论是否已同步）
  const selectableParents = useMemo(() => {
    return hierarchicalProducts;
  }, [hierarchicalProducts]);

  const isAllSelected = selectableParents.length > 0 && selectedIds.size === selectableParents.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = selectableParents.map(p => p.productId);
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
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

  // 获取完整同步 ID 列表（包含变体）
  const getFullSyncIds = useCallback(() => {
    const allIds = new Set<string>(selectedIds);
    for (const product of products) {
      if (selectedIds.has(product.productId) && !product.parent_product_id) {
        for (const child of products) {
          if (child.parent_product_id === product.productId) {
            allIds.add(child.productId);
          }
        }
      }
    }
    return Array.from(allIds);
  }, [selectedIds, products]);

  const handleBatchSync = () => {
    const fullIds = getFullSyncIds();
    if (fullIds.length === 0) {
      setToast({ message: '请至少选择一个产品', type: 'error' });
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
      const res = await fetch('/api/discovery/product-sync/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLocale: 'zh',
          targetLocales: ['en'],
          productIds: fullIds,
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

  // ✅ 同步状态：显示进度条或“已从英文站同步”
  const renderSyncStatus = (item: ProcessedProduct) => {
    if (item.source_locale === 'en') {
      return <span className="text-sm text-green-600">已从英文站同步</span>;
    } else {
      // 原始中文产品（source_locale === null）显示进度条
      return (
        <div className="flex items-center">
          <div className="w-32 bg-gray-200 rounded-full h-2.5 mr-2">
            <div
              className="bg-green-600 h-2.5 rounded-full"
              style={{ width: `${item.syncedCount > 0 ? 100 : 0}%` }}
            />
          </div>
          <span className="text-sm text-gray-700">
            {item.syncedCount}/{item.totalTargetCount}
          </span>
          {item.needSync && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
              待同步
            </span>
          )}
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            中文 → 英文 产品同步
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={loadData}
              className="p-2 rounded-full hover:bg-gray-200 transition"
              title="刷新数据"
              disabled={loading}
            >
              <RefreshCw size={20} className={`text-gray-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="text-sm text-gray-600">
              源：中文站 &nbsp;→&nbsp; 目标：英文站
            </div>
          </div>
        </div>

        {/* 工具栏 */}
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

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {loading ? (
            <div className="text-center py-12 text-gray-500">加载中...</div>
          ) : flattenedProducts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无中文产品</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="min-w-[40px] w-10 px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </th>
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
                    同步状态
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flattenedProducts.map((item) => {
                  const isParent = item.level === 0;
                  const isChild = item.level === 1;
                  const isSelectable = isParent; // ✅ 所有父产品均可选

                  return (
                    <tr key={item.productId} className={`hover:bg-gray-50 ${isParent ? 'bg-gray-50' : 'bg-white'}`}>
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
                          <div
                            className={`text-sm ${isChild ? 'ml-6' : 'font-medium'} text-gray-900`}
                          >
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
                        {renderSyncStatus(item)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`${getSiteBaseUrl()}/zh/product/${item.slug || item.productId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          查看中文页 <ExternalLink className="w-4 h-4 ml-1" />
                        </a>
                        {item.syncedCount > 0 && (
                          <a
                            href={`${getSiteBaseUrl()}/en/product/${item.slug || item.productId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-900 flex items-center ml-3"
                          >
                            英文页 <ExternalLink className="w-4 h-4 ml-1" />
                          </a>
                        )}
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
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 flex justify-between items-center z-50">
          <span className="text-sm text-gray-700">已选择 {selectedIds.size} 个产品</span>
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
              同步到英文站
            </button>
          </div>
        </div>
      )}

      <Cn2enSyncDialog
        isOpen={showSyncDialog}
        onClose={() => setShowSyncDialog(false)}
        onSync={handleSyncConfirm}
        selectedCount={getFullSyncIds().length}
        title="同步中文产品到英文站"
        pageIds={getFullSyncIds()}
      />

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}