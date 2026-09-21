'use client';

import { useEffect, useState } from 'react';

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
}

interface BlogCategoryTreeProps {
  locale: string;
  selectedCategoryId: string;
  onSelect: (categoryId: string) => void;
}

export default function BlogCategoryTree({
  locale,
  selectedCategoryId,
  onSelect,
}: BlogCategoryTreeProps) {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/blog/categories?locale=${encodeURIComponent(locale)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCategories(data.items || []);
      })
      .catch((err) => console.error('[BlogCategoryTree]', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [locale]);

  if (loading) {
    return <div className="text-xs text-gray-400 p-2">加载分类中...</div>;
  }

  return (
    <div className="space-y-1">
      {/* "全部" 选项 */}
      <button
        type="button"
        onClick={() => onSelect('')}
        className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
          selectedCategoryId === ''
            ? 'bg-blue-500 text-white'
            : 'hover:bg-gray-100'
        }`}
      >
        全部分类
      </button>

      {categories.map((cat) => {
        const isActive = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`w-full text-left px-2 py-1.5 rounded text-sm transition ${
              isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
            }`}
            title={cat.description}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}