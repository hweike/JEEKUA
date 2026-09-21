'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import CategoryTree from '@/components/front/CategoryTree';
import ProductCard from '@/components/front/ProductCard';

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

const normalizeLineBreaks = (text: string) => {
  if (!text) return '';
  return text.replace(/\\n/g, '\n').trim();
};

export function ProductLineBlock({ showSidebar = true, productsPerRow = 3, __runtime, puck }: any) {
  const t = useTranslations('Components.ProductLine');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (!__runtime?.productLine || !__runtime?.categoryTree) {
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

  const productLine = __runtime.productLine;
  const categoryTree = __runtime.categoryTree;
  const locale = __runtime.locale;
  const urlPattern = __runtime.urlPattern;
  const products = __runtime.products || [];
  const totalCount = __runtime.totalCount || 0;
  const currentPage = __runtime.currentPage || 1;
  const pageSize = __runtime.pageSize || 15;

  const productLineSlug = productLine.slug;
  const productLineName = productLine.name;

  const currentCategorySlug = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 4 && segments[1] === 'products' && segments[2] === productLineSlug) {
      return segments[3];
    }
    return undefined;
  }, [pathname, productLineSlug]);

  const currentCategoryInfo = useMemo(() => {
    if (!currentCategorySlug) return null;
    for (const cat of categoryTree) {
      if (cat.slug === currentCategorySlug) {
        return { name: cat.name, description: cat.description };
      }
      const series = cat.children?.find((s: any) => s.slug === currentCategorySlug);
      if (series) {
        return { name: series.name, description: series.description };
      }
    }
    return null;
  }, [categoryTree, currentCategorySlug]);

  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);

  const description = currentCategoryInfo?.description || '';

  useEffect(() => {
    setExpanded(false);
    setShowToggle(false);
  }, [description]);

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
  }, [description, expanded]);

  const handleToggle = () => setExpanded(!expanded);

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams);
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(newPage));
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const categories = useMemo(
    () => categoryTree.map((cat: any) => ({ slug: cat.slug, name: cat.name })),
    [categoryTree]
  );
  const seriesMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const cat of categoryTree) {
      map[cat.slug] = (cat.children || []).map((child: any) => ({ slug: child.slug, name: child.name }));
    }
    return map;
  }, [categoryTree]);

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

  // ============================================================
  // ✅ 标题区域变量（带最终 fallback）
  // ============================================================
  const headerBgColor = 'var(--product-line-header-bg, var(--background, #ffffff))';
  const headerTextColor = 'var(--product-line-header-text, var(--foreground, #0f172a))';
  const descTextColor = 'var(--product-line-description-text, var(--muted-foreground, #64748b))';

  // ============================================================
  // ✅ 分页组件专属变量（带最终 fallback）
  // ============================================================
  const paginationBg = 'var(--pagination-bg, var(--background, #ffffff))';
  const paginationText = 'var(--pagination-text, var(--foreground, #0f172a))';
  const paginationActiveBg = 'var(--pagination-active-bg, var(--primary, #1e293b))';
  const paginationActiveText = 'var(--pagination-active-text, var(--primary-foreground, #f8fafc))';
  const paginationHoverBg = 'var(--pagination-hover-bg, var(--muted, #f1f5f9))';
  const paginationBorder = 'var(--pagination-border, var(--border, #e2e8f0))';

  const renderContent = () => {
    if (products.length === 0) {
      return (
        <div
          className="text-center"
          style={{
            paddingTop: 'var(--spacing-12, 3rem)',
            paddingBottom: 'var(--spacing-12, 3rem)',
            color: 'var(--muted-foreground, #64748b)',
          }}
        >
          {t('noProducts')}
        </div>
      );
    }
    return (
      <>
        <div
          style={{
            fontSize: 'var(--font-size-sm, 0.875rem)',
            color: 'var(--muted-foreground, #64748b)',
            marginBottom: 'var(--spacing-4, 1rem)',
          }}
        >
          {t('productCount', { count: totalCount })}，{t('pageInfo', { current: currentPage, total: totalPages })}
        </div>
        <div
          className={`grid ${gridCols}`}
          style={{ gap: 'var(--spacing-6, 1.5rem)' }}
        >
          {products.map((product: any) => (
            <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
          ))}
        </div>

        {/* 分页组件 */}
        <div
          className="flex justify-center items-center"
          style={{
            gap: 'var(--spacing-4, 1rem)',
            marginTop: 'var(--spacing-8, 2rem)',
          }}
        >
          {/* 上一页 */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={!hasPrev}
            className="border"
            style={{
              paddingLeft: 'var(--spacing-4, 1rem)',
              paddingRight: 'var(--spacing-4, 1rem)',
              paddingTop: 'var(--spacing-2, 0.5rem)',
              paddingBottom: 'var(--spacing-2, 0.5rem)',
              borderRadius: 'var(--radius-md, 0.625rem)',
              backgroundColor: hasPrev ? paginationActiveBg : paginationBg,
              color: hasPrev ? paginationActiveText : paginationText,
              borderColor: paginationBorder,
              cursor: hasPrev ? 'pointer' : 'not-allowed',
              opacity: hasPrev ? 1 : 0.6,
              transition: BG_COLOR_TRANSITION,
            }}
            onMouseEnter={(e) => {
              if (hasPrev) {
                e.currentTarget.style.backgroundColor = paginationHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (hasPrev) {
                e.currentTarget.style.backgroundColor = paginationActiveBg;
              }
            }}
          >
            {t('prev')}
          </button>

          <span
            style={{
              fontSize: 'var(--font-size-sm, 0.875rem)',
              color: paginationText,
            }}
          >
            {t('pageInfo', { current: currentPage, total: totalPages })}
          </span>

          {/* 下一页 */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={!hasNext}
            className="border"
            style={{
              paddingLeft: 'var(--spacing-4, 1rem)',
              paddingRight: 'var(--spacing-4, 1rem)',
              paddingTop: 'var(--spacing-2, 0.5rem)',
              paddingBottom: 'var(--spacing-2, 0.5rem)',
              borderRadius: 'var(--radius-md, 0.625rem)',
              backgroundColor: hasNext ? paginationActiveBg : paginationBg,
              color: hasNext ? paginationActiveText : paginationText,
              borderColor: paginationBorder,
              cursor: hasNext ? 'pointer' : 'not-allowed',
              opacity: hasNext ? 1 : 0.6,
              transition: BG_COLOR_TRANSITION,
            }}
            onMouseEnter={(e) => {
              if (hasNext) {
                e.currentTarget.style.backgroundColor = paginationHoverBg;
              }
            }}
            onMouseLeave={(e) => {
              if (hasNext) {
                e.currentTarget.style.backgroundColor = paginationActiveBg;
              }
            }}
          >
            {t('next')}
          </button>
        </div>
      </>
    );
  };

  const normalizedDesc = normalizeLineBreaks(description);

  return (
    <div
      className="mx-auto"
      style={{
        backgroundColor: 'var(--background, #ffffff)',
        color: 'var(--foreground, #0f172a)',
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        paddingTop: 'var(--spacing-8, 2rem)',
        paddingBottom: 'var(--spacing-8, 2rem)',
        maxWidth: '80rem',
      }}
    >
      <div
        className="flex flex-col lg:flex-row"
        style={{ gap: 'var(--spacing-8, 2rem)' }}
      >
        {showSidebar && (
          <aside className="lg:w-1/4">
            <CategoryTree
              productLineNameEncoded={encodeURIComponent(productLineSlug)}
              categories={categories}
              seriesMap={seriesMap}
              currentSlug={currentCategorySlug}
              locale={locale}
              basePath="products"
            />
          </aside>
        )}
        <main className={showSidebar ? 'flex-1' : 'w-full'}>
          {/* 标题区域 */}
          <div
            style={{
              marginBottom: 'var(--spacing-6, 1.5rem)',
              padding: 'var(--spacing-4, 1rem)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              backgroundColor: headerBgColor,
              color: headerTextColor,
            }}
          >
            <h1
              style={{
                fontSize: 'var(--font-size-3xl, 1.875rem)',
                fontWeight: 'var(--font-weight-bold, 700)',
                marginBottom: 'var(--spacing-2, 0.5rem)',
              }}
            >
              {currentCategoryInfo?.name || productLineName}
            </h1>
            {description && (
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
}