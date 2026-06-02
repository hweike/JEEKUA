'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Series {
  slug: string;
  name: string;
}

interface Category {
  slug: string;
  name: string;
}

interface CategoryTreeProps {
  categories: Category[];
  seriesMap: Record<string, Series[]>;
  locale: string;
  currentSeriesSlug?: string;
  view: string;
}

export default function CategoryTree({
  categories,
  seriesMap,
  locale,
  currentSeriesSlug,
  view,
}: CategoryTreeProps) {
  const [expandedCats, setExpandedCats] = useState<string[]>([]);

  useEffect(() => {
    if (currentSeriesSlug) {
      let parentSlug: string | null = null;
      for (const cat of categories) {
        if (seriesMap[cat.slug]?.some(s => s.slug === currentSeriesSlug)) {
          parentSlug = cat.slug;
          break;
        }
      }
      if (parentSlug) {
        setExpandedCats([parentSlug]);
      } else {
        setExpandedCats(categories.length > 0 ? [categories[0].slug] : []);
      }
    } else {
      setExpandedCats(categories.length > 0 ? [categories[0].slug] : []);
    }
  }, [currentSeriesSlug, categories, seriesMap]);

  const toggleCategory = (slug: string) => {
    setExpandedCats(prev => 
      prev.includes(slug) ? [] : [slug]
    );
  };

  return (
    <aside className="w-full md:w-80 border-r border-border bg-background">
      <div className="sticky top-16 p-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          产品分类
        </h2>
        {categories.map((cat) => {
          const isExpanded = expandedCats.includes(cat.slug);
          return (
            <div key={cat.slug} className="mb-1">
              <button
                onClick={() => toggleCategory(cat.slug)}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-accent flex justify-between items-center text-foreground font-medium"
              >
                <span>{cat.name}</span>
                <svg
                  className={`w-4 h-4 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              {isExpanded && seriesMap[cat.slug] && (
                <ul className="ml-4 space-y-1">
                  {seriesMap[cat.slug].map((series) => (
                    <li key={series.slug}>
                      <Link
                        href={`/${locale}/products/${view}/${cat.slug}/${series.slug}`}
                        className={`block w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                          currentSeriesSlug === series.slug
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                        }`}
                      >
                        {series.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}