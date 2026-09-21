'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import ProductCard from '@/components/front/ProductCard';

type SortOption = 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc';

// ========== 工具函数：标准化换行符 ==========
const normalizeLineBreaks = (text: string) => {
  if (!text) return '';
  return text.replace(/\\n/g, '\n').trim();
};

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BORDER_TRANSITION = `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export function ProductCollectionsBlock({ productsPerRow = 3, __runtime, puck }: any) {
  const t = useTranslations('Components.ProductCollections');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ============================================================
  // ✅ 产品集合页面专属 CSS 变量（带最终 fallback）
  // ============================================================
  // ---- 容器 ----
  const containerBg = 'var(--product-collections-bg, var(--background, #ffffff))';
  const containerText = 'var(--product-collections-text, var(--foreground, #0f172a))';

  // ---- 标题与描述 ----
  const titleColor = 'var(--product-collections-title-color, var(--foreground, #0f172a))';
  const descTextColor = 'var(--product-collections-description-text, var(--muted-foreground, #64748b))';

  // ---- 筛选栏 ----
  const filterBg = 'var(--product-collections-filter-bg, var(--background, #ffffff))';
  const filterText = 'var(--product-collections-filter-text, var(--foreground, #0f172a))';
  const filterBorder = 'var(--product-collections-filter-border, var(--border, #e2e8f0))';
  const filterMutedText = 'var(--product-collections-filter-muted-text, var(--muted-foreground, #64748b))';
  const filterInputBg = 'var(--product-collections-filter-input-bg, transparent)';
  const filterInputText = 'var(--product-collections-filter-input-text, var(--foreground, #0f172a))';

  // ---- 分页 ----
  const paginationBg = 'var(--product-collections-pagination-bg, var(--background, #ffffff))';
  const paginationText = 'var(--product-collections-pagination-text, var(--foreground, #0f172a))';
  const paginationHoverBg = 'var(--product-collections-pagination-hover-bg, var(--muted, #f1f5f9))';
  const paginationBorder = 'var(--product-collections-pagination-border, var(--border, #e2e8f0))';
  const paginationDisabledOpacity = '0.5';

  // ========== 排序选项映射 ==========
  const sortOptionKeys: Record<SortOption, string> = {
    'title-asc': 'titleAsc',
    'title-desc': 'titleDesc',
    'price-asc': 'priceAsc',
    'price-desc': 'priceDesc',
    'created-asc': 'createdAsc',
    'created-desc': 'createdDesc',
  };

  // ========== 防御性检查 ==========
  if (!__runtime?.collection || !__runtime?.products) {
    return (
      <div
        className="border-2 border-dashed text-center"
        ref={puck?.dragRef}
        style={{
          padding: 'var(--spacing-8, 2rem)',
          borderColor: 'var(--border, #e2e8f0)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        {t('placeholder')}
      </div>
    );
  }

  // ========== 直接从 __runtime 获取数据 ==========
  const collection = useMemo(() => __runtime.collection, [__runtime.collection]);
  const initialProducts = useMemo(() => __runtime.products || [], [__runtime.products]);
  const total = __runtime.total || 0;
  const currentPage = __runtime.page || 1;
  const totalPages = __runtime.totalPages || 1;
  const pageSize = __runtime.pageSize || 15;
  const locale = __runtime.locale || 'zh';
  const urlPattern = __runtime.urlPattern || '';

  // ========== 分类描述展开/收起逻辑 ==========
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const rawDescription = collection.description || '';
  const normalizedDesc = normalizeLineBreaks(rawDescription);

  useEffect(() => {
    setExpanded(false);
    setShowToggle(false);
  }, [rawDescription]);

  useEffect(() => {
    if (!descRef.current || expanded) return;
    const el = descRef.current;
    requestAnimationFrame(() => {
      if (el.scrollHeight > el.clientHeight) {
        setShowToggle(true);
      } else {
        setShowToggle(false);
      }
    });
  }, [normalizedDesc, expanded]);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  // ========== 筛选参数 ==========
  const sortBy = (searchParams.get('sort') as SortOption) || 'title-asc';
  const availability = searchParams.get('availability') as 'in-stock' | 'out-of-stock' | null;
  const minPrice = searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null;
  const maxPrice = searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null;

  // ========== 客户端过滤和排序（纯前端） ==========
  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    if (availability === 'in-stock') {
      result = result.filter(p => p.availability === 'in_stock');
    } else if (availability === 'out-of-stock') {
      result = result.filter(p => p.availability === 'out_of_stock');
    }

    if (minPrice !== null) {
      result = result.filter(p => {
        const tiers = p.price_tiers || [];
        const prices = tiers.map((t: any) => t.price).filter((v: any) => typeof v === 'number');
        if (prices.length === 0) return true;
        return Math.min(...prices) >= minPrice;
      });
    }
    if (maxPrice !== null) {
      result = result.filter(p => {
        const tiers = p.price_tiers || [];
        const prices = tiers.map((t: any) => t.price).filter((v: any) => typeof v === 'number');
        if (prices.length === 0) return true;
        return Math.min(...prices) <= maxPrice;
      });
    }

    const getMinPrice = (p: any) => {
      const tiers = p.price_tiers || [];
      const prices = tiers.map((t: any) => t.price).filter((v: any) => typeof v === 'number');
      return prices.length > 0 ? Math.min(...prices) : Infinity;
    };

    switch (sortBy) {
      case 'title-asc':
        result.sort((a, b) => a.product_name?.localeCompare(b.product_name) || 0);
        break;
      case 'title-desc':
        result.sort((a, b) => b.product_name?.localeCompare(a.product_name) || 0);
        break;
      case 'price-asc':
        result.sort((a, b) => getMinPrice(a) - getMinPrice(b));
        break;
      case 'price-desc':
        result.sort((a, b) => getMinPrice(b) - getMinPrice(a));
        break;
      case 'created-asc':
        result.sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
        break;
      case 'created-desc':
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      default:
        break;
    }

    return result;
  }, [initialProducts, availability, minPrice, maxPrice, sortBy]);

  // ========== 更新筛选（通过 URL 参数） ==========
  const updateFilters = (updates: any) => {
    const params = new URLSearchParams(searchParams);
    if (updates.sort !== undefined) {
      updates.sort === 'title-asc' ? params.delete('sort') : params.set('sort', updates.sort);
    }
    if (updates.availability !== undefined) {
      updates.availability ? params.set('availability', updates.availability) : params.delete('availability');
    }
    if (updates.minPrice !== undefined) {
      updates.minPrice === null ? params.delete('minPrice') : params.set('minPrice', String(updates.minPrice));
    }
    if (updates.maxPrice !== undefined) {
      updates.maxPrice === null ? params.delete('maxPrice') : params.set('maxPrice', String(updates.maxPrice));
    }
    params.delete('page');
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('sort');
    params.delete('availability');
    params.delete('minPrice');
    params.delete('maxPrice');
    params.delete('page');
    router.push(`${pathname}${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  // ========== 分页导航 ==========
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const buildPageUrl = (page: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', String(page));
      return `${pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    };

    const pageBtnStyle: React.CSSProperties = {
      paddingLeft: 'var(--spacing-4, 1rem)',
      paddingRight: 'var(--spacing-4, 1rem)',
      paddingTop: 'var(--spacing-2, 0.5rem)',
      paddingBottom: 'var(--spacing-2, 0.5rem)',
      borderRadius: 'var(--radius-md, 0.625rem)',
      border: `1px solid ${paginationBorder}`,
      color: paginationText,
      backgroundColor: paginationBg,
      transition: `${BG_COLOR_TRANSITION}, ${COLOR_TRANSITION}, ${BORDER_TRANSITION}`,
    };

    return (
      <div
        className="flex justify-center items-center"
        style={{
          gap: 'var(--spacing-4, 1rem)',
          marginTop: 'var(--spacing-8, 2rem)',
        }}
      >
        <Link
          href={buildPageUrl(currentPage - 1)}
          style={{
            ...pageBtnStyle,
            opacity: currentPage <= 1 ? paginationDisabledOpacity : 1,
            pointerEvents: currentPage <= 1 ? 'none' : 'auto',
          }}
          onMouseEnter={(e) => {
            if (currentPage > 1) {
              e.currentTarget.style.backgroundColor = paginationHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage > 1) {
              e.currentTarget.style.backgroundColor = paginationBg;
            }
          }}
          scroll={false}
        >
          {t('prev')}
        </Link>
        <span
          style={{
            fontSize: 'var(--font-size-sm, 0.875rem)',
            color: paginationText,
          }}
        >
          {t('pageInfo', { current: currentPage, total: totalPages, totalItems: total })}
        </span>
        <Link
          href={buildPageUrl(currentPage + 1)}
          style={{
            ...pageBtnStyle,
            opacity: currentPage >= totalPages ? paginationDisabledOpacity : 1,
            pointerEvents: currentPage >= totalPages ? 'none' : 'auto',
          }}
          onMouseEnter={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.backgroundColor = paginationHoverBg;
            }
          }}
          onMouseLeave={(e) => {
            if (currentPage < totalPages) {
              e.currentTarget.style.backgroundColor = paginationBg;
            }
          }}
          scroll={false}
        >
          {t('next')}
        </Link>
      </div>
    );
  };

  // ========== 网格列数 ==========
  const validPerRow =
    typeof productsPerRow === 'number' && [1, 2, 3, 4].includes(productsPerRow)
      ? productsPerRow
      : 3;

  const gridColsMap: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };
  const gridCols = gridColsMap[validPerRow] || 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  // ========== 渲染 ==========
  return (
    <div
      className="mx-auto"
      style={{
        backgroundColor: containerBg,
        color: containerText,
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        paddingTop: 'var(--spacing-8, 2rem)',
        paddingBottom: 'var(--spacing-8, 2rem)',
        maxWidth: '80rem',
      }}
    >
      {/* 标题 + 描述（支持展开/收起） */}
      <div style={{ marginBottom: 'var(--spacing-6, 1.5rem)' }}>
        <h1
          style={{
            fontSize: 'var(--font-size-3xl, 1.875rem)',
            fontWeight: 'var(--font-weight-bold, 700)',
            color: titleColor,
            marginBottom: 'var(--spacing-2, 0.5rem)',
          }}
        >
          {collection.name}
        </h1>
        {rawDescription && (
          <div>
            <p
              ref={descRef}
              className={`${!expanded ? 'line-clamp-4' : ''}`}
              style={{
                color: descTextColor,
                whiteSpace: 'pre-wrap',
              }}
            >
              {normalizedDesc}
            </p>
            {showToggle && (
              <button
                onClick={handleToggle}
                style={{
                  color: 'var(--primary, #1e293b)',
                  marginTop: 'var(--spacing-1, 0.25rem)',
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  fontWeight: 'var(--font-weight-medium, 500)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {expanded ? t('collapse') : t('expand')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* 筛选栏 */}
      <div
        className="flex flex-wrap justify-between items-center"
        style={{
          gap: 'var(--spacing-4, 1rem)',
          marginBottom: 'var(--spacing-6, 1.5rem)',
          padding: 'var(--spacing-3, 0.75rem)',
          borderRadius: 'var(--radius-lg, 0.75rem)',
          backgroundColor: filterBg,
          border: `1px solid ${filterBorder}`,
        }}
      >
        <div
          className="flex flex-wrap items-center"
          style={{ gap: 'var(--spacing-3, 0.75rem)' }}
        >
          <label
            className="flex items-center"
            style={{
              gap: 'var(--spacing-1, 0.25rem)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: filterText,
            }}
          >
            <input
              type="checkbox"
              checked={availability === 'in-stock'}
              onChange={(e) => updateFilters({ availability: e.target.checked ? 'in-stock' : null })}
            />{' '}
            {t('inStock')}
          </label>
          <label
            className="flex items-center"
            style={{
              gap: 'var(--spacing-1, 0.25rem)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: filterText,
            }}
          >
            <input
              type="checkbox"
              checked={availability === 'out-of-stock'}
              onChange={(e) => updateFilters({ availability: e.target.checked ? 'out-of-stock' : null })}
            />{' '}
            {t('outOfStock')}
          </label>
          <div
            className="flex items-center border rounded"
            style={{
              gap: 'var(--spacing-1, 0.25rem)',
              paddingLeft: 'var(--spacing-2, 0.5rem)',
              paddingRight: 'var(--spacing-2, 0.5rem)',
              paddingTop: 'var(--spacing-1, 0.25rem)',
              paddingBottom: 'var(--spacing-1, 0.25rem)',
              borderRadius: 'var(--radius, 0.625rem)',
              borderColor: filterBorder,
              backgroundColor: filterBg,
            }}
          >
            <span style={{ color: filterText }}>¥</span>
            <input
              type="number"
              placeholder={t('minPrice')}
              value={minPrice ?? ''}
              onChange={(e) => updateFilters({ minPrice: e.target.value ? Number(e.target.value) : null })}
              className="border-none bg-transparent focus:outline-none"
              style={{
                width: '5rem',
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: filterInputText,
                backgroundColor: filterInputBg,
              }}
            />
            <span style={{ color: filterText }}>-</span>
            <span style={{ color: filterText }}>¥</span>
            <input
              type="number"
              placeholder={t('maxPrice')}
              value={maxPrice ?? ''}
              onChange={(e) => updateFilters({ maxPrice: e.target.value ? Number(e.target.value) : null })}
              className="border-none bg-transparent focus:outline-none"
              style={{
                width: '5rem',
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: filterInputText,
                backgroundColor: filterInputBg,
              }}
            />
          </div>
          {(availability || minPrice !== null || maxPrice !== null || sortBy !== 'title-asc') && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: 'var(--primary, #1e293b)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {t('clearFilters')}
            </button>
          )}
        </div>
        <div
          className="flex items-center"
          style={{ gap: 'var(--spacing-2, 0.5rem)' }}
        >
          <span
            style={{
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: filterMutedText,
            }}
          >
            {t('sortLabel')}
          </span>
          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
            className="border rounded"
            style={{
              padding: 'var(--spacing-1, 0.25rem)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              borderRadius: 'var(--radius, 0.625rem)',
              borderColor: filterBorder,
              color: filterText,
              backgroundColor: filterBg,
            }}
          >
            {Object.entries(sortOptionKeys).map(([value, key]) => (
              <option key={value} value={value}>
                {t(`sortOptions.${key}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 产品列表 */}
      {filteredProducts.length === 0 ? (
        <div
          className="text-center"
          style={{
            paddingTop: 'var(--spacing-12, 3rem)',
            paddingBottom: 'var(--spacing-12, 3rem)',
            color: filterMutedText,
          }}
        >
          {t('noProducts')}
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 'var(--font-size-sm, 0.875rem)',
              marginBottom: 'var(--spacing-4, 1rem)',
              color: filterMutedText,
            }}
          >
            {t('productCount', { count: filteredProducts.length, total })}
          </div>
          <div
            className={`grid ${gridCols}`}
            style={{ gap: 'var(--spacing-6, 1.5rem)' }}
          >
            {filteredProducts.map((product) => (
              <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
            ))}
          </div>
          <Pagination />
        </>
      )}
    </div>
  );
}