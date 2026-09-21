// app/admin/products/manage/page.tsx
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
import AiHelperProductModal from './components/AiHelperProductModal';

// 导入自定义 Hooks
import { useToast } from './hooks/useToast';
import { useCategoryMap } from './hooks/useCategoryMap';
import { useProducts } from './hooks/useProducts';
import { useBatchOperations } from './hooks/useBatchOperations';

// 懒加载弹窗
const CategorySelectModal = dynamic(
  () => import('./components/CategorySelectModal').then(mod => mod.default || mod),
  { ssr: false }
);
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

  // URL 参数
  const locale = searchParams.get('locale') || getInitialLocale();
  const status = searchParams.get('status') || 'all';
  const keyword = searchParams.get('keyword') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const seriesId = searchParams.get('seriesId') || '';
  const page = Number(searchParams.get('page')) || 1;
  const searchAll = searchParams.get('searchAll') === 'true';
  const uncategorized = searchParams.get('uncategorized') === 'true';

  // UI 状态
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportJsonModal, setShowImportJsonModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [categoryModalMode, setCategoryModalMode] = useState<'new' | 'batch'>('new');
  // 待保存产品名称（用于显示横幅）
  const [pendingProductName, setPendingProductName] = useState<string | null>(null);
  // 待保存产品 ID 集合（用于卡片蒙层）
  const [pendingProductIds, setPendingProductIds] = useState<Set<string>>(new Set());

  // 自定义 Hooks
  const { toast, setToast } = useToast();
  const categoryMap = useCategoryMap(locale);

  // 稳定参数对象
  const productParams = useMemo(() => ({
    locale,
    status,
    keyword,
    categoryId,
    seriesId,
    page,
    searchAll,
    uncategorized,
  }), [locale, status, keyword, categoryId, seriesId, page, searchAll, uncategorized]);

  const {
    products,
    total,
    statusCount,
    uncategorizedCount,
    loading,
    error,
    initialized,
    refetch: fetchProducts,
  } = useProducts(productParams);

  const selectedIds = Array.from(selectedProductIds);
  const { batchLoading, batchOperation } = useBatchOperations(
    locale,
    selectedIds,
    fetchProducts,
    setToast,
    setSelectedProductIds
  );

  // 快捷批量操作
  const batchDuplicate = () => batchOperation('duplicate');
  const batchPublish = () => batchOperation('status', { status: 'published' });
  const batchSetOffline = () => batchOperation('status', { status: 'offline' });
  const batchDelete = async () => {
    if (!confirm(`确定删除选中的 ${selectedIds.length} 个产品吗？此操作不可恢复。`)) return;
    await batchOperation('delete');
  };
  const batchSetDraft = () => batchOperation('status', { status: 'draft' });
  const handleBatchCategory = () => {
    if (selectedIds.length === 0) {
      setToast({ message: '请先选择商品', type: 'error' });
      return;
    }
    setCategoryModalMode('batch');
    setShowCategoryModal(true);
  };
  const handleBatchTemplate = () => {
    if (selectedIds.length === 0) {
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
    if (success) setShowTemplateModal(false);
  };

  // 其他回调
  const handleDelete = useCallback(async (productId: string) => {
    if (!confirm('确定删除该产品吗？')) return;
    try {
      const res = await fetch(`/api/admin/products/manage?productId=${productId}&locale=${locale}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: '删除成功', type: 'success' });
        await fetchProducts();
      } else setToast({ message: '删除失败', type: 'error' });
    } catch {
      setToast({ message: '删除失败', type: 'error' });
    }
  }, [locale, fetchProducts, setToast]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }, []);

  const toggleSelectAll = () => {
    if (selectedProductIds.size === products.length) setSelectedProductIds(new Set());
    else setSelectedProductIds(new Set(products.map(p => p.productId)));
  };

  const handleEditVariant = useCallback((parentId: string, variant: any) => {
    router.push(`/admin/products/manage/variant/edit?locale=${locale}&parentId=${parentId}&productId=${variant.productId}`);
  }, [locale, router]);

  const handleCategorySelected = useCallback((catId: string, selectedSeriesId: string) => {
    setShowCategoryModal(false);
    if (categoryModalMode === 'new') {
      router.push(`/admin/products/manage/edit?locale=${locale}&categoryId=${catId}&seriesId=${selectedSeriesId}`);
    } else {
      batchOperation('category', { categoryId: catId, seriesId: selectedSeriesId });
    }
  }, [categoryModalMode, locale, router, batchOperation]);

  const handleNewProduct = () => {
    setCategoryModalMode('new');
    setShowCategoryModal(true);
  };

  // URL 更新函数
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

  // 分类路径映射
  const productCategoryPathMap = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(product => {
      const catInfo = categoryMap.get(product.categoryId);
      if (!catInfo) return;
      const categoryName = catInfo.name;
      const seriesName = product.seriesId ? catInfo.series.get(product.seriesId) : '';
      const path = seriesName ? `${categoryName} > ${seriesName}` : categoryName;
      map.set(product.productId, path);
    });
    return map;
  }, [products, categoryMap]);

  const totalPages = useMemo(() => Math.ceil(total / PAGE_SIZE), [total]);

  // 点击外部关闭菜单
  useEffect(() => {
    if (!showImportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.import-menu-container')) setShowImportMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showImportMenu]);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.more-menu-container')) setShowMoreMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMoreMenu]);

  // ==================== 轮询异步任务（使用 ref 避免依赖数组变化） ====================
  const fetchProductsRef = useRef(fetchProducts);
  const setToastRef = useRef(setToast);

  // 每次渲染更新 ref，使它们指向最新函数
  useEffect(() => {
    fetchProductsRef.current = fetchProducts;
    setToastRef.current = setToast;
  });

  // 真正的轮询 useEffect，只运行一次（空依赖）
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    let attempts = 0;
    const MAX_ATTEMPTS = 30;

    const checkPendingTask = async () => {
      const stored = localStorage.getItem('pendingProductTask');
      if (!stored) {
        setPendingProductName(null);
        setPendingProductIds(new Set());
        return;
      }
      try {
        const { taskId, productName, productId } = JSON.parse(stored);
        setPendingProductName(productName || '新商品');

        // 如果是有效产品ID（非'new'），加入蒙层集合
        if (productId && productId !== 'new') {
          setPendingProductIds((prev: Set<string>) => new Set(prev).add(productId));
        }

        const poll = async () => {
          try {
            const res = await fetch(`/api/admin/products/tasks/${taskId}`);
            if (!res.ok) {
              if (res.status === 404) {
                // 任务不存在，清理
                localStorage.removeItem('pendingProductTask');
                setPendingProductName(null);
                setPendingProductIds(new Set());
                setToastRef.current({ message: '任务不存在，请手动刷新列表', type: 'error' });
                clearInterval(intervalId);
                return;
              }
              throw new Error('查询失败');
            }
            const data = await res.json();

            if (data.status === 'success') {
              clearInterval(intervalId);
              localStorage.removeItem('pendingProductTask');
              setPendingProductName(null);
              setPendingProductIds(new Set());
              setToastRef.current({ message: '✅ 产品保存成功！', type: 'success' });
              await fetchProductsRef.current();
            } else if (data.status === 'failed') {
              clearInterval(intervalId);
              localStorage.removeItem('pendingProductTask');
              setPendingProductName(null);
              setPendingProductIds(new Set());
              setToastRef.current({ message: `❌ 保存失败：${data.error || '未知错误'}`, type: 'error' });
            }
            // 继续轮询
          } catch (err) {
            // 网络错误忽略，继续轮询
          }

          attempts++;
          if (attempts >= MAX_ATTEMPTS) {
            clearInterval(intervalId);
            localStorage.removeItem('pendingProductTask');
            setPendingProductName(null);
            setPendingProductIds(new Set());
            setToastRef.current({ message: '⏰ 保存超时，请手动刷新页面查看', type: 'error' });
          }
        };

        intervalId = setInterval(poll, 2000);
        poll();
      } catch (e) {
        localStorage.removeItem('pendingProductTask');
        setPendingProductName(null);
        setPendingProductIds(new Set());
      }
    };

    checkPendingTask();

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []); // 空依赖数组，确保只运行一次

  // 渲染内容
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
    if (error) {
      return (
        <div className="text-center py-12 text-red-500">
          加载失败：{error}
          <button onClick={() => fetchProducts()} className="ml-2 text-blue-600 underline">
            重试
          </button>
        </div>
      );
    }
    if (initialized && products.length === 0) {
      return <div className="text-center py-12 text-gray-500">暂无产品数据</div>;
    }
    return (
     <div className="space-y-4">
        {products.map(product => {
          const isPending = pendingProductIds.has(product.productId);
          return (
            <ProductCard
              key={product.productId}
              product={product}
              locale={locale}
              onDelete={handleDelete}
              onEditVariant={handleEditVariant}
              isSelected={selectedProductIds.has(product.productId)}
              onSelectChange={toggleSelect}
              categoryPath={productCategoryPathMap.get(product.productId)}
              isPending={isPending}
            />
          );
        })}
      </div>
    );
  };

  // ==================== JSX ====================
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

      {/* 保存中横幅提示 */}
      {pendingProductName && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4 flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600 flex-shrink-0"></div>
          <span className="text-sm text-yellow-800">
            产品“{pendingProductName}”正在保存中，请稍候...
          </span>
        </div>
      )}

      {/* 状态标签页 */}
      <div className="flex gap-4 border-b mb-4">
        {[
          { key: 'all', label: '全部', count: statusCount.published + statusCount.draft + statusCount.offline },
          { key: 'published', label: '上架', count: statusCount.published },
          { key: 'offline', label: '下架', count: statusCount.offline },
          { key: 'draft', label: '草稿', count: statusCount.draft },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => updateParams({ status: tab.key, page: 1, uncategorized: undefined })}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === tab.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
        <button
          key="uncategorized"
          onClick={() => updateParams({ status: 'all', categoryId: undefined, seriesId: undefined, uncategorized: 'true', page: 1 })}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            uncategorized ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          未分类 ({uncategorizedCount})
        </button>
      </div>

      {/* 搜索栏 */}
      <SearchBar
        onSearch={(data) => {
          const params = new URLSearchParams(searchParams);
          if (data.keyword) { params.set('keyword', data.keyword); params.set('searchAll', 'true'); }
          else { params.delete('keyword'); }
          if (data.categoryId) { params.set('categoryId', data.categoryId); params.set('searchAll', 'true'); }
          else { params.delete('categoryId'); }
          if (data.seriesId) { params.set('seriesId', data.seriesId); params.set('searchAll', 'true'); }
          else { params.delete('seriesId'); }
          if (!data.keyword && !data.categoryId && !data.seriesId) params.delete('searchAll');
          params.set('page', '1');
          startTransition(() => router.push(`?${params.toString()}`));
        }}
        initialKeyword={keyword}
        initialCategoryId={categoryId}
        initialSeriesId={seriesId}
        locale={locale}
      />

      {/* 批量操作栏 */}
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
                {batchLoading ? '处理中...' : '设为草稿'}
              </button>
              <div className="relative more-menu-container">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  disabled={batchLoading}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 inline-flex items-center gap-1"
                >
                  更多 {showMoreMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showMoreMenu && (
                  <div className="absolute right-0 mt-1 w-44 bg-white border rounded shadow-lg z-20">
                    <button onClick={() => { setShowMoreMenu(false); batchDuplicate(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">复制产品</button>
                    <button onClick={() => { setShowMoreMenu(false); batchPublish(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">上架产品</button>
                    <button onClick={() => { setShowMoreMenu(false); batchSetOffline(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">下架产品</button>
                    <button onClick={() => { setShowMoreMenu(false); handleBatchCategory(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">修改归属分类</button>
                    <button onClick={() => { setShowMoreMenu(false); handleBatchTemplate(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">变更页面模板</button>
                    <button onClick={() => { setShowMoreMenu(false); batchDelete(); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600">删除产品</button>
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
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={(p) => updateParams({ page: p })} />
        </div>
      )}

      {/* ===== 悬浮按钮 ===== */}
      <div className="fixed bottom-8 right-8 flex flex-col gap-2">
        {(locale === 'en' || locale === 'zh') && (
          <button
            onClick={() => {
              if (selectedIds.length === 0 || selectedIds.length > 20) {
                setToast({ message: '请选择1-20个产品进行翻译', type: 'error' });
                return;
              }
              setShowAiHelper(true);
            }}
            disabled={selectedIds.length === 0 || selectedIds.length > 20}
            className={`px-6 py-3 rounded-full shadow-lg transition-colors flex items-center gap-2 ${
              selectedIds.length > 0 && selectedIds.length <= 20
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-400 text-gray-200 cursor-not-allowed'
            }`}
            title={selectedIds.length === 0 || selectedIds.length > 20 ? '请选择1-20个产品' : ''}
          >
            🤖 AI翻译
            {selectedIds.length > 0 && selectedIds.length <= 20 && (
              <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">{selectedIds.length}</span>
            )}
          </button>
        )}
        <button onClick={handleNewProduct} className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700 transition-colors">
          + 新建商品
        </button>
        <div className="relative import-menu-container">
          <button
            onClick={() => setShowImportMenu(!showImportMenu)}
            className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
          >
            📥 导入商品 {showImportMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showImportMenu && (
            <div className="absolute bottom-full mb-2 left-0 w-48 bg-white border rounded-lg shadow-lg overflow-hidden z-50">
              <button onClick={() => { setShowImportModal(true); setShowImportMenu(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                📄 导入商品(Excel)
              </button>
              <button onClick={() => { setShowImportJsonModal(true); setShowImportMenu(false); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                📦 导入商品(Json)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ===== 弹窗 ===== */}
      {showCategoryModal && (
        <CategorySelectModal
          locale={locale}
          onSelect={handleCategorySelected}
          onClose={() => setShowCategoryModal(false)}
          confirmText={categoryModalMode === 'new' ? '下一步' : '确认'}
        />
      )}

      {showImportModal && (
        <ImportProductsModal
          locale={locale}
          onClose={() => setShowImportModal(false)}
          onSuccess={async () => {
            setToast({ message: '导入成功，正在刷新列表', type: 'success' });
            await fetchProducts();
          }}
        />
      )}

      {showImportJsonModal && (
        <ImportProductsJsonModal
          locale={locale}
          onClose={() => setShowImportJsonModal(false)}
          onSuccess={async () => {
            setToast({ message: 'JSON导入成功，正在刷新列表', type: 'success' });
            await fetchProducts();
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
              <button onClick={() => setShowTemplateModal(false)} className="px-4 py-2 border rounded">取消</button>
              <button onClick={confirmBatchTemplate} disabled={!selectedTemplateId} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">确认</button>
            </div>
          </div>
        </div>
      )}

      {showAiHelper && (
        <AiHelperProductModal
          sourceLocale={locale}
          selectedProductIds={selectedIds}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => fetchProducts()}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}