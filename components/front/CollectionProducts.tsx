'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProductCard from './ProductCard';

type SortOption = 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc';

const SORT_LABELS: Record<SortOption, string> = {
  'title-asc': '按字母顺序，A-Z',
  'title-desc': '按字母顺序，Z-A',
  'price-asc': '价格，从低到高',
  'price-desc': '价格，从高到低',
  'created-asc': '日期，从旧到新',
  'created-desc': '日期，从新到旧',
};

export default function CollectionProducts({ locale, categoryId, categoryName, categoryDescription, urlPattern }: any) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sortBy = (searchParams.get('sort') as SortOption) || 'title-asc';
  const availability = searchParams.get('availability') as 'in-stock' | 'out-of-stock' | null;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  const buildFetchUrl = useCallback(() => {
    const url = new URL(`/api/front/products/category/${categoryId}`, window.location.origin);
    url.searchParams.set('locale', locale);
    if (availability) url.searchParams.set('availability', availability);
    if (minPrice !== null) url.searchParams.set('minPrice', String(minPrice));
    if (maxPrice !== null) url.searchParams.set('maxPrice', String(maxPrice));
    let sortColumn = 'product_name';
    let sortOrder = 'ASC';
    switch (sortBy) {
      case 'title-asc': sortColumn = 'product_name'; sortOrder = 'ASC'; break;
      case 'title-desc': sortColumn = 'product_name'; sortOrder = 'DESC'; break;
      case 'price-asc': sortColumn = 'first_price'; sortOrder = 'ASC'; break;
      case 'price-desc': sortColumn = 'first_price'; sortOrder = 'DESC'; break;
      case 'created-asc': sortColumn = 'createdAt'; sortOrder = 'ASC'; break;
      case 'created-desc': sortColumn = 'createdAt'; sortOrder = 'DESC'; break;
    }
    url.searchParams.set('sortColumn', sortColumn);
    url.searchParams.set('sortOrder', sortOrder);
    return url.toString();
  }, [categoryId, locale, availability, minPrice, maxPrice, sortBy]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = buildFetchUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error(err);
      setError('加载失败');
    } finally {
      setLoading(false);
    }
  }, [buildFetchUrl]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const updateFilters = (updates: any) => {
    const params = new URLSearchParams(searchParams);
    if (updates.sort !== undefined) updates.sort === 'title-asc' ? params.delete('sort') : params.set('sort', updates.sort);
    if (updates.availability !== undefined) updates.availability ? params.set('availability', updates.availability) : params.delete('availability');
    if (updates.minPrice !== undefined) updates.minPrice === null ? params.delete('minPrice') : params.set('minPrice', String(updates.minPrice));
    if (updates.maxPrice !== undefined) updates.maxPrice === null ? params.delete('maxPrice') : params.set('maxPrice', String(updates.maxPrice));
    router.replace(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearFilters = () => updateFilters({ sort: 'title-asc', availability: null, minPrice: null, maxPrice: null });

  const gridCols = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">{categoryName}</h1>
        {categoryDescription && <p className="text-gray-600">{categoryDescription}</p>}
      </div>

      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={availability === 'in-stock'} onChange={(e) => updateFilters({ availability: e.target.checked ? 'in-stock' : null })} /> 有货
          </label>
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={availability === 'out-of-stock'} onChange={(e) => updateFilters({ availability: e.target.checked ? 'out-of-stock' : null })} /> 无货
          </label>
          <div className="flex items-center gap-1 border rounded px-2 py-1">
            <span>¥</span>
            <input type="number" placeholder="最低" value={minPrice ?? ''} onChange={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })} className="w-20 text-sm border-none" />
            <span>-</span>
            <span>¥</span>
            <input type="number" placeholder="最高" value={maxPrice ?? ''} onChange={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })} className="w-20 text-sm border-none" />
          </div>
          {(availability || minPrice !== null || maxPrice !== null || sortBy !== 'title-asc') && (
            <button onClick={clearFilters} className="text-sm text-blue-600">清除筛选</button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">排序：</span>
          <select value={sortBy} onChange={(e) => updateFilters({ sort: e.target.value as SortOption })} className="border rounded p-1 text-sm">
            {Object.entries(SORT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className={gridCols}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="animate-pulse h-64 bg-gray-200 rounded" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : products.length === 0 ? (
        <div className="text-center py-12 text-gray-500">暂无产品</div>
      ) : (
        <>
          <div className="text-sm text-gray-500 mb-4">共 {total} 件商品</div>
          <div className={gridCols}>
            {products.map((product) => (
              <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}