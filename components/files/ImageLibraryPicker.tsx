'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  Search,
  Folder,
  ChevronDown,
  ChevronRight,
  Check,
  Image,
  Film,
  FileText,
  Loader2,
} from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';

interface FileItem {
  id: string;
  storage_key: string;
  display_name: string;
  mime_type: string;
  size: number;
  url: string;
  referenceCount: number;
  created_at: string;
  alt_text: string | null;
  category_id: string | null;
}

interface CategoryTree {
  id: string;
  name: string;
  children?: CategoryTree[];
}

interface ImageLibraryPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (urls: string[]) => void;
  mode?: 'single' | 'multiple';
  maxSelect?: number;
  initialSelected?: string[];
}

export default function ImageLibraryPicker({
  open,
  onClose,
  onSelect,
  mode = 'single',
  maxSelect = 10,
  initialSelected = [],
}: ImageLibraryPickerProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelected));
  const [selectedUrls, setSelectedUrls] = useState<string[]>(initialSelected);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const pageSize = 30;

  // 加载分类列表
  useEffect(() => {
    if (!open) return;
    fetch('/api/admin/files/categories')
      .then(res => res.json())
      .then(data => {
        const filterUncategorized = (items: any[]): any[] => {
          return items
            .filter(item => item.id !== '00000000-0000-0000-0000-000000000000')
            .map(item => ({
              ...item,
              children: item.children ? filterUncategorized(item.children) : [],
            }));
        };
        const processed = filterUncategorized(data);
        setCategories(processed);
        // 默认展开一级分类
        const firstLevelIds = processed.map((cat: CategoryTree) => cat.id);
        setExpandedCategories(new Set(firstLevelIds));
      })
      .catch(console.error);
  }, [open]);

  // 加载文件列表（只加载图片）
  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/files?page=${page}&size=${pageSize}&mimeType=image`;
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }
      if (searchKeyword) {
        url += `&search=${encodeURIComponent(searchKeyword)}`;
      }
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Fetch failed');
      const data = await res.json();
      setFiles(data.files || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('加载图片失败:', err);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, searchKeyword]);

  useEffect(() => {
    if (open) {
      fetchFiles();
    }
  }, [open, fetchFiles]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, searchKeyword]);

  // 处理选择
  const handleSelect = (file: FileItem) => {
    const id = file.id;
    const url = file.url || getImageUrl(file.storage_key);
    
    if (mode === 'single') {
      setSelectedIds(new Set([id]));
      setSelectedUrls([url]);
      return;
    }

    // 多选模式
    const newSet = new Set(selectedIds);
    const newUrls = [...selectedUrls];
    if (newSet.has(id)) {
      newSet.delete(id);
      const idx = newUrls.indexOf(url);
      if (idx !== -1) newUrls.splice(idx, 1);
    } else {
      if (newSet.size >= maxSelect) {
        alert(`最多只能选择 ${maxSelect} 张图片`);
        return;
      }
      newSet.add(id);
      newUrls.push(url);
    }
    setSelectedIds(newSet);
    setSelectedUrls(newUrls);
    setIsAllSelected(newSet.size === files.length && files.length > 0);
  };

  // 全选
  const handleSelectAll = () => {
    if (mode === 'single') return;
    if (isAllSelected) {
      setSelectedIds(new Set());
      setSelectedUrls([]);
      setIsAllSelected(false);
    } else {
      const imageFiles = files.filter(f => f.mime_type.startsWith('image/'));
      const remaining = maxSelect - selectedIds.size;
      const toSelect = imageFiles.slice(0, remaining);
      const newSet = new Set(selectedIds);
      const newUrls = [...selectedUrls];
      for (const file of toSelect) {
        if (!newSet.has(file.id)) {
          newSet.add(file.id);
          newUrls.push(file.url || getImageUrl(file.storage_key));
        }
      }
      setSelectedIds(newSet);
      setSelectedUrls(newUrls);
      setIsAllSelected(newSet.size === files.length && files.length > 0);
    }
  };

  // 确认选择
  const handleConfirm = () => {
    if (selectedUrls.length === 0) {
      alert('请选择至少一张图片');
      return;
    }
    onSelect(selectedUrls);
    onClose();
  };

  // 清空选择
  const handleClear = () => {
    setSelectedIds(new Set());
    setSelectedUrls([]);
    setIsAllSelected(false);
  };

  // 切换分类展开
  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  // 渲染分类树
  const renderCategoryTree = (nodes: CategoryTree[], depth: number = 0) => {
    return nodes.map(node => {
      const isExpanded = expandedCategories.has(node.id);
      const hasChildren = node.children && node.children.length > 0;
      const isSelected = categoryId === node.id;

      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition ${
              isSelected ? 'bg-blue-50 text-blue-700' : ''
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
            onClick={() => {
              setCategoryId(node.id === categoryId ? null : node.id);
              setPage(1);
            }}
          >
            {hasChildren ? (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
                className="p-0.5 hover:bg-gray-200 rounded"
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <Folder size={14} className="flex-shrink-0" />
            <span className="flex-1 text-sm truncate">{node.name}</span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderCategoryTree(node.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  // 获取分类路径
  const getCategoryPath = (id: string | null): string => {
    if (!id) return '全部图片';
    const findPath = (nodes: CategoryTree[], targetId: string, path: string[] = []): string | null => {
      for (const node of nodes) {
        const newPath = [...path, node.name];
        if (node.id === targetId) return newPath.join(' / ');
        if (node.children) {
          const result = findPath(node.children, targetId, newPath);
          if (result) return result;
        }
      }
      return null;
    };
    return findPath(categories, id) || '全部图片';
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 h-[85vh] flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold">选择图片</h3>
            {mode === 'multiple' && selectedIds.size > 0 && (
              <span className="text-sm text-blue-600 ml-3">已选 {selectedIds.size} 张</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        {/* 主体 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧分类 */}
          <div className="w-56 flex-shrink-0 border-r overflow-y-auto p-2">
            <div
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md cursor-pointer hover:bg-gray-100 transition ${
                !categoryId ? 'bg-blue-50 text-blue-700' : ''
              }`}
              onClick={() => { setCategoryId(null); setPage(1); }}
            >
              <Folder size={14} className="flex-shrink-0" />
              <span className="flex-1 text-sm">全部图片</span>
            </div>
            {renderCategoryTree(categories)}
          </div>

          {/* 右侧图片列表 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 搜索和工具栏 */}
            <div className="p-3 border-b flex-shrink-0 flex flex-wrap gap-2 items-center">
              <div className="flex-1 min-w-[150px] max-w-sm relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setSearchKeyword(searchInput)}
                  placeholder="搜索图片..."
                  className="w-full pl-9 pr-3 py-1.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <span className="text-sm text-gray-500">
                {categoryId ? getCategoryPath(categoryId) : '全部图片'} ({total})
              </span>
              {mode === 'multiple' && files.filter(f => f.mime_type.startsWith('image/')).length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-gray-600 hover:text-blue-600 px-2 py-1"
                >
                  {isAllSelected ? '取消全选' : '全选'}
                </button>
              )}
              {selectedIds.size > 0 && (
                <button
                  onClick={handleClear}
                  className="text-sm text-red-500 hover:text-red-700 px-2 py-1"
                >
                  清空
                </button>
              )}
            </div>

            {/* 图片网格 */}
            <div className="flex-1 overflow-y-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : files.filter(f => f.mime_type.startsWith('image/')).length === 0 ? (
                <div className="text-center py-12 text-gray-400">暂无图片</div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {files.filter(f => f.mime_type.startsWith('image/')).map((file) => {
                    const isSelected = selectedIds.has(file.id);
                    const imageUrl = file.url || getImageUrl(file.storage_key);
                    return (
                      <div
                        key={file.id}
                        className={`border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all ${
                          isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-300'
                        }`}
                        onClick={() => handleSelect(file)}
                      >
                        <div className="aspect-square bg-gray-100 relative">
                          <img
                            src={imageUrl}
                            alt={file.alt_text || file.display_name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          {isSelected && (
                            <div className="absolute top-1 right-1 bg-blue-500 rounded-full p-0.5">
                              <Check size={14} className="text-white" />
                            </div>
                          )}
                          {mode === 'multiple' && (
                            <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                              {file.referenceCount || 0}
                            </div>
                          )}
                        </div>
                        <div className="p-1.5 truncate text-xs text-gray-600" title={file.display_name}>
                          {file.display_name}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 分页 */}
            {total > pageSize && (
              <div className="flex justify-between items-center p-3 border-t flex-shrink-0">
                <div className="text-sm text-gray-500">共 {total} 张</div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    {page} / {Math.ceil(total / pageSize)}
                  </span>
                  <button
                    disabled={page * pageSize >= total}
                    onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 text-sm"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-between items-center p-4 border-t flex-shrink-0 bg-gray-50 rounded-b-lg">
          <div className="text-sm text-gray-500">
            {mode === 'single' ? '点击选择一张图片' : `已选 ${selectedIds.size} 张${maxSelect ? `（最多 ${maxSelect} 张）` : ''}`}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              确认选择
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}