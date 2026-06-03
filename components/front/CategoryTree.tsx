'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

// 定义组件 Props 类型
interface CategoryTreeProps {
  productLineNameEncoded: string;
  categories: any[]; // 可根据实际业务定义更具体的类型
  seriesMap: Record<string, any[]>; // key: 一级分类 slug, value: 二级分类数组
  currentSlug?: string;
  locale: string;
  basePath?: string;
}

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

  useEffect(() => {
    if (currentSlug) {
      // 先检查 currentSlug 是否是二级分类，找到父级
      let parentSlug: string | null = null;
      for (const cat of categories) {
        if (seriesMap[cat.slug]?.some((s: any) => s.slug === currentSlug)) {
          parentSlug = cat.slug;
          break;
        }
      }
      // 如果没找到父级，再检查是否是某个一级分类的 slug
      if (!parentSlug) {
        const matchedCategory = categories.find((cat: any) => cat.slug === currentSlug);
        if (matchedCategory) parentSlug = matchedCategory.slug;
      }
      setExpandedCatSlug(parentSlug);
    } else if (categories.length > 0 && !expandedCatSlug) {
      // 如果是产品线首页（无选中分类），默认展开第一个一级分类
      setExpandedCatSlug(categories[0].slug);
    }
  }, [currentSlug, categories, seriesMap, expandedCatSlug]);

  const toggleCategory = (slug: string) => setExpandedCatSlug(prev => (prev === slug ? null : slug));
  const isCategoryActive = (slug: string) => currentSlug === slug;
  const isSeriesActive = (slug: string) => currentSlug === slug;

  // 纯 CSS 变量，无硬编码颜色值
  const textColor = 'var(--navbar-text, var(--foreground))';
  const hoverTextColor = 'var(--navbar-hover-text, var(--primary))';
  const hoverBgColor = 'var(--navbar-hover-bg, transparent)';
  const activeTextColor = 'var(--navbar-active-text, var(--primary))';
  const activeBgColor = 'var(--navbar-active-bg, color-mix(in oklch, var(--primary) 10%, transparent))';

  return (
    <aside className="w-full md:w-64 flex-shrink-0">
      <div className="sticky top-16 pb-8">
        <div className="space-y-1">
          {categories.map((cat: any) => {
            const series = seriesMap[cat.slug] || [];
            const hasSeries = series.length > 0;
            const isExpanded = expandedCatSlug === cat.slug;
            const isActive = isCategoryActive(cat.slug);

            return (
              <div key={cat.slug} className="relative">
                {/* 一级分类：整行点击可跳转，同时右侧箭头控制折叠 */}
                <div
                  className="flex items-center justify-between w-full rounded-md transition-all"
                  style={{
                    backgroundColor: isActive ? activeBgColor : 'transparent',
                  }}
                >
                  <Link
                    href={`${baseHref}/${cat.slug}`}
                    className="flex-1 py-1.5 px-2 text-sm font-medium"
                    style={{
                      color: isActive ? activeTextColor : textColor,
                      transition: 'color 150ms ease',
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
                        e.preventDefault();   // 防止触发 Link 的跳转
                        e.stopPropagation();
                        toggleCategory(cat.slug);
                      }}
                      className="p-1 rounded-md"
                      style={{
                        color: textColor,
                        transition: 'color 150ms ease',
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
                  <ul className="ml-4 mt-1 space-y-1 border-l border-gray-100 pl-2">
                    {series.map((s: any) => {
                      const active = isSeriesActive(s.slug);
                      return (
                        <li key={s.slug}>
                          <Link
                            href={`${baseHref}/${s.slug}`}
                            className="block py-1.5 px-2 rounded-md text-sm"
                            style={{
                              transition: 'background-color 150ms ease, color 150ms ease',
                              backgroundColor: active ? activeBgColor : 'transparent',
                              color: active ? activeTextColor : textColor,
                              fontWeight: active ? 500 : 'normal',
                            }}
                            onMouseEnter={(e) => {
                              if (active) return;
                              e.currentTarget.style.color = hoverTextColor;
                              // 直接应用背景色，无需判断透明（CSS 变量会正确处理）
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