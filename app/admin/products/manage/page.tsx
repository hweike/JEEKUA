'use client';

import { useState, useEffect, useCallback, useTransition, useRef, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { ProductCard } from './components/ProductCard';
import { Pagination } from '@/components/common/Pagination';
import { SearchBar } from './components/SearchBar';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import { LANGUAGES } from '@/lib/languages/config';

// 懒加载弹窗组件
const CategorySelectModal = dynamic(() => import('./components/CategorySelectModal'), { ssr: false });
const VariantEditModal = dynamic(() => import('./components/VariantEditModal'), { ssr: false });
const ImportProductsModal = dynamic(() => import('./components/ImportProductsModal'), { ssr: false });
const ImportProductsJsonModal = dynamic(() => import('./components/ImportProductsJsonModal'), { ssr: false });

// ==================== 类型定义 ====================
interface Product {
  productId: string;
  product_name: string;
  sku: string;
  categoryId: string;
  seriesId?: string;
  status: 'published' | 'draft' | 'offline';
  main_image_url: string;
  price_tiers: any;
  currency: string;
  min_order_quantity: number;
  [key: string]: any;
}

interface StatusCount {
  published: number;
  draft: number;
  offline: number;
}

interface CategoryInfo {
  name: string;
  series: Map<string, string>;
}

// 骨架屏组件
function ProductCardSkeleton() {
  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden animate-pulse">
      <div className="flex p-4 gap-4">
        <div className="flex-shrink-0 pt-2">
          <div className="w-4 h-4 bg-gray-200 rounded"></div>
        </div>
        <div className="flex-shrink-0 w-[150px] h-[150px] bg-gray-200 rounded"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    </div>
  );
}

// ==================== 常量 ====================
const validLocaleCodes = LANGUAGES.map(lang => lang.code);
const PAGE_SIZE = 20;

const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return validLocaleCodes[0] || 'zh';
  const stored = localStorage.getItem('admin_selected_language');
  if (stored && validLocaleCodes.includes(stored)) return stored;
  return validLocaleCodes[0] || 'zh';
};

