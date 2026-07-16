'use client';

import { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';

interface CategorySelectModalProps {
  locale: string;
  onSelect: (categoryId: string, seriesId: string) => void;
  onClose: () => void;
  confirmText?: string;  // 新增，默认“下一步”
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

export default function CategorySelectModal({ locale, onSelect, onClose, confirmText = '下一步' }: CategorySelectModalProps) {
  const [productLines, setProductLines] = useState<ProductLine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedProductLineId, setSelectedProductLineId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedSeriesId, setSelectedSeriesId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/admin/products/categories?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setProductLines(data.productLines || []);
        setCategories(data.categories || []);
        if (data.productLines?.length > 0) {
          setSelectedProductLineId(data.productLines[0].id);
        }
        setLoading(false);
      })
      .catch(console.error);
  }, [locale]);

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

  if (loading) return <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">加载中...</div>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[800px] max-w-[90vw] p-6">
        <h2 className="text-xl font-bold mb-4">选择商品分类</h2>

        <div className="mb-4 w-1/2">
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

        <div className="flex gap-4 mt-4">
          <div className="flex-1 border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium border-b">一级分类</div>
            <div className="max-h-[320px] overflow-y-auto">
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
            <div className="max-h-[320px] overflow-y-auto">
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
            disabled={!selectedCategoryId}
            className={`px-4 py-2 rounded ${
              selectedCategoryId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {confirmText} →
          </button>
        </div>
      </div>
    </div>
  );
}