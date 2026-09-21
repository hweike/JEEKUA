'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';
import BlogCategoryTree from './BlogCategoryTree';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  author: string;
  updatedAt: string;
}

interface BlogSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (posts: BlogPost[]) => void;
  maxSelection?: number;
  initialSelectedPosts?: BlogPost[];
  locale: string;
}

// 模块级缓存
const postsCache = new Map<string, { items: BlogPost[]; total: number; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

export default function BlogSelectorDialog({
  open,
  onClose,
  onConfirm,
  maxSelection = 20,
  initialSelectedPosts = [],
  locale,
}: BlogSelectorDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMap, setSelectedMap] = useState<Map<string, BlogPost>>(
    () => new Map(initialSelectedPosts.map((p) => [p.id, p]))
  );
  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    setMounted(true);
  }, []);

  // 打开时重置选中
  useEffect(() => {
    if (open) {
      setSelectedMap(new Map(initialSelectedPosts.map((p) => [p.id, p])));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchPosts = useCallback(async () => {
    const cacheKey = `${locale}|${keyword}|${categoryId}|${page}`;
    const cached = postsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setPosts(cached.items);
      setTotal(cached.total);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        locale,
        keyword,
        categoryId,
        page: String(page),
        size: String(pageSize),
      });
      const res = await fetch(`/api/blog/posts/search?${params.toString()}`);
      const data = await res.json();
      const items: BlogPost[] = (data.items || []).map((p: any) => ({
        id: p.id,
        slug: p.slug || '',
        title: p.title || '',
        excerpt: p.excerpt || '',
        featuredImage: p.featuredImage || '',
        categoryId: p.categoryId || '',
        author: p.author || '',
        updatedAt: p.updatedAt || '',
      }));
      setPosts(items);
      setTotal(data.total || 0);
      postsCache.set(cacheKey, { items, total: data.total || 0, timestamp: Date.now() });
    } catch (err) {
      console.error('[BlogSelectorDialog] 加载失败', err);
    } finally {
      setLoading(false);
    }
  }, [locale, keyword, categoryId, page]);

  useEffect(() => {
    if (open) fetchPosts();
  }, [open, fetchPosts]);

  const handleToggle = (post: BlogPost) => {
    const newMap = new Map(selectedMap);
    if (newMap.has(post.id)) {
      newMap.delete(post.id);
    } else {
      if (newMap.size >= maxSelection) {
        alert(`最多只能选择 ${maxSelection} 篇文章`);
        return;
      }
      newMap.set(post.id, post);
    }
    setSelectedMap(newMap);
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedMap.values()));
    onClose();
  };

  const clearSearch = () => {
    setKeyword('');
    setCategoryId('');
    setPage(1);
  };

  if (!mounted || !open) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const dialogContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-xl w-[900px] max-w-[90vw] h-[70vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">选择文章（最多 {maxSelection} 篇）</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded" aria-label="关闭">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 左侧分类树 */}
          <div className="w-1/4 border-r overflow-y-auto p-2">
            <BlogCategoryTree
              locale={locale}
              selectedCategoryId={categoryId}
              onSelect={(catId) => {
                setCategoryId(catId);
                setPage(1);
              }}
            />
          </div>

          {/* 右侧文章列表 */}
          <div className="flex-1 flex flex-col overflow-hidden p-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="输入文章标题搜索"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="border rounded px-2 py-1 flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setPage(1);
                    fetchPosts();
                  }
                }}
              />
              <button
                onClick={() => {
                  setPage(1);
                  fetchPosts();
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
              >
                搜索
              </button>
              {(keyword || categoryId) && (
                <button onClick={clearSearch} className="text-gray-500 text-sm hover:underline">
                  清除
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10 text-gray-400">加载中...</div>
              ) : posts.length === 0 ? (
                <div className="text-center py-10 text-gray-500">暂无文章</div>
              ) : (
                <div className="space-y-2">
                  {posts.map((post) => {
                    const isSelected = selectedMap.has(post.id);
                    return (
                      <label
                        key={post.id}
                        className={`flex items-start gap-3 p-3 border rounded cursor-pointer transition ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggle(post)}
                          className="mt-1 w-4 h-4 flex-shrink-0"
                        />
                        {post.featuredImage ? (
                          <img
                            src={getImageUrl(post.featuredImage)}
                            alt={post.title}
                            className="w-16 h-16 object-cover rounded flex-shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                            无图
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm line-clamp-2">{post.title}</div>
                          {post.excerpt && (
                            <div className="text-xs text-gray-500 line-clamp-1 mt-1">
                              {post.excerpt}
                            </div>
                          )}
                          {post.updatedAt && (
                            <div className="text-xs text-gray-400 mt-1">
                              {post.updatedAt.slice(0, 10)}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center mt-3 text-sm">
                <span>共 {total} 篇</span>
                <div className="flex gap-2 items-center">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-2 py-1 border rounded disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t p-3 flex justify-between items-center">
          <div className="text-sm text-gray-600">已选择 {selectedMap.size} 篇</div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1 border rounded hover:bg-gray-50">
              取消
            </button>
            <button
              onClick={handleConfirm}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}