export default function ProductManagePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const abortControllerRef = useRef<AbortController | null>(null);

  // 语言状态（与 URL 同步）
  const [locale, setLocale] = useState(getInitialLocale);

  // URL 参数
  const status = searchParams.get('status') || 'all';
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const seriesId = searchParams.get('seriesId') || '';
  const page = Number(searchParams.get('page')) || 1;
  const searchAll = searchParams.get('searchAll') === 'true';
  const uncategorized = searchParams.get('uncategorized') === 'true';

  // 状态
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCount, setStatusCount] = useState<StatusCount>({ published: 0, draft: 0, offline: 0 });
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<{ parentId: string; variant: any } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const importMenuRef = useRef<HTMLDivElement>(null);
  const [categoryModalMode, setCategoryModalMode] = useState<'new' | 'batch'>('new');
  const [categoryMap, setCategoryMap] = useState<Map<string, CategoryInfo>>(new Map());
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Toast 自动关闭
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

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
      } else if (!validLocaleCodes.includes(stored)) {
        const fallback = validLocaleCodes[0];
        localStorage.setItem('admin_selected_language', fallback);
        setLocale(fallback);
      }
    };
    initLocale();
  }, []);

  // 加载分类数据
  useEffect(() => {
    fetch(`/api/admin/products/categories?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const map = new Map<string, CategoryInfo>();
        (data.categories || []).forEach((cat: any) => {
          const seriesMap = new Map();
          (cat.series || []).forEach((s: any) => seriesMap.set(s.id, s.name));
          map.set(cat.id, { name: cat.name, series: seriesMap });
        });
        setCategoryMap(map);
      })
      .catch(console.error);
  }, [locale]);

  // 获取产品列表（合并未分类计数）
  const fetchProducts = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL('/api/admin/products/manage', location.origin);
      url.searchParams.set('locale', locale);
      if (status !== 'all') url.searchParams.set('status', status);
      if (keyword) url.searchParams.set('keyword', keyword);
      if (uncategorized) {
        url.searchParams.set('uncategorized', 'true');
      } else {
        if (categoryId) url.searchParams.set('categoryId', categoryId);
        if (seriesId) url.searchParams.set('seriesId', seriesId);
      }
      if (searchAll) url.searchParams.set('searchAll', 'true');
      url.searchParams.set('page', String(page));
      url.searchParams.set('size', String(PAGE_SIZE));
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setStatusCount(data.statusCount || { published: 0, draft: 0, offline: 0 });
      
      // 只在非未分类视图下刷新未分类计数（减少请求）
      if (!uncategorized) {
        const countRes = await fetch(`/api/admin/products/manage?locale=${locale}&uncategorized=true&size=1`);
        if (countRes.ok) {
          const countData = await countRes.json();
          setUncategorizedCount(countData.total || 0);
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locale, status, keyword, categoryId, seriesId, page, searchAll, uncategorized]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  // 更新 URL 参数（同步 locale 状态）
  const updateParams = useCallback((updates: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '' || val === 'all') params.delete(key);
      else params.set(key, String(val));
    });
    if (updates.locale) {
      const newLocale = String(updates.locale);
      if (validLocaleCodes.includes(newLocale)) {
        localStorage.setItem('admin_selected_language', newLocale);
        setLocale(newLocale); // 同步组件状态
      }
    }
    startTransition(() => router.push(`?${params.toString()}`));
  }, [router, searchParams]);

  // 点击外部关闭导入菜单
  useEffect(() => {
    if (!showImportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target as Node)) {
        setShowImportMenu(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showImportMenu]);

  const handleTabChange = (newStatus: string) => {
    if (newStatus === status) return;
    updateParams({ status: newStatus, page: 1, uncategorized: undefined });
  };

  const handleSearch = (data: { keyword: string; categoryId: string; seriesId: string }) => {
    const params = new URLSearchParams(searchParams);
    if (data.keyword) {
      params.set('keyword', data.keyword);
      params.set('searchAll', 'true');
    } else {
      params.delete('keyword');
    }
    if (data.categoryId) {
      params.set('categoryId', data.categoryId);
    } else {
      params.delete('categoryId');
    }
    if (data.seriesId) {
      params.set('seriesId', data.seriesId);
    } else {
      params.delete('seriesId');
    }
    if (data.categoryId || data.seriesId || data.keyword) {
      params.set('searchAll', 'true');
    } else {
      params.delete('searchAll');
    }
    params.set('page', '1');
    startTransition(() => router.push(`?${params.toString()}`));
  };

  const handlePageChange = (newPage: number) => updateParams({ page: newPage });

  const handleDelete = async (productId: string) => {
    if (!confirm('确定删除该产品吗？')) return;
    try {
      const res = await fetch(`/api/admin/products/manage?productId=${productId}&locale=${locale}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: '删除成功', type: 'success' });
        await fetchProducts(abortControllerRef.current?.signal!);
      } else setToast({ message: '删除失败', type: 'error' });
    } catch {
      setToast({ message: '删除失败', type: 'error' });
    }
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) setSelectedProductIds(new Set());
    else setSelectedProductIds(new Set(products.map(p => p.productId)));
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedProductIds(newSet);
  };

  const batchOperation = async (action: string, payload: any = {}) => {
    const ids = Array.from(selectedProductIds);
    if (ids.length === 0) {
      setToast({ message: '请先选择商品', type: 'error' });
      return false;
    }
    setBatchLoading(true);
    try {
      const res = await fetch('/api/admin/products/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids, locale, ...payload }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ message: data.message || '操作成功', type: 'success' });
        setSelectedProductIds(new Set());
        await fetchProducts(abortControllerRef.current?.signal!);
        return true;
      } else {
        setToast({ message: data.error || '操作失败', type: 'error' });
        return false;
      }
    } catch (err) {
      setToast({ message: '网络错误', type: 'error' });
      return false;
    } finally {
      setBatchLoading(false);
    }
  };

  const batchDuplicate = () => batchOperation('duplicate');
  const batchPublish = () => batchOperation('status', { status: 'published' });
  const batchSetOffline = () => batchOperation('status', { status: 'offline' });
  const batchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedProductIds.size} 个产品吗？此操作不可恢复。`)) return;
    await batchOperation('delete');
  };
  const batchSetDraft = () => batchOperation('status', { status: 'draft' });
  const handleBatchCategory = () => {
    if (selectedProductIds.size === 0) {
      setToast({ message: '请先选择商品', type: 'error' });
      return;
    }
    setCategoryModalMode('batch');
    setShowCategoryModal(true);
  };
  const handleNewProduct = () => {
    setCategoryModalMode('new');
    setShowCategoryModal(true);
  };
  const handleCategorySelected = (catId: string, selectedSeriesId: string) => {
    setShowCategoryModal(false);
    if (categoryModalMode === 'new') {
      router.push(`/admin/products/manage/edit?locale=${locale}&categoryId=${catId}&seriesId=${selectedSeriesId}`);
    } else {
      batchOperation('category', { categoryId: catId, seriesId: selectedSeriesId });
    }
  };
  const handleEditVariant = (parentId: string, variant: any) => {
    router.push(`/admin/products/manage/variant/edit?locale=${locale}&parentId=${parentId}&productId=${variant.productId}`);
  };
  const handleVariantSaved = () => {
    setEditingVariant(null);
    fetchProducts(abortControllerRef.current?.signal!);
  };
  const handleBatchTemplate = () => {
    if (selectedProductIds.size === 0) {
      setToast({ message: '请先选择商品', type: 'error' });
      return;
    }
    setSelectedTemplateId('');
    setShowTemplateModal(true);
  };
  const confirmBatchTemplate = async () => {
    if (!selectedTemplateId) {
      setToast({ message: '请选择模板', type: 'error' });
      return;
    }
    const success = await batchOperation('template', { templateId: selectedTemplateId });
    if (success) {
      setShowTemplateModal(false);
    }
  };

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.more-menu-container')) setShowMoreMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  const getCategoryPath = (product: Product) => {
    const catInfo = categoryMap.get(product.categoryId);
    if (!catInfo) return '';
    const categoryName = catInfo.name;
    const seriesName = product.seriesId ? catInfo.series.get(product.seriesId) : '';
    return seriesName ? `${categoryName} > ${seriesName}` : categoryName;
  };

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  // 骨架屏渲染（加载时显示5个卡片）
  const renderContent = () => {
    if (loading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (products.length === 0) {
      return <div className="text-center py-12 text-gray-500">暂无产品数据</div>;
    }
    return (
      <div className="space-y-4">
        {products.map(product => (
          <ProductCard
            key={product.productId}
            product={product}
            locale={locale}
            onDelete={handleDelete}
            onEditVariant={handleEditVariant}
            isSelected={selectedProductIds.has(product.productId)}
            onSelectChange={toggleSelect}
            categoryPath={getCategoryPath(product)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">产品管理</h1>
        <LanguageSelector
          currentLocale={locale}
          onLocaleChange={(val: string) => updateParams({ locale: val })}
          displayMode="zh"
        />
      </div>

      <div className="flex gap-4 border-b mb-4">
        {[
          { key: 'all', label: '全部', count: statusCount.published + statusCount.draft + statusCount.offline },
          { key: 'published', label: '上架', count: statusCount.published },
          { key: 'offline', label: '下架', count: statusCount.offline },
          { key: 'draft', label: '草稿', count: statusCount.draft },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        <button
          key="uncategorized"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('status', 'all');
            params.delete('categoryId');
            params.delete('seriesId');
            params.set('uncategorized', 'true');
            params.set('page', '1');
            startTransition(() => router.push(`?${params.toString()}`));
          }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            uncategorized ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          未分类 ({uncategorizedCount})
        </button>
      </div>

      <SearchBar onSearch={handleSearch} initialKeyword={keyword} initialCategoryId={categoryId} initialSeriesId={seriesId} />

      {products.length > 0 && (
        <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md mb-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedProductIds.size === products.length && products.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4"
            />
            <span className="text-sm text-gray-700">全选当前页</span>
          </div>
          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={batchSetDraft}
                disabled={batchLoading}
                className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
              >
                设为草稿
              </button>
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  disabled={batchLoading}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 inline-flex items-center gap-1"
                >
                  更多 <ChevronDown size={14} />
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border rounded shadow-lg z-20">
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        batchDuplicate();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      复制产品
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        batchPublish();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      上架产品
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        batchSetOffline();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      下架产品
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleBatchCategory();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      修改归属分类
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleBatchTemplate();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      变更页面模板
                    </button>
                    <button
                      onClick={() => {
                        setShowMoreMenu(false);
                        batchDelete();
                      }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600"
                    >
                      删除产品
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {renderContent()}

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      <div className="fixed bottom-8 right-8 flex flex-col gap-2">
        <button
          onClick={handleNewProduct}
          className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700 transition-colors"
        >
          + 新建商品
        </button>
        <div className="relative" ref={importMenuRef}>
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            📥 导入商品
            {showImportMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showImportMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 bg-white border rounded-lg shadow-lg overflow-hidden z-50">
              <button
                onClick={() => {
                  setShowImportModal(true);
                  setShowImportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                📄 导入商品(Excel)
              </button>
              <button
                onClick={() => {
                  setShowImportJsonModal(true);
                  setShowImportMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
              >
                📦 导入商品(Json)
              </button>
            </div>
          )}
        </div>
      </div>

      {showCategoryModal && (
        <CategorySelectModal
          locale={locale}
          onSelect={handleCategorySelected}
          onClose={() => setShowCategoryModal(false)}
          confirmText={categoryModalMode === 'new' ? '下一步' : '确认'}
        />
      )}

      {editingVariant && (
        <VariantEditModal
          variant={editingVariant.variant}
          parentId={editingVariant.parentId}
          locale={locale}
          onSave={handleVariantSaved}
          onClose={() => setEditingVariant(null)}
        />
      )}

      {showImportModal && (
        <ImportProductsModal
          locale={locale}
          onClose={() => setShowImportModal(false)}
          onSuccess={async () => {
            setToast({ message: '导入成功，正在刷新列表', type: 'success' });
            await fetchProducts(abortControllerRef.current?.signal!);
          }}
        />
      )}

      {showImportJsonModal && (
        <ImportProductsJsonModal
          locale={locale}
          onClose={() => setShowImportJsonModal(false)}
          onSuccess={async () => {
            setToast({ message: 'JSON导入成功，正在刷新列表', type: 'success' });
            await fetchProducts(abortControllerRef.current?.signal!);
          }}
        />
      )}

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold mb-4">变更产品页面模板</h2>
            <div className="mb-4">
              <TemplateSelector
                category="product"
                value={selectedTemplateId}
                onChange={(val: string) => setSelectedTemplateId(val)}
                placeholder="选择产品详情页模板"
              />
              <p className="text-xs text-gray-500 mt-2">选择后，所有选中的产品将应用此模板。</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 border rounded"
              >
                取消
              </button>
              <button
                onClick={confirmBatchTemplate}
                disabled={!selectedTemplateId}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}