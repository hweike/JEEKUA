'use client';

import { useState, useEffect } from 'react';
import CategoryForm from '@/components/videosys-admin/CategoryForm';

export default function EditCategoryForm({ categoryKey, locale }: { categoryKey: string; locale: string }) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategory = async () => {
      const res = await fetch(`/api/admin/videosys-categories?locale=${locale}&key=${categoryKey}`);
      const data = await res.json();
      if (data) {
        setInitialData({
          name: data.name,
          slug: data.slug,
          order: data.order ?? 0,
          commentStatus: data.commentStatus || 'allowed',
          template: data.template || '',
          seo_keywords: data.seo_keywords || '',
          seo_title: data.seo_title || '',
          seo_description: data.seo_description || '',
        });
      }
      setLoading(false);
    };
    fetchCategory();
  }, [categoryKey, locale]);

  if (loading) return <div className="p-6">加载中...</div>;
  if (!initialData) return <div className="p-6 text-red-500">分类不存在</div>;

  return <CategoryForm mode="edit" locale={locale} initialKey={categoryKey} initialData={initialData} />;
}