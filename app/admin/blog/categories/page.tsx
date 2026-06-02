'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Trash2, Plus } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';

interface Category {
  id: string;
  title: string;
  comment_status: 'disabled' | 'moderate' | 'allowed';
  template: string;
  slug: string;
  seo_keywords: string;
  seo_title: string;
  seo_description: string;
  updated_at: string;
  created_at: string;
}

export default function CategoriesList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // 从 URL 获取初始语言
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/blog/categories?locale=${locale}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      setError('加载失败');
      showToast('加载分类失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [locale]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除分类“${title}”吗？相关文章将失去分类。`)) return;
    try {
      const res = await fetch(`/api/admin/blog/categories?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCategories(prev => prev.filter(c => c.id !== id));
        showToast('删除成功', 'success');
      } else {
        const data = await res.json();
        showToast(data.error || '删除失败', 'error');
      }
    } catch (err) {
      showToast('网络错误', 'error');
    }
  };

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    router.push(`/admin/blog/categories?locale=${newLocale}`);
  };

  const getCommentStatusText = (status: string) => {
    switch (status) {
      case 'disabled': return '已禁用';
      case 'moderate': return '允许,但待审核';
      case 'allowed': return '允许';
      default: return status;
    }
  };

  if (loading) return <div className="p-6">加载中...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">博客分类管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          <Link
            href={`/admin/blog/categories/edit?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> 新建分类
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">评论</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td className="px-6 py-4 text-sm">{cat.title}</td>
                <td className="px-6 py-4 text-sm">{getCommentStatusText(cat.comment_status)}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(cat.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Link
                    href={`/admin/blog/categories/edit?locale=${locale}&id=${cat.id}`}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    <Pencil className="w-4 h-4 inline" /> 编辑
                  </Link>
                  <button onClick={() => handleDelete(cat.id, cat.title)} className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4 inline" /> 删除
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  暂无分类，请点击“新建分类”创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}