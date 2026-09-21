'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CategoryTree from '@/components/front/CategoryTree';
import { getImageUrl } from '@/lib/files/url';

export interface IndustrialProductLineBlockProps {
  showSidebar?: boolean;
  puck?: {
    isEditing?: boolean;
    dragRef?: any;
  };
  __runtime?: {
    productLine: {
      id: string;
      name: string;
      slug: string;
      seoTitle?: string;
    };
    categoryTree: any[];
    products: any[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
    currentSlug?: string;
    locale: string;
    urlPattern: string;
    loading?: boolean;
  };
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

// ★ 工具函数：标准化换行符
const normalizeLineBreaks = (text: string) => {
  if (!text) return '';
  return text.replace(/\\n/g, '\n').trim();
};

// 骨架屏组件
const TableSkeleton = ({ columns = 7, rows = 5 }) => (
  <div
    className="border rounded-lg overflow-hidden animate-pulse"
    style={{ borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))' }}
  >
    <div
      className="border-b"
      style={{
        borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))',
        padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
      }}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted/60 rounded" />
        ))}
      </div>
    </div>
    {Array.from({ length: rows }).map((_, ri) => (
      <div
        key={ri}
        className="border-b last:border-b-0"
        style={{
          borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))',
          padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
        }}
      >
        <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-2">
          {Array.from({ length: columns }).map((_, ci) => (
            <div key={ci} className="h-4 bg-muted/40 rounded" />
          ))}
        </div>
      </div>
    ))}
  </div>
);

