// app/admin/products/categories/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { Settings } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages/config';
import AiHelperCategoryModal from './components/AiHelper-CategoryModal';
import { useCategories, ProductLine } from './hooks/useCategories';

const CategoryList = dynamic(() => import('./components/CategoryList'), {
  ssr: false,
  loading: () => <div className="p-4">加载分类列表...</div>,
});
const ProductLineManager = dynamic(() => import('./components/ProductLineManager'), { ssr: false });
const ImportModal = dynamic(() => import('./components/ImportModal'), { ssr: false });

const validLocaleCodes = LANGUAGES.map(lang => lang.code);
const getInitialLocale = (): string => {
  if (typeof window === 'undefined') return validLocaleCodes[0] || 'zh';
  const stored = localStorage.getItem('admin_selected_language');
  if (stored && validLocaleCodes.includes(stored)) return stored;
  return validLocaleCodes[0] || 'zh';
};

export default function CategoriesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ---------- UI 状态 ----------
  const [locale, setLocale] = useState(getInitialLocale);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showProductLineModal, setShowProductLineModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [showAiHelper, setShowAiHelper] = useState(false);
  const [copying, setCopying] = useState(false);

  // ---------- 使用 Hook ----------
  const {
    productLines,
    categories,
    setCategories,
    setProductLines,
    attributeTemplates,
    loading,
    saving,
    error,
    otherLocaleHasLines,
    loadingOtherStatus,
    saveData,
    refresh,
    loadData,
    setError,
  } = useCategories(locale);

  // ---------- 错误显示 ----------
  useEffect(() => {
    if (error) {
      setToast({ message: error, type: 'error' });
      setError(null);
    }
  }, [error, setError]);

  // ---------- 当前产品线 ID ----------
  const currentProductLineId = searchParams.get('productLineId') || productLines[0]?.id || '';

  // ---------- 分类更新（与原始逻辑一致，增加 Toast） ----------
  const updateCategories = useCallback((newCurrentLineCategories: any[]) => {
    setCategories(prevCategories => {
      let mergedCategories;
      if (currentProductLineId === '__other__') {
        const validLineIds = new Set(productLines.map(line => line.id));
        const newMap = new Map(newCurrentLineCategories.map(cat => [cat.id, cat]));
        mergedCategories = prevCategories.map(cat => {
          if (!validLineIds.has(cat.productLineId)) {
            return newMap.get(cat.id) || cat;
          }
          return cat;
        });
      } else {
        const otherLineCategories = prevCategories.filter(
          cat => cat.productLineId !== currentProductLineId
        );
        mergedCategories = [...otherLineCategories, ...newCurrentLineCategories];
      }

      // 触发保存并显示 Toast
      saveData(productLines, mergedCategories)
        .then(() => setToast({ message: '保存成功', type: 'success' }))
        .catch((err) => {
          // 错误已在 Hook 中设置 error，但此处确保显示
          setToast({ message: err.message || '保存失败', type: 'error' });
        });

      return mergedCategories;
    });
  }, [currentProductLineId, productLines, saveData, setCategories, setToast]);

  // ---------- 产品线更新 ----------
  const updateProductLines = useCallback((newLines: ProductLine[]) => {
    const deletedLineIds = productLines.filter(old => !newLines.some(n => n.id === old.id)).map(l => l.id);
    let updatedCategories = categories;
    if (deletedLineIds.length > 0 && newLines.length > 0) {
      const firstLineId = newLines[0].id;
      updatedCategories = categories.map(cat =>
        deletedLineIds.includes(cat.productLineId)
          ? { ...cat, productLineId: firstLineId }
          : cat
      );
      setCategories(updatedCategories);
    }
    setProductLines(newLines);

    // 保存并显示 Toast
    saveData(newLines, updatedCategories)
      .then(() => setToast({ message: '保存成功', type: 'success' }))
      .catch((err) => {
        setToast({ message: err.message || '保存失败', type: 'error' });
      });
  }, [productLines, categories, setProductLines, setCategories, saveData, setToast]);

  // ---------- 产品线切换 ----------
  const handleProductLineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (value === '__other__') {
      params.set('productLineId', '__other__');
    } else {
      if (value) params.set('productLineId', value);
      else params.delete('productLineId');
    }
    router.push(`?${params.toString()}`);
  };

  // ---------- 复制产品线 ----------
  const copyProductLinesFrom = async (sourceLocale: string) => {
    if (!confirm(`确定从 ${sourceLocale === 'en' ? '英文站' : '中文站'} 复制产品线到当前站点吗？当前所有产品线数据将被覆盖。`)) {
      return;
    }
    setCopying(true);
    try {
      const res = await fetch(`/api/admin/products/categories?locale=${sourceLocale}`);
      if (!res.ok) throw new Error('获取源数据失败');
      const sourceData = await res.json();
      const saveRes = await fetch(`/api/admin/products/categories?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productLines: sourceData.productLines || [],
          categories: sourceData.categories || [],
        }),
      });
      if (!saveRes.ok) throw new Error('保存失败');
      setToast({ message: '复制成功', type: 'success' });
      await refresh(); // 强制刷新
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || '复制失败', type: 'error' });
    } finally {
      setCopying(false);
    }
  };

  // ---------- 筛选分类 ----------
  const filteredCategories = useMemo(() => {
    if (currentProductLineId === '__other__') {
      const validLineIds = new Set(productLines.map(line => line.id));
      return categories.filter(cat => !validLineIds.has(cat.productLineId));
    }
    return categories.filter(cat => cat.productLineId === currentProductLineId);
  }, [categories, currentProductLineId, productLines]);

  // ---------- 语言切换 ----------
  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    localStorage.setItem('admin_selected_language', newLocale);
    setLocale(newLocale);
  };

  // ---------- 加载状态 ----------
  if (loading && productLines.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  // ---------- 无产品线 ----------
  if (productLines.length === 0) {
    let showCopyBtn = false;
    let copySourceLocale = '';
    if (locale === 'en') {
      copySourceLocale = 'zh';
      showCopyBtn = otherLocaleHasLines && !loadingOtherStatus;
    } else {
      copySourceLocale = 'en';
      showCopyBtn = otherLocaleHasLines && !loadingOtherStatus;
    }
    const sourceLangName = copySourceLocale === 'en' ? '英文站' : '中文站';

    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="w-4/5 mx-auto bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">产品分类管理 - {locale.toUpperCase()}</h1>
            <LanguageSelector currentLocale={locale} onLocaleChange={handleLocaleChange} displayMode="zh" />
          </div>
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">请先创建产品线</p>
            <div className="text-sm text-gray-600 mb-4 max-w-md mx-auto">
              {showCopyBtn ? (
                <>
                  创建说明：如果当前站点销售的产品与 {sourceLangName} 一致，建议使用
                  “复制 {sourceLangName} 产品线及分类”快速创建；若销售产品不同，
                  可点击下方“创建新产品线”手动创建。
                </>
              ) : (
                <>
                  创建说明：若当前站点销售产品与另一语言站点不同，请点击下方
                  “创建新产品线”手动创建产品线。
                </>
              )}
            </div>
            <div className="flex gap-4 justify-center">
              {showCopyBtn && (
                <button
                  onClick={() => copyProductLinesFrom(copySourceLocale)}
                  disabled={copying}
                  className="bg-green-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
                >
                  {copying ? '复制中...' : `复制 ${sourceLangName} 产品线及分类`}
                </button>
              )}
              <button
                onClick={() => setShowProductLineModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded inline-flex items-center gap-2"
              >
                创建新产品线
              </button>
            </div>
          </div>
        </div>
        {showProductLineModal && (
          <ProductLineManager
            productLines={productLines}
            onSave={(newLines: ProductLine[]) => {
              updateProductLines(newLines);
              setShowProductLineModal(false);
            }}
            onClose={() => setShowProductLineModal(false)}
          />
        )}
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </div>
    );
  }

  // ---------- 主界面 ----------
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">产品分类管理</h1>
        <LanguageSelector currentLocale={locale} onLocaleChange={handleLocaleChange} displayMode="zh" />
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 items-center">
          <label className="font-medium">产品线：</label>
          <div className="flex gap-2">
            <select
              value={currentProductLineId}
              onChange={handleProductLineChange}
              className="border rounded p-2"
            >
              {productLines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
              <option value="__other__">其他产品线</option>
            </select>
            {/* <button
              onClick={() => setShowProductLineModal(true)}
              className="border border-dashed rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <Settings size={14} /> 管理产品线
            </button> */}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saving && <span className="text-sm text-gray-500">保存中...</span>}
          {(locale === 'en' || locale === 'zh') && (
            <button
              onClick={() => setShowAiHelper(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
            >
              🤖 AI翻译
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            导入分类
          </button>
          <button
            onClick={() => setAddingCat(true)}
            className="bg-green-600 text-white px-4 py-2 rounded"
            disabled={saving}
          >
            添加一级分类
          </button>
        </div>
      </div>

      <CategoryList
        categories={filteredCategories}
        productLines={productLines}
        attributeTemplates={attributeTemplates}
        addingCat={addingCat}
        currentProductLineId={currentProductLineId}
        onAddCancel={() => setAddingCat(false)}
        onUpdate={updateCategories}
      />

      {showProductLineModal && (
        <ProductLineManager
          productLines={productLines}
          onSave={(newLines: ProductLine[]) => {
            updateProductLines(newLines);
            setShowProductLineModal(false);
          }}
          onClose={() => setShowProductLineModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          locale={locale}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            refresh();
          }}
          onImportResult={(message, type) => setToast({ message, type })}
        />
      )}

      {showAiHelper && (
        <AiHelperCategoryModal
          sourceLocale={locale}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            refresh();
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}