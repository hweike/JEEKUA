// app/admin/discovery/search/page.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Package,
  FileText,
  Newspaper,
  BookOpen,
  Video,
} from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';

interface Language {
  code: string;
  name: string;
}

const TYPE_META: Record<
  string,
  { label: string; Icon: any; color: string; bg: string }
> = {
  product:  { label: '产品', Icon: Package,   color: '#2563eb', bg: '#eff6ff' },
  page:     { label: '页面', Icon: FileText,  color: '#16a34a', bg: '#f0fdf4' },
  blogPost: { label: '博客', Icon: Newspaper, color: '#ea580c', bg: '#fff7ed' },
  doc:      { label: '文档', Icon: BookOpen,  color: '#7c3aed', bg: '#f5f3ff' },
  video:    { label: '视频', Icon: Video,     color: '#dc2626', bg: '#fef2f2' },
};

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export default function SearchAdminPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [locale, setLocale] = useState('zh');
  const [query, setQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');   // 已提交的搜索词（翻页时保留）
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // ✅ 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // 获取语言列表
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const langs = data.map((lang: any) => ({
          code: lang.code,
          name: lang.zhName,
        }));
        setLanguages(langs);
        if (langs.length > 0 && !langs.find((l: Language) => l.code === locale)) {
          setLocale(langs[0].code);
        }
      })
      .catch(console.error);
  }, []);

  // ✅ 统一的搜索函数，支持指定关键词和页码
  const doSearch = async (term: string, pageNum: number, searchLocale: string) => {
    if (!term.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/discovery/search?q=${encodeURIComponent(term)}&locale=${searchLocale}&page=${pageNum}`
      );
      const data = await res.json();

      // 兼容两种返回：数组 或 { results, total, totalPages }
      const list = Array.isArray(data) ? data : data.results || [];
      const total = Array.isArray(data) ? list.length : data.total || list.length;
      const pages = Array.isArray(data) ? 1 : data.totalPages || 1;

      const mapped = list.map((item: any) => ({
        id: item.id,
        title: item.title,
        url: item.url,
        type: item.type || 'page',
        content_summary: item.content_summary || item.content || '',
        cover_image: item.cover_image || '',
        updatedAt: item.updatedAt,
      }));

      setResults(mapped);
      setTotalResults(total);
      setTotalPages(pages);
      setCurrentPage(pageNum);
      setSubmittedQuery(term);
      setSearched(true);
    } catch (error) {
      console.error(error);
      alert('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  // 点搜索按钮 / 回车：重置到第 1 页
  const handleSearch = () => doSearch(query, 1, locale);

  // 翻页：用已提交的搜索词和当前语言
  const handlePageChange = (p: number) => {
    if (p < 1 || p > totalPages) return;
    doSearch(submittedQuery, p, locale);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  // ---- 生成页码列表：当前页 ±2，首尾页始终显示 ----
  const buildPageList = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);
    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('...');
    }
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">全站搜索测试</h1>

      {/* 搜索栏 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-32"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词..."
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      {/* ✅ 结果计数 */}
      {!loading && searched && totalResults > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          找到 {totalResults} 个与 "{submittedQuery}" 相关的结果
        </p>
      )}

      {loading && <div className="text-center py-8">加载中...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">未找到相关结果</div>
      )}

      {/* 结果列表 */}
      {!loading && results.length > 0 && (
        <>
          <div className="space-y-6">
            {results.map((item) => {
              const summary = stripHtml(item.content_summary || '');
              const imgSrc = item.cover_image ? getImageUrl(item.cover_image) : '';
              const dateStr = formatDate(item.updatedAt);
              const meta = TYPE_META[item.type] || TYPE_META.page;
              const Icon = meta?.Icon;

              const href = item.url?.startsWith('http')
                ? item.url
                : item.url || '#';

              return (
                <div
                  key={item.id}
                  className="group transition-all duration-200"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                  }}
                >
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <div className="flex items-start gap-4">
                      {imgSrc && (
                        <img
                          src={imgSrc}
                          alt={item.title}
                          className="w-24 h-24 object-cover flex-shrink-0 rounded"
                          loading="lazy"
                        />
                      )}

                      <div className="flex-1 min-w-0">
                        {meta && Icon && (
                          <span
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1"
                            style={{ color: meta.color, backgroundColor: meta.bg }}
                          >
                            <Icon size={12} />
                            {meta.label}
                          </span>
                        )}

                        <h3 className="text-lg font-semibold line-clamp-2 text-slate-900">
                          {item.title}
                        </h3>

                        {summary && (
                          <p className="text-sm mt-1 line-clamp-2 text-slate-700">
                            {summary}
                          </p>
                        )}

                        {dateStr && (
                          <p className="text-xs mt-2 text-slate-500">{dateStr}</p>
                        )}
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>

          {/* ============================================================
              ✅ 分页 UI
          ============================================================ */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
              {/* 上一页 */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 h-9 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                上一页
              </button>

              {/* 页码 */}
              {buildPageList().map((p, idx) =>
                p === '...' ? (
                  <span key={`e-${idx}`} className="px-2 text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 h-9 rounded border text-sm ${
                      p === currentPage
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}

              {/* 下一页 */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 h-9 rounded border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}