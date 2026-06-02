'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation'; // ✅ 导入 useSearchParams
import CategoryModal from './CategoryModal';

interface CategoryItem {
  key: string;
  name: string;
  slug: string;
}

export default function CategoryTree({
  locale,
  selectedKey,
}: {
  locale: string;
  selectedKey: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams(); // ✅ 必须调用，获取 searchParams 对象
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/videosys-categories?locale=${locale}`);
    const data = await res.json();
    const items = Object.entries(data).map(([key, cat]: [string, any]) => ({
      key,
      name: cat.name,
      slug: cat.slug,
    }));
    setCategories(items);
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, [locale]);

  const handleSelect = (key: string) => {
    const params = new URLSearchParams(searchParams.toString()); // ✅ 现在 searchParams 已定义
    params.set('category', key);
    router.push(`/admin/videosys?${params.toString()}`);
  };

  const handleAdd = () => {
    setEditingKey(null);
    setModalOpen(true);
  };

  const handleEdit = (key: string) => {
    setEditingKey(key);
    setModalOpen(true);
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`确定删除分类“${key}”吗？该分类下的视频将失去分类关联。`)) return;
    const res = await fetch(`/api/admin/videosys-categories?locale=${locale}&key=${key}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      loadCategories();
      if (selectedKey === key) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete('category');
        router.push(`/admin/videosys?${params.toString()}`);
      }
    } else {
      const { error } = await res.json();
      setError(error);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSave = async (key: string, category: any) => {
    const res = await fetch('/api/admin/videosys-categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, key, category }),
    });
    if (res.ok) {
      loadCategories();
      setModalOpen(false);
    } else {
      const { error } = await res.json();
      setError(error);
    }
  };

  if (loading) return <div>加载中...</div>;

  return (
    <div>
      <button
        onClick={handleAdd}
        className="w-full mb-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        + 新建分类
      </button>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <ul className="space-y-1">
        {categories.map((cat) => (
          <li
            key={cat.key}
            className={`flex justify-between items-center p-2 rounded cursor-pointer ${
              selectedKey === cat.key ? 'bg-blue-100 text-blue-800' : 'hover:bg-gray-200'
            }`}
          >
            <span onClick={() => handleSelect(cat.key)} className="flex-1">
              {cat.name} ({cat.key})
            </span>
            <div className="space-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit(cat.key);
                }}
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                编辑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(cat.key);
                }}
                className="text-sm text-gray-500 hover:text-red-600"
              >
                删除
              </button>
            </div>
          </li>
        ))}
        {categories.length === 0 && (
          <li className="text-gray-400 text-center py-4">暂无分类，请点击上方按钮创建</li>
        )}
      </ul>

      <CategoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialKey={editingKey}
        initialData={
          editingKey ? categories.find(c => c.key === editingKey) : undefined
        }
        locale={locale}
      />
    </div>
  );
}