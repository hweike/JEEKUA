// app/admin/products/categories/page.tsx

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';
import { Settings } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages/config';
import AiHelperCategoryModal from './components/AiHelper-CategoryModal'; // 新增导入

const CategoryList = dynamic(() => import('./components/CategoryList'), {
  ssr: false,
  loading: () => <div className="p-4">加载分类列表...</div>,
});
const ProductLineManager = dynamic(() => import('./components/ProductLineManager'), { ssr: false });
const ImportModal = dynamic(() => import('./components/ImportModal'), { ssr: false });

// 产品线类型定义 - 必须与 ProductLineManager 组件中的定义完全一致
interface ProductLine {
  id: string;
  name: string;
  order?: number;
  templateId?: string;
  slug?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

interface AttributeTemplate {
  id: string;
  name: string;
  attributes: { key: string; value: string }[];
}

const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000;

function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}

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

  const [locale, setLocale] = useState(getInitialLocale);
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showProductLineModal, setShowProductLineModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [attributeTemplates, setAttributeTemplates] = useState<AttributeTemplate[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [otherLocaleHasLines, setOtherLocaleHasLines] = useState(false);
  const [copying, setCopying] = useState(false);
  const [loadingOtherStatus, setLoadingOtherStatus] = useState(false);

  // 新增：AI助手弹窗状态
  const [showAiHelper, setShowAiHelper] = useState(false);

  const loadAbortController = useRef<AbortController | null>(null);
  const saveAbortController = useRef<AbortController | null>(null);

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

  const saveToServer = useCallback(async (lines: ProductLine[], cats: any[]) => {
    if (saveAbortController.current) {
      saveAbortController.current.abort();
    }
    const controller = new AbortController();
    saveAbortController.current = controller;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/products/categories?locale=${locale}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productLines: lines, categories: cats }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('保存失败');
      setToast({ message: '保存成功', type: 'success' });
      delete cache[locale];
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setToast({ message: '保存失败，请重试', type: 'error' });
    } finally {
      setIsSaving(false);
      if (saveAbortController.current === controller) saveAbortController.current = null;
    }
  }, [locale]);

  const debouncedSave = useMemo(() => debounce(saveToServer, 500), [saveToServer]);

  const loadData = useCallback(async (ignoreCache = false) => {
    if (loadAbortController.current) {
      loadAbortController.current.abort();
    }
    const controller = new AbortController();
    loadAbortController.current = controller;
    const signal = controller.signal;

    setInitialized(false);
    try {
      let categoriesData;
      const cacheKey = locale;
      if (!ignoreCache && cache[cacheKey] && Date.now() - cache[cacheKey].timestamp < CACHE_TTL) {
        categoriesData = cache[cacheKey].data;
      } else {
        const categoriesRes = await fetch(`/api/admin/products/categories?locale=${locale}`, { signal });
        if (!categoriesRes.ok) throw new Error('加载失败');
        categoriesData = await categoriesRes.json();
        cache[cacheKey] = { data: categoriesData, timestamp: Date.now() };
      }
      setProductLines(categoriesData.productLines || []);
      setCategories(categoriesData.categories || []);
      setInitialized(true);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setToast({ message: '加载数据失败', type: 'error' });
      setInitialized(true);
    } finally {
      if (loadAbortController.current === controller) loadAbortController.current = null;
    }
  }, [locale]);

  useEffect(() => {
    if (!initialized) return;
    const checkOtherLocale = async () => {
      if (productLines.length > 0) {
        setOtherLocaleHasLines(false);
        return;
      }
      setLoadingOtherStatus(true);
      const targetLocale = locale === 'en' ? 'zh' : 'en';
      try {
        const res = await fetch(`/api/admin/products/categories?locale=${targetLocale}`);
        if (res.ok) {
          const data = await res.json();
          const lines = data.productLines || [];
          setOtherLocaleHasLines(lines.length > 0);
        } else {
          setOtherLocaleHasLines(false);
        }
      } catch {
        setOtherLocaleHasLines(false);
      } finally {
        setLoadingOtherStatus(false);
      }
    };
    checkOtherLocale();
  }, [initialized, productLines.length, locale]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/admin/products/settings?locale=${locale}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => setAttributeTemplates(data.attributeTemplates || []))
      .catch(err => { if (err.name !== 'AbortError') console.error(err); });
    return () => controller.abort();
  }, [locale]);

  useEffect(() => {
    loadData();
    return () => {
      loadAbortController.current?.abort();
      saveAbortController.current?.abort();
    };
  }, [loadData]);

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === locale) return;
    localStorage.setItem('admin_selected_language', newLocale);
    setLocale(newLocale);
  };

  const currentProductLineId = searchParams.get('productLineId') || productLines[0]?.id || '';

  const updateCategories = useCallback((newCurrentLineCategories: any[]) => {
    setCategories(prevCategories => {
      if (currentProductLineId === '__other__') {
        const validLineIds = new Set(productLines.map(line => line.id));
        const newMap = new Map(newCurrentLineCategories.map(cat => [cat.id, cat]));
        const mergedCategories = prevCategories.map(cat => {
          if (!validLineIds.has(cat.productLineId)) {
            return newMap.get(cat.id) || cat;
          }
          return cat;
        });
        debouncedSave(productLines, mergedCategories);
        return mergedCategories;
      } else {
        const otherLineCategories = prevCategories.filter(
          cat => cat.productLineId !== currentProductLineId
        );
        const mergedCategories = [...otherLineCategories, ...newCurrentLineCategories];
        debouncedSave(productLines, mergedCategories);
        return mergedCategories;
      }
    });
  }, [currentProductLineId, productLines, debouncedSave]);

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
    debouncedSave(newLines, updatedCategories);
    delete cache[locale];
  }, [categories, debouncedSave, locale, productLines]);

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

  const openProductLineManager = () => {
    setShowProductLineModal(true);
  };

  const filteredCategories = useMemo(() => {
    if (currentProductLineId === '__other__') {
      const validLineIds = new Set(productLines.map(line => line.id));
      return categories.filter(cat => !validLineIds.has(cat.productLineId));
    }
    return categories.filter(cat => cat.productLineId === currentProductLineId);
  }, [categories, currentProductLineId, productLines]);

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
      await loadData(true);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || '复制失败', type: 'error' });
    } finally {
      setCopying(false);
    }
  };

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

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

  // 根据复制源获取站点显示名称
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

          {/* 创建说明 - 动态根据复制源显示 */}
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
          onSave={(newLines: ProductLine[]) => updateProductLines(newLines)}
          onClose={() => setShowProductLineModal(false)}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
  }

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
            <button
              onClick={openProductLineManager}
              className="border border-dashed rounded px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
            >
              <Settings size={14} /> 管理产品线
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* 仅在英文或中文时显示 AI 翻译按钮 */}
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
          onSave={(newLines: ProductLine[]) => updateProductLines(newLines)}
          onClose={() => setShowProductLineModal(false)}
        />
      )}

      {showImportModal && (
        <ImportModal
          locale={locale}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => {
            delete cache[locale];
            loadData(true);
          }}
          onImportResult={(message, type) => setToast({ message, type })}
        />
      )}

      {/* AI 翻译弹窗 */}
      {showAiHelper && (
        <AiHelperCategoryModal
          sourceLocale={locale}
          onClose={() => setShowAiHelper(false)}
          onImportSuccess={() => {
            delete cache[locale];
            loadData(true);
          }}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}