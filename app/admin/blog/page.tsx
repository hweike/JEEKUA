'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import { useToast } from '@/contexts/ToastContext';

interface Post {
  id: string;
  title: string;
  category_id: string;
  category_name: string;
  updated_at: string;
  visibility: string;
  slug: string;
}

interface Category {
  id: string;
  title: string;
}

export default function BlogList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  // 多语言
  const [locale, setLocale] = useState(searchParams.get('locale') || 'zh');
  // 分页
  const currentPage = parseInt(searchParams.get('page') || '1');
  const limit = 10;
  // 数据
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  // 筛选条件
  const [searchTitle, setSearchTitle] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const res = await fetch(`/api/admin/blog/categories?locale=${locale}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCategories(data);
    } catch (err) {
      showToast('加载分类失败', 'error');
    }
  };

  // 加载文章列表
  const loadPosts = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      locale,
      page: currentPage.toString(),
      limit: limit.toString(),
    });
    if (searchTitle) params.append('search', searchTitle);
    if (selectedCategory) params.append('category', selectedCategory);

    try {
      const res = await fetch(`/api/admin/blog?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPosts(data.data);
      setTotal(data.total);
    } catch (err) {
      showToast('加载文章失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载分类和文章
  useEffect(() => {
    loadCategories();
  }, [locale]);

  useEffect(() => {
    loadPosts();
  }, [locale, currentPage, searchTitle, selectedCategory]);

  // 删除文章
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`确定删除文章“${title}”吗？相关 Markdown 文件也将被删除。`)) return;
    try {
      const res = await fetch(`/api/admin/blog?locale=${locale}&id=${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      showToast('删除成功', 'success');
      await loadPosts(); // 刷新列表
    } catch (err) {
      showToast('删除失败', 'error');
    }
  };

  // 切换语言
  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale);
    // 重置筛选和分页
    setSearchTitle('');
    setSelectedCategory('');
    router.push(`/admin/blog?locale=${newLocale}`);
  };

  // 搜索提交
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // 为了保持当前页不变，直接让 useEffect 触发即可（searchTitle 已变化）
    // 但为了用户体验，可以重置到第一页（可选）
    // 这里简单调用 loadPosts（其实 useEffect 会调用，但可手动触发）
    loadPosts();
  };

  // 分页跳转
  const totalPages = Math.ceil(total / limit);
  const setCurrentPage = (page: number) => {
    router.push(`/admin/blog?locale=${locale}&page=${page}`);
  };

  if (loading && posts.length === 0) {
    return <div className="p-6 text-center">加载中...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 头部：标题 + 多语言选择 + 新建按钮 */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">博客文章管理</h1>
        <div className="flex items-center gap-4">
          <LanguageSelector
            currentLocale={locale}
            onLocaleChange={handleLocaleChange}
            displayMode="zh"
          />
          <Link
            href={`/admin/blog/edit?locale=${locale}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={18} /> 新建文章
          </Link>
        </div>
      </div>

      {/* 搜索栏：搜索框 + 分类下拉 + 搜索按钮 在同一行 */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="按标题搜索..."
          value={searchTitle}
          onChange={(e) => setSearchTitle(e.target.value)}
          className="border rounded-lg px-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">全部分类</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg flex items-center gap-1 transition"
        >
          <Search size={16} /> 搜索
        </button>
      </form>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">分类</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">更新时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">可见性</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {posts.map((post) => (
              <tr key={post.id}>
                <td className="px-6 py-4 text-sm">{post.title}</td>
                <td className="px-6 py-4 text-sm">{post.category_name || '-'}</td>
                <td className="px-6 py-4 text-sm">
                  {new Date(post.updated_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm">
                  {post.visibility === 'visible' ? '可见' : '隐藏'}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <Link
                    href={`/admin/blog/edit?locale=${locale}&id=${post.id}`}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    <Pencil size={16} className="inline" /> 编辑
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id, post.title)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} className="inline" /> 删除
                  </button>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                  暂无文章，点击“新建文章”创建
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            上一页
          </button>
          <span className="px-3 py-1">
            第 {currentPage} / {totalPages} 页
          </span>
          <button
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}