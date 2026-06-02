// app/admin/pages/page.tsx
'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Copy, FileText, FileWarning, Plus, Pencil, Trash2, Search } from 'lucide-react';
import LanguageSelector from '@/components/common/LanguageSelector';
import Toast from '@/components/Toast';  // 导入 Toast 组件

interface PageItem {
  id: string;
  title: string;
  slug: string;
  visible: string;
  updatedAt: string;
  type: 'home' | 'policy' | 'custom';
  preset: boolean;
}

export default function PagesAdmin() {
  const [locale, setLocale] = useState('zh');
  const [pages, setPages] = useState<PageItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pages' | 'policies'>('pages');
  const [currentPage, setCurrentPage] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const pageSize = 20;

  // 检查是否有从编辑页传来的提示信息
  useEffect(() => {
    const toastData = sessionStorage.getItem('pageSaveToast');
    if (toastData) {
      try {
        const { message, type } = JSON.parse(toastData);
        setToast({ message, type });
        sessionStorage.removeItem('pageSaveToast');
      } catch (e) {
        console.error('Failed to parse toast data', e);
      }
    }
  }, []);

  const fetchPages = useCallback(async (lang: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pages?locale=${lang}`);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setPages(data.pages || []);
    } catch (err) {
      console.error(err);
      setError('加载页面失败，请刷新重试');
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPages(locale);
    setSearchTerm('');
    setActiveTab('pages');
    setCurrentPage(1);
  }, [locale, fetchPages]);

  // 搜索过滤
  const filteredBySearch = useMemo(() => {
    if (!searchTerm.trim()) return pages;
    const term = searchTerm.toLowerCase();
    return pages.filter(page =>
      page.title.toLowerCase().includes(term) ||
      page.slug.toLowerCase().includes(term)
    );
  }, [pages, searchTerm]);

  // 标签页过滤
  const tabFilteredPages = useMemo(() => {
    if (activeTab === 'pages') {
      return filteredBySearch.filter(page => page.type === 'custom' || page.type === 'home');
    } else {
      return filteredBySearch.filter(page => page.type === 'policy');
    }
  }, [filteredBySearch, activeTab]);

  const totalPages = Math.ceil(tabFilteredPages.length / pageSize);
  const safeCurrentPage = Math.min(currentPage, totalPages || 1);
  const paginatedPages = tabFilteredPages.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此页面吗？')) return;
    try {
      const res = await fetch(`/api/admin/pages/${id}?locale=${locale}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      await fetchPages(locale);
      const newTotalPages = Math.ceil((tabFilteredPages.length - 1) / pageSize);
      if (safeCurrentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (tabFilteredPages.length === 1) {
        setCurrentPage(1);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleTabChange = (tab: 'pages' | 'policies') => {
    setActiveTab(tab);
    setSearchTerm('');
    setCurrentPage(1);
  };

  const canAdd = locale === 'zh' || locale === 'en';

  if (loading) return <div className="p-8 text-center text-gray-500">加载中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Toast 显示 */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* 顶部区域 - 保持不变 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">页面管理</h1>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="搜索标题/URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <LanguageSelector currentLocale={locale} onLocaleChange={setLocale} displayMode="zh" />
          {canAdd ? (
            <Link href={`/admin/pages/new?locale=${locale}`} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition">
              <Plus size={18} /> 添加页面
            </Link>
          ) : (
            <button disabled className="bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 cursor-not-allowed">
              <Plus size={18} /> 添加页面（不可用）
            </button>
          )}
        </div>
      </div>

      {/* 标签页切换 */}
      <div className="flex border-b mb-6">
        <button
          onClick={() => handleTabChange('pages')}
          className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
            activeTab === 'pages'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileText size={16} />
          页面
        </button>
        <button
          onClick={() => handleTabChange('policies')}
          className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${
            activeTab === 'policies'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <FileWarning size={16} />
          网站政策
        </button>
      </div>

      {/* 表格 - 保持不变 */}
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">页面标题</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL名称</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">可见性</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后更新</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {paginatedPages.map((page) => (
              <tr key={page.id} className="hover:bg-gray-50 group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${locale}/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {page.title}
                    </Link>
                    {page.preset && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        预设
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  /{page.slug}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    page.visible === 'visible' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {page.visible === 'visible' ? '可见' : '隐藏'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(page.updatedAt).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/pages/${page.id}/edit?locale=${locale}`}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="编辑"
                    >
                      <Pencil size={18} />
                    </Link>
                    <button
                      onClick={() => {/* 单个同步功能，可选 */}}
                      className="text-green-600 hover:text-green-700"
                      title="同步复制"
                    >
                      <Copy size={18} />
                    </button>
                    {!page.preset && (
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="text-red-600 hover:text-red-900"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {paginatedPages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                  暂无{activeTab === 'pages' ? '页面' : '政策'}数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-6">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            上一页
          </button>
          <span className="text-sm text-gray-600">
            第 {safeCurrentPage} / {totalPages} 页
          </span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50 hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}