export function IndustrialProductLineBlock(props: IndustrialProductLineBlockProps) {
  const { showSidebar = true, __runtime, puck } = props;
  const t = useTranslations('Components.IndustrialProductLine');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (puck?.isEditing) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50"
      >
        <div className="text-lg font-medium">{t('editModeTitle')}</div>
        <div className="text-sm mt-1">{t('editModeHint')}</div>
        {showSidebar && <div className="mt-2 text-xs text-gray-400">{t('sidebarEnabled')}</div>}
      </div>
    );
  }

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

  const {
    productLine,
    categoryTree,
    products: rawProducts = [],
    totalCount = 0,
    currentPage = 1,
    pageSize = 15,
    currentSlug,
    locale,
    urlPattern,
    loading = false,
  } = __runtime;

  const productLineSlug = productLine.slug;
  const productLineName = productLine.name;

  // ============================================================
  // ✅ 工业产品线专属 CSS 变量（带最终 fallback）
  // ============================================================
  // ---- 标题区域 ----
  const headerBgColor = 'var(--industrial-header-bg, var(--background, #ffffff))';
  const headerTextColor = 'var(--industrial-header-text, var(--foreground, #0f172a))';
  const descTextColor = 'var(--industrial-description-text, var(--muted-foreground, #64748b))';

  // ---- 表格 ----
  const tableBg = 'var(--industrial-table-bg, var(--card, #ffffff))';
  const tableHeaderBg = 'var(--industrial-table-header-bg, var(--muted, #f1f5f9))';
  const tableBorder = 'var(--industrial-table-border, var(--border, #e2e8f0))';
  const tableRowHoverBg = 'var(--industrial-table-row-hover-bg, var(--muted, #f1f5f9))';
  const tableChildRowBg = 'var(--industrial-table-child-row-bg, var(--muted, #f1f5f9))';
  const tableText = 'var(--industrial-table-text, var(--foreground, #0f172a))';
  const tableMutedText = 'var(--industrial-table-muted-text, var(--muted-foreground, #64748b))';
  const tableLinkColor = 'var(--industrial-table-link-color, var(--primary, #1e293b))';

  // ---- 分页 ----
  const paginationBg = 'var(--industrial-pagination-bg, var(--background, #ffffff))';
  const paginationText = 'var(--industrial-pagination-text, var(--foreground, #0f172a))';
  const paginationActiveBg = 'var(--industrial-pagination-active-bg, var(--primary, #1e293b))';
  const paginationActiveText = 'var(--industrial-pagination-active-text, var(--primary-foreground, #f8fafc))';
  const paginationHoverBg = 'var(--industrial-pagination-hover-bg, var(--muted, #f1f5f9))';
  const paginationBorder = 'var(--industrial-pagination-border, var(--border, #e2e8f0))';

  // ---- 图片悬浮 ----
  const hoverImageBg = 'var(--industrial-hover-image-bg, var(--card, #ffffff))';
  const hoverImageBorder = 'var(--industrial-hover-image-border, var(--border, #e2e8f0))';

  // ============================================================
  // 响应式检测
  // ============================================================
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ============================================================
  // 构建产品树
  // ============================================================
  const productTree = useMemo(() => {
    if (rawProducts.length > 0 && rawProducts[0].children !== undefined) {
      return rawProducts;
    }
    const productMap = new Map<string, any>();
    rawProducts.forEach((p) => {
      productMap.set(p.productId, { ...p, children: [] });
    });
    rawProducts.forEach((p) => {
      if (p.parent_product_id && productMap.has(p.parent_product_id)) {
        const parent = productMap.get(p.parent_product_id);
        parent.children.push(p);
      }
    });
    const parents = Array.from(productMap.values()).filter(
      (p) => !p.parent_product_id || p.parent_product_id === null
    );
    parents.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    return parents;
  }, [rawProducts]);

  // ============================================================
  // 提取表头
  // ============================================================
  const MAX_ATTRIBUTES = 7;
  const headerKeys = useMemo(() => {
    const keySet = new Set<string>();
    for (const product of productTree) {
      if (product.attributes && typeof product.attributes === 'object') {
        Object.keys(product.attributes).forEach(key => keySet.add(key));
      }
    }
    return Array.from(keySet).slice(0, MAX_ATTRIBUTES);
  }, [productTree]);

  // ============================================================
  // 动态列宽
  // ============================================================
  const gridTemplateColumns = useMemo(() => {
    if (headerKeys.length === 0) return '1fr';
    const firstMin = isMobile ? '120px' : '180px';
    const otherMin = isMobile ? '70px' : '100px';
    const firstCol = `minmax(${firstMin}, 2fr)`;
    const otherCols = headerKeys.length > 1
      ? `repeat(${headerKeys.length - 1}, minmax(${otherMin}, 1fr))`
      : '';
    return `${firstCol} ${otherCols}`.trim();
  }, [headerKeys, isMobile]);

  // ============================================================
  // 折叠状态
  // ============================================================
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback((productId: string) => {
    setExpandedMap((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  }, []);

  // ============================================================
  // 悬浮图片
  // ============================================================
  const [hoveredProduct, setHoveredProduct] = useState<any | null>(null);
  const [imagePosition, setImagePosition] = useState({ top: 0, left: 0 });
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = useCallback((product: any, e: React.MouseEvent<HTMLDivElement>) => {
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
    const rowEl = e.currentTarget;
    const rect = rowEl.getBoundingClientRect();
    const tableContainer = rowEl.closest('.relative.overflow-x-auto');
    if (tableContainer) {
      const tableRect = tableContainer.getBoundingClientRect();
      setImagePosition({
        top: rect.top + rect.height / 2 - 75,
        left: tableRect.left - 155,
      });
    } else {
      setImagePosition({
        top: rect.top + rect.height / 2 - 75,
        left: rect.left - 155,
      });
    }
    setHoveredProduct(product);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current);
    imageTimeoutRef.current = setTimeout(() => {
      setHoveredProduct(null);
    }, 200);
  }, []);

  // ============================================================
  // 分页
  // ============================================================
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams);
    if (newPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(newPage));
    }
    const queryString = params.toString();
    router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [currentPage, totalPages, searchParams, pathname, router]);

  // ============================================================
  // 分类树
  // ============================================================
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

  const effectiveCurrentSlug = useMemo(() => {
    if (currentSlug) return currentSlug;
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length >= 4 && segments[1] === 'products' && segments[2] === productLineSlug) {
      return segments[3];
    }
    return undefined;
  }, [pathname, productLineSlug, currentSlug]);

  const currentCategoryInfo = useMemo(() => {
    if (!effectiveCurrentSlug) return null;
    for (const cat of categoryTree) {
      if (cat.slug === effectiveCurrentSlug) {
        return { name: cat.name, description: cat.description };
      }
      const series = cat.children?.find((s: any) => s.slug === effectiveCurrentSlug);
      if (series) {
        return { name: series.name, description: series.description };
      }
    }
    return null;
  }, [categoryTree, effectiveCurrentSlug]);

  // 描述折叠展开
  const [descExpanded, setDescExpanded] = useState(false);
  const [showDescToggle, setShowDescToggle] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const description = currentCategoryInfo?.description || '';

  useEffect(() => {
    setDescExpanded(false);
    setShowDescToggle(false);
  }, [description]);

  useEffect(() => {
    if (!descRef.current || descExpanded) return;
    const el = descRef.current;
    requestAnimationFrame(() => {
      if (el.scrollHeight > el.clientHeight) {
        setShowDescToggle(true);
      } else {
        setShowDescToggle(false);
      }
    });
  }, [description, descExpanded]);

  const handleDescToggle = () => {
    setDescExpanded(!descExpanded);
  };

  const normalizedDesc = normalizeLineBreaks(description);

  // ============================================================
  // 渲染行
  // ============================================================
  const renderProductRows = useCallback(() => {
    if (productTree.length === 0) {
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

    const rowStyle = { display: 'grid', gridTemplateColumns };

    const renderRow = (product: any, isChild: boolean = false, parentSlug?: string) => {
      const attrs = product.attributes || {};
      const productId = product.productId;
      const hasChildren = !isChild && product.children && product.children.length > 0;
      const isExpanded = !!expandedMap[productId];
      const firstAttrKey = headerKeys.length > 0 ? headerKeys[0] : '';
      const firstAttrValue = attrs[firstAttrKey] || '-';

      let productLink: string;
      if (isChild && parentSlug) {
        productLink = `/${locale}/product/${parentSlug}?variant=${productId}`;
      } else {
        productLink = product.slug ? `/${locale}/product/${product.slug}` : '#';
      }

      const handleClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('a')) return;
        if (!isChild) {
          toggleExpand(productId);
        }
      };

      return (
        <div
          key={productId}
          className="grid items-center cursor-pointer"
          style={{
            ...rowStyle,
            padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
            backgroundColor: isChild
              ? 'var(--industrial-table-child-row-bg, var(--muted, #f1f5f9))'
              : 'transparent',
            transition: BG_COLOR_TRANSITION,
          }}
          onClick={handleClick}
          onMouseEnter={(e) => {
            if (!isChild) {
              e.currentTarget.style.backgroundColor = 'var(--industrial-table-row-hover-bg, var(--muted, #f1f5f9))';
            }
            handleMouseEnter(product, e);
          }}
          onMouseLeave={(e) => {
            if (!isChild) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
            handleMouseLeave();
          }}
        >
          <div
            className="col-span-1 font-medium flex items-center min-w-0"
            style={{
              color: 'var(--industrial-table-text, var(--foreground, #0f172a))',
              gap: 'var(--spacing-2, 0.5rem)',
            }}
          >
            {!isChild && hasChildren && (
              <span
                className="flex-shrink-0"
                style={{ color: 'var(--muted-foreground, #64748b)' }}
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </span>
            )}
            {isChild && <span className="w-4 flex-shrink-0"></span>}
            <Link
              href={productLink}
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-2 hover:underline truncate"
              style={{ color: 'var(--industrial-table-link-color, var(--primary, #1e293b))' }}
            >
              {firstAttrValue}
            </Link>
          </div>
          {headerKeys.slice(1).map((key) => (
            <div
              key={key}
              className="col-span-1 truncate"
              style={{ color: 'var(--industrial-table-muted-text, var(--muted-foreground, #64748b))' }}
              title={attrs[key]}
            >
              {attrs[key] || '-'}
            </div>
          ))}
        </div>
      );
    };

    return (
      <>
        {/* 表头 */}
        <div
          className="font-medium border-b"
          style={{
            display: 'grid',
            gridTemplateColumns,
            padding: 'var(--spacing-3, 0.75rem) var(--spacing-4, 1rem)',
            fontSize: 'var(--font-size-sm, 0.875rem)',
            backgroundColor: 'var(--industrial-table-header-bg, var(--muted, #f1f5f9))',
            color: 'var(--industrial-table-muted-text, var(--muted-foreground, #64748b))',
            borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))',
          }}
        >
          {headerKeys.map((key) => (
            <div key={key} className="truncate whitespace-nowrap" title={key}>
              {key}
            </div>
          ))}
        </div>

        {/* 数据行 */}
        {productTree.map((product) => {
          const hasChildren = product.children && product.children.length > 0;
          return (
            <div
              key={product.productId}
              className="border-b last:border-b-0"
              style={{ borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))' }}
            >
              {renderRow(product, false)}
              {hasChildren && expandedMap[product.productId] && (
                <div
                  className="border-t overflow-hidden"
                  style={{
                    borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))',
                    transition: `all var(--transition-duration-200, 200ms) var(--transition-timing-ease, ease)`,
                  }}
                >
                  {product.children.map((child: any) => renderRow(child, true, product.slug))}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }, [productTree, headerKeys, expandedMap, toggleExpand, locale, handleMouseEnter, handleMouseLeave, gridTemplateColumns, t]);

  // ============================================================
  // 悬浮图片
  // ============================================================
  const renderHoverImage = useCallback(() => {
    if (!hoveredProduct) return null;
    const imgSrc = getImageUrl(hoveredProduct.main_image_url) || '/placeholder.png';
    return (
      <div
        className="fixed pointer-events-none z-50 border overflow-hidden"
        style={{
          left: imagePosition.left,
          top: imagePosition.top,
          width: '150px',
          height: '150px',
          opacity: 1,
          borderRadius: 'var(--radius-lg, 0.75rem)',
          boxShadow: 'var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1))',
          backgroundColor: 'var(--industrial-hover-image-bg, var(--card, #ffffff))',
          borderColor: 'var(--industrial-hover-image-border, var(--border, #e2e8f0))',
          transition: `opacity var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`,
        }}
      >
        <img
          src={imgSrc}
          alt={hoveredProduct.product_name || '产品图片'}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/placeholder.png';
          }}
        />
      </div>
    );
  }, [hoveredProduct, imagePosition]);

  // ============================================================
  // 主渲染
  // ============================================================
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
              currentSlug={effectiveCurrentSlug}
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
                  className={`${!descExpanded ? 'line-clamp-4' : ''}`}
                  style={{
                    color: descTextColor,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {normalizedDesc}
                </p>
                {showDescToggle && (
                  <button
                    onClick={handleDescToggle}
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
                    {descExpanded ? t('collapse') : t('expand')}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 表格容器 */}
          <div
            className="border overflow-x-auto relative"
            style={{
              borderRadius: 'var(--radius-lg, 0.75rem)',
              backgroundColor: 'var(--industrial-table-bg, var(--card, #ffffff))',
              borderColor: 'var(--industrial-table-border, var(--border, #e2e8f0))',
            }}
          >
            <div className="min-w-[640px]">
              {loading ? (
                <TableSkeleton columns={headerKeys.length || 7} rows={5} />
              ) : (
                renderProductRows()
              )}
            </div>
          </div>

          {/* 分页组件 */}
          {totalPages > 1 && (
            <div
              className="flex justify-center items-center"
              style={{
                gap: 'var(--spacing-4, 1rem)',
                marginTop: 'var(--spacing-8, 2rem)',
              }}
            >
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
          )}
        </main>
      </div>
      {renderHoverImage()}
    </div>
  );
}