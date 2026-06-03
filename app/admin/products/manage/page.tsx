'use client';

import { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { ProductCard } from './components/ProductCard';
import { Pagination } from '@/components/common/Pagination';
import { CategorySelectModal } from './components/CategorySelectModal';
import { VariantEditModal } from './components/VariantEditModal';
import { SearchBar } from './components/SearchBar';
import { ChevronDown } from 'lucide-react';
import ImportProductsModal from './components/ImportProductsModal';
import { TemplateSelector } from '@/components/webbuilder/TemplateSelector';
import { LANGUAGES } from '@/lib/languages/config';

// 获取所有支持的语言代码列表（动态，支持任意多种语言）
const validLocaleCodes = LANGUAGES.map(lang => lang.code);
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

  const [locale, setLocale] = useState(getInitialLocale);

  const status = searchParams.get('status') || 'all';
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const seriesId = searchParams.get('seriesId') || '';
  const page = Number(searchParams.get('page')) || 1;
  const pageSize = 20;
  const searchAll = searchParams.get('searchAll') === 'true';

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [statusCount, setStatusCount] = useState({ published: 0, draft: 0, offline: 0 });
  const [uncategorizedCount, setUncategorizedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<{ parentId: string; variant: any } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'new' | 'batch'>('new');
  const [categoryMap, setCategoryMap] = useState<Map<string, { name: string; series: Map<string, string> }>>(new Map());

  const [showImportModal, setShowImportModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [uncategorized, setUncategorized] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // 初始化 localStorage 中的语言设置
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

  // 获取未分类产品总数（全局，不依赖 status）
  const fetchUncategorizedCount = useCallback(async () => {
    try {
      const url = `/api/admin/products/manage?locale=${locale}&uncategorized=true&size=1`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUncategorizedCount(data.total || 0);
      } else {
        setUncategorizedCount(0);
      }
    } catch (err) {
      console.error('获取未分类产品数量失败', err);
      setUncategorizedCount(0);
    }
  }, [locale]);

  // 初始化未分类筛选状态（从 URL 参数读取）
  useEffect(() => {
    const isUncategorized = searchParams.get('uncategorized') === 'true';
    setUncategorized(isUncategorized);
  }, [searchParams]);

  // 加载分类数据
  useEffect(() => {
    fetch(`/api/admin/products/categories?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const map = new Map();
        (data.categories || []).forEach((cat: any) => {
          const seriesMap = new Map();
          (cat.series || []).forEach((s: any) => seriesMap.set(s.id, s.name));
          map.set(cat.id, { name: cat.name, series: seriesMap });
        });
        setCategoryMap(map);
      })
      .catch(console.error);
  }, [locale]);

  // 获取产品列表
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
      url.searchParams.set('size', String(pageSize));
      const res = await fetch(url.toString(), { signal });
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
      setStatusCount(data.statusCount || { published: 0, draft: 0, offline: 0 });
    } catch (err: any) {
      if (err.name !== 'AbortError') setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [locale, status, keyword, categoryId, seriesId, page, searchAll, uncategorized]);

  // 获取产品列表的同时获取未分类总数
  useEffect(() => {
    fetchUncategorizedCount();
  }, [fetchUncategorizedCount]);

  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  // 更新 URL 参数（允许 undefined 值，内部会删除参数）
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
      }
    }
    startTransition(() => router.push(`?${params.toString()}`));
  }, [router, searchParams]);

  const handleTabChange = (newStatus: string) => {
    if (newStatus === status) return;
    setUncategorized(false);
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
        fetchUncategorizedCount();
        fetchProducts(abortControllerRef.current?.signal!);
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
        fetchUncategorizedCount();
        fetchProducts(abortControllerRef.current?.signal!);
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

  const getCategoryPath = (product: any) => {
    const catInfo = categoryMap.get(product.categoryId);
    if (!catInfo) return '';
    const categoryName = catInfo.name;
    const seriesName = product.seriesId ? catInfo.series.get(product.seriesId) : '';
    return seriesName ? `${categoryName} > ${seriesName}` : categoryName;
  };

  const totalPages = Math.ceil(total / pageSize);

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
            setUncategorized(true);
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

      {loading ? (
        <div className="space-y-4">加载中...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无产品数据</div>
      ) : (
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
      )}

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
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
        >
          📥 导入商品
        </button>
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
            fetchUncategorizedCount();
            fetchProducts(abortControllerRef.current?.signal!);
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