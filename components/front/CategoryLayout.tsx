'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import CategoryTree from './CategoryTree';
import ProductCard from './ProductCard';
import Pagination from './Pagination';

// 内联排序组件
function SortDropdown({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="border rounded p-2 text-sm bg-white">
      <option value="default">综合排序</option>
      <option value="price_asc">价格升序</option>
      <option value="price_desc">价格降序</option>
      <option value="name_asc">名称升序</option>
    </select>
  );
}

// 内联价格筛选
function PriceFilter({ min, max, onChange }: { min?: number; max?: number; onChange: (min?: number, max?: number) => void }) {
  const [localMin, setLocalMin] = useState(min === undefined ? '' : String(min));
  const [localMax, setLocalMax] = useState(max === undefined ? '' : String(max));
  const apply = () => onChange(localMin === '' ? undefined : Number(localMin), localMax === '' ? undefined : Number(localMax));
  return (
    <div className="flex items-center gap-2">
      <input type="number" placeholder="最低价" value={localMin} onChange={(e) => setLocalMin(e.target.value)} className="border rounded p-2 w-24 text-sm" />
      <span>-</span>
      <input type="number" placeholder="最高价" value={localMax} onChange={(e) => setLocalMax(e.target.value)} className="border rounded p-2 w-24 text-sm" />
      <button onClick={apply} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-sm">确定</button>
    </div>
  );
}

// 骨架屏
function ProductsSkeleton({ count = 12 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="border rounded-lg p-4 animate-pulse">
          <div className="h-48 bg-gray-200 rounded mb-4" />
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default function CategoryLayout({
  locale,
  categoryId,
  categoryName,
  categorySlug,
  categoryDescription,
  seriesId,
  categoryTree,
  basePath,
  urlPattern,
}: any) {
  if (!categoryId) {
    return <div className="container mx-auto px-4 py-8 text-center text-gray-500">分类信息加载中...</div>;
  }

  const router = useRouter();
  const pathname = usePathname();
  const abortRef = useRef<AbortController | null>(null);
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    page: 1,
    sort: 'default',
    minPrice: undefined as number | undefined,
    maxPrice: undefined as number | undefined,
    minQty: undefined as number | undefined,
  });
  const pageSize = 12;

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setFilters({
      page: Number(sp.get('page')) || 1,
      sort: sp.get('sort') || 'default',
      minPrice: sp.get('minPrice') ? Number(sp.get('minPrice')) : undefined,
      maxPrice: sp.get('maxPrice') ? Number(sp.get('maxPrice')) : undefined,
      minQty: sp.get('minQty') ? Number(sp.get('minQty')) : undefined,
    });
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!categoryId) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      page: String(filters.page),
      size: String(pageSize),
      sort: filters.sort,
      locale,
    });
    if (seriesId) params.set('seriesId', seriesId);
    if (filters.minPrice !== undefined) params.set('minPrice', String(filters.minPrice));
    if (filters.maxPrice !== undefined) params.set('maxPrice', String(filters.maxPrice));
    if (filters.minQty !== undefined) params.set('minQty', String(filters.minQty));

    try {
      const res = await fetch(`/api/front/products/category/${categoryId}?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error(err);
        setError('加载失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId, seriesId, filters, locale, pageSize]);

  useEffect(() => {
    fetchProducts();
    return () => abortRef.current?.abort();
  }, [fetchProducts]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    const final = { ...filters, ...newFilters, page: 1 };
    setFilters(final);
    const sp = new URLSearchParams();
    if (final.sort !== 'default') sp.set('sort', final.sort);
    if (final.minPrice !== undefined) sp.set('minPrice', String(final.minPrice));
    if (final.maxPrice !== undefined) sp.set('maxPrice', String(final.maxPrice));
    if (final.minQty !== undefined) sp.set('minQty', String(final.minQty));
    const query = sp.toString();
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateFilters({ page: newPage });
  };

  const totalPages = Math.ceil(total / pageSize);
  if (error) return <div className="text-center py-12 text-red-600">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-1/4">
          <div className="bg-white rounded-lg border p-4 sticky top-4">
            <h3 className="font-semibold text-lg mb-3">产品分类</h3>
            <CategoryTree
              tree={categoryTree}
              currentSlug={categorySlug}
              currentSeriesId={seriesId}
              basePath={basePath}
              locale={locale}
            />
          </div>
        </aside>
        <main className="lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">{categoryName}</h1>
            {categoryDescription && <p className="text-gray-600">{categoryDescription}</p>}
          </div>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="text-sm text-gray-500">共 {total} 件商品</div>
            <div className="flex gap-3">
              <PriceFilter min={filters.minPrice} max={filters.maxPrice} onChange={(min, max) => updateFilters({ minPrice: min, maxPrice: max })} />
              <input
                type="number"
                placeholder="最小起订量"
                value={filters.minQty ?? ''}
                onChange={(e) => updateFilters({ minQty: e.target.value ? Number(e.target.value) : undefined })}
                className="border rounded p-2 w-32 text-sm"
              />
              <SortDropdown value={filters.sort} onChange={(val) => updateFilters({ sort: val })} />
            </div>
          </div>
          {loading ? (
            <ProductsSkeleton count={pageSize} />
          ) : products.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无产品</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination currentPage={filters.page} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}