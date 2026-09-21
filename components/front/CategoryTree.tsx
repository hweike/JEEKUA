'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface CategoryTreeProps {
  productLineNameEncoded: string;
  categories: any[];
  seriesMap: Record<string, any[]>;
  currentSlug?: string;
  locale: string;
  basePath?: string;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const COLOR_BG_TRANSITION = `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`;

export default function CategoryTree({
  productLineNameEncoded,
  categories,
  seriesMap,
  currentSlug,
  locale,
  basePath = 'products',
}: CategoryTreeProps) {
  const [expandedCatSlug, setExpandedCatSlug] = useState<string | null>(null);
  const baseHref = `/${locale}/${basePath}/${productLineNameEncoded}`;

  // 规范化 slug
  const normalizeSlug = (slug: string) => {
    try {
      return decodeURIComponent(slug).toLowerCase();
    } catch {
      return slug.toLowerCase();
    }
  };

  useEffect(() => {
    if (currentSlug) {
      const normalizedCurrent = normalizeSlug(currentSlug);
      let parentSlug: string | null = null;

      for (const cat of categories) {
        const seriesList = seriesMap[cat.slug] || [];
        if (seriesList.some((s: any) => normalizeSlug(s.slug) === normalizedCurrent)) {
          parentSlug = cat.slug;
          break;
        }
      }

      if (!parentSlug) {
        const matchedCategory = categories.find(
          (cat: any) => normalizeSlug(cat.slug) === normalizedCurrent
        );
        if (matchedCategory) parentSlug = matchedCategory.slug;
      }

      if (parentSlug) {
        setExpandedCatSlug(parentSlug);
      }
    } else if (categories.length > 0 && !expandedCatSlug) {
      setExpandedCatSlug(categories[0].slug);
    }
  }, [currentSlug, JSON.stringify(categories), JSON.stringify(seriesMap)]);

  const toggleCategory = (slug: string) => setExpandedCatSlug(prev => (prev === slug ? null : slug));
  const isCategoryActive = (slug: string) => currentSlug === slug;
  const isSeriesActive = (slug: string) => currentSlug === slug;

  // ============================================================
  // ✅ 分类树专属变量（带最终 fallback）
  // ============================================================
  const textColor = 'var(--category-tree-text, var(--foreground, #0f172a))';
  const hoverTextColor = 'var(--category-tree-hover-text, var(--primary, #1e293b))';
  const hoverBgColor = 'var(--category-tree-hover-bg, var(--muted, #f1f5f9))';
  const activeTextColor = 'var(--category-tree-active-text, var(--primary, #1e293b))';
  const activeBgColor = 'var(--category-tree-active-bg, var(--accent, #f1f5f9))';
  const borderColor = 'var(--category-tree-border, var(--border, #e2e8f0))';

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <div className="sticky top-16" style={{ paddingBottom: 'var(--spacing-8, 2rem)' }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-1, 0.25rem)',
          }}
        >
          {categories.map((cat: any) => {
            const series = seriesMap[cat.slug] || [];
            const hasSeries = series.length > 0;
            const isExpanded = expandedCatSlug === cat.slug;
            const isActive = isCategoryActive(cat.slug);

            return (
              <div key={cat.slug} className="relative">
                {/* 一级分类 */}
                <div
                  className="flex items-center justify-between w-full"
                  style={{
                    borderRadius: 'var(--radius-md, 0.625rem)',
                    backgroundColor: isActive ? activeBgColor : 'transparent',
                    transition: BG_COLOR_TRANSITION,
                  }}
                >
                  <Link
                    href={`${baseHref}/${cat.slug}`}
                    className="flex-1"
                    style={{
                      paddingTop: 'var(--spacing-2, 0.5rem)',
                      paddingBottom: 'var(--spacing-2, 0.5rem)',
                      paddingLeft: 'var(--spacing-2, 0.5rem)',
                      paddingRight: 'var(--spacing-2, 0.5rem)',
                      fontSize: 'var(--font-size-sm, 0.875rem)',
                      fontWeight: 'var(--font-weight-medium, 500)',
                      color: isActive ? activeTextColor : textColor,
                      transition: COLOR_TRANSITION,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) e.currentTarget.style.color = hoverTextColor;
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) e.currentTarget.style.color = textColor;
                    }}
                  >
                    {cat.name}
                  </Link>
                  {hasSeries && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleCategory(cat.slug);
                      }}
                      style={{
                        padding: 'var(--spacing-1, 0.25rem)',
                        borderRadius: 'var(--radius-md, 0.625rem)',
                        color: textColor,
                        transition: COLOR_TRANSITION,
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = hoverTextColor;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = textColor;
                      }}
                      aria-label={isExpanded ? '折叠' : '展开'}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                  )}
                </div>

                {/* 二级分类列表 */}
                {isExpanded && hasSeries && (
                  <ul
                    className="border-l"
                    style={{
                      marginLeft: 'var(--spacing-4, 1rem)',
                      marginTop: 'var(--spacing-1, 0.25rem)',
                      paddingLeft: 'var(--spacing-2, 0.5rem)',
                      borderColor,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--spacing-1, 0.25rem)',
                    }}
                  >
                    {series.map((s: any) => {
                      const active = isSeriesActive(s.slug);
                      return (
                        <li key={s.slug}>
                          <Link
                            href={`${baseHref}/${s.slug}`}
                            className="block"
                            style={{
                              paddingTop: 'var(--spacing-2, 0.5rem)',
                              paddingBottom: 'var(--spacing-2, 0.5rem)',
                              paddingLeft: 'var(--spacing-2, 0.5rem)',
                              paddingRight: 'var(--spacing-2, 0.5rem)',
                              borderRadius: 'var(--radius-md, 0.625rem)',
                              fontSize: 'var(--font-size-sm, 0.875rem)',
                              transition: COLOR_BG_TRANSITION,
                              backgroundColor: active ? activeBgColor : 'transparent',
                              color: active ? activeTextColor : textColor,
                              fontWeight: active
                                ? 'var(--font-weight-medium, 500)'
                                : 'var(--font-weight-normal, 400)',
                            }}
                            onMouseEnter={(e) => {
                              if (active) return;
                              e.currentTarget.style.color = hoverTextColor;
                              e.currentTarget.style.backgroundColor = hoverBgColor;
                            }}
                            onMouseLeave={(e) => {
                              if (active) return;
                              e.currentTarget.style.color = textColor;
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            {s.name}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}