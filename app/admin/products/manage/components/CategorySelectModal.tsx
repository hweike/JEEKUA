'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

interface CategorySelectModalProps {
  locale: string;
  onSelect: (categoryId: string, seriesId: string) => void;
  onClose: () => void;
  confirmText?: string;
}

interface ProductLine {
  id: string;
  name: string;
  order: number;
}

interface Series {
  id: string;
  name: string;
  slug: string;
  productModel?: string;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  productLineId: string;
  series: Series[];
}

interface Language {
  code: string;
  zhName: string;
  nativeName: string;
}

export default function CategorySelectModal({ locale, onSelect, onClose, confirmText = '下一步' }: CategorySelectModalProps) {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(locale); // 默认当前页面语言
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductLineId, setSelectedProductLineId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [loading, setLoading] = useState(true);
  const [switchingLanguage, setSwitchingLanguage] = useState(false);
  
  // 缓存所有语言的数据
  const cacheRef = useRef<Map<string, { productLines: ProductLine[]; categories: Category[] }>>(new Map());
  const initialLocaleLoadedRef = useRef(false);

  // 首次加载：并行加载语言和分类数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [langRes, categoryRes] = await Promise.all([
          fetch('/api/languages/enabled'),
          fetch(`/api/admin/products/categories?locale=${locale}`)
        ]);

        const [langData, categoryData] = await Promise.all([
          langRes.json(),
          categoryRes.json()
        ]);

        setLanguages(langData || []);
        
        // 缓存初始语言的数据
        cacheRef.current.set(locale, {
          productLines: categoryData.productLines || [],
          categories: categoryData.categories || []
        });
        
        setProductLines(categoryData.productLines || []);
        setCategories(categoryData.categories || []);
        
        if (categoryData.productLines?.length > 0) {
          setSelectedProductLineId(categoryData.productLines[0].id);
        }
        initialLocaleLoadedRef.current = true;
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [locale]);

  // 语言切换时加载数据（每次切换都触发，无限制）
  useEffect(() => {
    // 首次加载完成前不触发（避免重复请求）
    if (!initialLocaleLoadedRef.current) return;
    if (!selectedLanguage) return;
    
    // 从缓存获取数据
    const cachedData = cacheRef.current.get(selectedLanguage);
    if (cachedData) {
      // 从缓存恢复数据（无需显示加载状态）
      setProductLines(cachedData.productLines);
      setCategories(cachedData.categories);
      if (cachedData.productLines.length > 0) {
        setSelectedProductLineId(cachedData.productLines[0].id);
      } else {
        setSelectedProductLineId('');
      }
      setSelectedCategoryId('');
      setSelectedSeriesId('');
      return;
    }

    // 缓存中没有，请求数据
    const loadCategories = async () => {
      setSwitchingLanguage(true);
      try {
        const res = await fetch(`/api/admin/products/categories?locale=${selectedLanguage}`);
        const data = await res.json();
        const productLinesData = data.productLines || [];
        const categoriesData = data.categories || [];
        
        // 存入缓存
        cacheRef.current.set(selectedLanguage, {
          productLines: productLinesData,
          categories: categoriesData
        });
        
        setProductLines(productLinesData);
        setCategories(categoriesData);
        if (productLinesData.length > 0) {
          setSelectedProductLineId(productLinesData[0].id);
        } else {
          setSelectedProductLineId('');
        }
        setSelectedCategoryId('');
        setSelectedSeriesId('');
      } catch (error) {
        console.error('加载分类失败:', error);
      } finally {
        setSwitchingLanguage(false);
      }
    };

    loadCategories();
  }, [selectedLanguage]);

  const filteredCategories = categories.filter(cat => cat.productLineId === selectedProductLineId);
  const currentCategory = filteredCategories.find(cat => cat.id === selectedCategoryId);
  const seriesList = currentCategory?.series || [];

  const handleSelectCategory = (catId: string, seriesId: string = '') => {
    setSelectedCategoryId(catId);
    setSelectedSeriesId(seriesId);
  };

  const handleConfirm = () => {
    if (!selectedCategoryId) return;
    onSelect(selectedCategoryId, selectedSeriesId);
  };

  // 首次加载显示全屏加载
  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-[90vw] p-6 text-center">
          <div className="py-8 text-gray-500">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-[90vw] p-6">
        <h2 className="text-xl font-bold mb-4">选择商品分类</h2>

        <div className="flex gap-4 mb-4">
          <div className="w-1/4">
            <label className="block text-sm font-medium mb-1">语言</label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="border rounded p-2 w-full"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.zhName} ({lang.code})
                </option>
              ))}
            </select>
          </div>
          <div className="w-[45%]">
            <label className="block text-sm font-medium mb-1">产品线</label>
            <select
              value={selectedProductLineId}
              onChange={(e) => {
                setSelectedProductLineId(e.target.value);
                setSelectedCategoryId('');
                setSelectedSeriesId('');
              }}
              className="border rounded p-2 w-full"
            >
              {productLines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          <div className="flex-1 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium border-b">一级分类</div>
            <div className="max-h-[320px] overflow-y-auto relative">
              {switchingLanguage ? (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <span className="text-gray-500">加载中...</span>
                </div>
              ) : null}
              {filteredCategories.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">暂无一级分类</div>
              ) : (
                <ul className="divide-y">
                  {filteredCategories.map(cat => (
                    <li
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id, '')}
                      className={`px-4 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        selectedCategoryId === cat.id ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      <span>{cat.name}</span>
                      {cat.series.length > 0 && <ChevronRight size={16} className="text-gray-400" />}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex-1 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium border-b">二级分类</div>
            <div className="max-h-[320px] overflow-y-auto relative">
              {switchingLanguage ? (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                  <span className="text-gray-500">加载中...</span>
                </div>
              ) : null}
              {!selectedCategoryId ? (
                <div className="p-4 text-gray-500 text-center">请先选择一级分类</div>
              ) : seriesList.length === 0 ? (
                <div className="p-4 text-gray-500 text-center">无二级分类，可直接选择该一级分类</div>
              ) : (
                <ul className="divide-y">
                  {seriesList.map(series => (
                    <li
                      key={series.id}
                      onClick={() => handleSelectCategory(selectedCategoryId, series.id)}
                      className={`px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedSeriesId === series.id ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                    >
                      {series.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">取消</button>
          <button
            onClick={handleConfirm}
            disabled={!selectedCategoryId || switchingLanguage}
            className={`px-4 py-2 rounded ${
              selectedCategoryId && !switchingLanguage
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {confirmText} →
          </button>
        </div>
      </div>
    </div>
  );
}