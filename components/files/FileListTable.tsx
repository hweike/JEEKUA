'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Trash2,
  ExternalLink,
  Image,
  FileText,
  Film,
  Edit2,
  Check,
  X,
  Copy,
  Folder,
  Search,
  RefreshCw,
  MoreVertical,
  ChevronRight,
  ChevronDown,
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

interface FileListTableProps {
  onRefresh: () => void;
  categoryId?: string | null;
}

interface CategoryTree {
  id: string;
  name: string;
  children?: CategoryTree[];
}

export default function FileListTable({ onRefresh, categoryId }: FileListTableProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [referenceFilter, setReferenceFilter] = useState<'all' | 'referenced' | 'unreferenced'>('all');
  
  // ✅ 选择状态
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'rename' | 'alt' | 'move' | 'batchMove' | 'batchDelete'>('rename');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  const pageSize = 30;

  // 加载分类列表
  useEffect(() => {
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
        setCategories(filterUncategorized(data));
      })
      .catch(console.error);
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/admin/files?page=${page}&size=${pageSize}`;
      if (categoryId) {
        url += `&categoryId=${categoryId}`;
      }
      if (searchKeyword) {
        url += `&search=${encodeURIComponent(searchKeyword)}`;
      }
      if (referenceFilter === 'referenced') {
        url += `&referenced=true`;
      } else if (referenceFilter === 'unreferenced') {
        url += `&referenced=false`;
      }
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Fetch failed: ${res.status}`);
      }
      const data = await res.json();
      setFiles(data.files || []);
      setTotal(data.total || 0);
      // ✅ 清空选择
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setFiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, categoryId, searchKeyword, referenceFilter]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    setPage(1);
  }, [categoryId, searchKeyword, referenceFilter]);

  // ✅ 全选/取消全选
  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
      setIsAllSelected(false);
    } else {
      const allIds = files.map(f => f.id);
      setSelectedIds(new Set(allIds));
      setIsAllSelected(true);
    }
  };

  // ✅ 单个选择
  const handleSelectOne = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
    setIsAllSelected(newSet.size === files.length && files.length > 0);
  };

  // ✅ 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个文件吗？`)) return;
    
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }
    
    alert(`删除完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    setSelectedIds(new Set());
    setIsAllSelected(false);
    fetchFiles();
    onRefresh();
  };

  // ✅ 批量调整分类
  const handleBatchMove = async () => {
    if (selectedIds.size === 0) return;
    if (!selectedCategoryId) {
      alert('请选择目标分类');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/admin/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categoryId: selectedCategoryId }),
        });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }
    
    alert(`移动完成：成功 ${successCount} 个，失败 ${failCount} 个`);
    setSelectedIds(new Set());
    setIsAllSelected(false);
    setModalOpen(false);
    fetchFiles();
    onRefresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchKeyword(searchInput);
    setPage(1);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此文件吗？')) return;
    try {
      const res = await fetch(`/api/admin/files/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFiles();
        onRefresh();
      } else {
        const err = await res.json();
        alert(err.error || '删除失败');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openModal = (type: 'rename' | 'alt' | 'move' | 'batchMove' | 'batchDelete', file?: FileItem) => {
    if (file) setSelectedFile(file);
    setModalType(type);
    setModalOpen(true);
    
    if (type === 'rename' && file) {
      const nameWithoutExt = file.display_name.replace(/\.[^.]+$/, '');
      setTempValue(nameWithoutExt);
    } else if (type === 'alt' && file) {
      setTempValue(file.alt_text || '');
    } else if (type === 'move' && file) {
      setSelectedCategoryId(file.category_id || '');
    } else if (type === 'batchMove') {
      setSelectedCategoryId('');
    }
    setOpenDropdownId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedFile(null);
    setTempValue('');
    setSelectedCategoryId('');
  };

  const handleRename = async () => {
    if (!selectedFile || !tempValue.trim()) {
      alert('请输入文件名');
      return;
    }
    try {
      const ext = selectedFile.display_name.includes('.') 
        ? selectedFile.display_name.substring(selectedFile.display_name.lastIndexOf('.'))
        : '';
      const newName = tempValue.trim() + ext;
      
      const res = await fetch(`/api/admin/files/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: newName }),
      });
      if (!res.ok) throw new Error('保存失败');
      setFiles(prev =>
        prev.map(f => (f.id === selectedFile.id ? { ...f, display_name: newName } : f))
      );
      closeModal();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveAlt = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(`/api/admin/files/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altText: tempValue }),
      });
      if (!res.ok) throw new Error('保存失败');
      setFiles(prev =>
        prev.map(f => (f.id === selectedFile.id ? { ...f, alt_text: tempValue } : f))
      );
      closeModal();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleMoveCategory = async () => {
    if (!selectedFile) return;
    try {
      const res = await fetch(`/api/admin/files/${selectedFile.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categoryId: selectedCategoryId || null }),
      });
      if (!res.ok) throw new Error('移动失败');
      fetchFiles();
      onRefresh();
      closeModal();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('链接已复制到剪贴板');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId) {
        const ref = dropdownRefs.current[openDropdownId];
        if (ref && !ref.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  const getIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <Image size={20} />;
    if (mime.startsWith('video/')) return <Film size={20} />;
    if (mime === 'application/pdf') return <FileText size={20} className="text-red-500" />;
    if (mime.includes('sheet') || mime.includes('excel') || mime.includes('spreadsheet')) {
      return <FileText size={20} className="text-green-600" />;
    }
    if (mime.includes('document') || mime.includes('word') || mime.includes('text')) {
      return <FileText size={20} className="text-blue-500" />;
    }
    return <FileText size={20} className="text-gray-400" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderCategoryTree = (nodes: CategoryTree[], depth: number = 0): JSX.Element[] => {
    const result: JSX.Element[] = [];
    nodes.forEach(node => {
      const indent = '　'.repeat(depth);
      const prefix = depth > 0 ? '├─ ' : '';
      result.push(
        <option key={node.id} value={node.id}>
          {indent}{prefix}{node.name}
        </option>
      );
      if (node.children && node.children.length > 0) {
        result.push(...renderCategoryTree(node.children, depth + 1));
      }
    });
    return result;
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-4">
      {/* 搜索和过滤栏 */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="搜索文件名..."
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </form>

        <select
          value={referenceFilter}
          onChange={(e) => setReferenceFilter(e.target.value as any)}
          className="px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">所有引用状态</option>
          <option value="referenced">已引用</option>
          <option value="unreferenced">未引用</option>
        </select>

        {/* 批量操作按钮 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700">已选 {selectedIds.size} 项</span>
            <button
              onClick={() => openModal('batchMove')}
              className="text-sm text-blue-600 hover:text-blue-800 px-2 py-0.5 hover:bg-blue-100 rounded"
            >
              <Folder size={14} className="inline mr-1" />
              调整分类
            </button>
            <button
              onClick={handleBatchDelete}
              className="text-sm text-red-600 hover:text-red-800 px-2 py-0.5 hover:bg-red-100 rounded"
            >
              <Trash2 size={14} className="inline mr-1" />
              删除
            </button>
            <button
              onClick={() => { setSelectedIds(new Set()); setIsAllSelected(false); }}
              className="text-sm text-gray-500 hover:text-gray-700 px-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* 统计信息 */}
      <div className="text-sm text-gray-500 mb-3 flex items-center gap-4">
        <span>共 {total} 个文件</span>
        <label className="flex items-center gap-1 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={isAllSelected && files.length > 0}
            onChange={handleSelectAll}
            className="w-3.5 h-3.5"
          />
          全选
        </label>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-gray-400 border rounded-lg bg-gray-50">
          暂无文件
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {files.map((file) => {
            const isSelected = selectedIds.has(file.id);
            return (
              <div
                key={file.id}
                className={`border rounded-lg overflow-hidden bg-white hover:shadow-lg transition-shadow group relative ${
                  isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
                }`}
              >
                {/* 预览图 */}
                <div className="aspect-square bg-gray-100 relative">
                  {file.mime_type.startsWith('image/') ? (
                    <img
                      src={getImageUrl(file.url)}
                      alt={file.alt_text || file.display_name}
                      title={file.alt_text || file.display_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : file.mime_type === 'application/pdf' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                      <FileText size={48} className="text-red-500" />
                      <span className="text-xs text-gray-500 mt-1">PDF</span>
                    </div>
                  ) : file.mime_type.startsWith('video/') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                      <Film size={48} className="text-blue-500" />
                      <span className="text-xs text-gray-500 mt-1">视频</span>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
                      <FileText size={48} className="text-gray-400" />
                      <span className="text-xs text-gray-500 mt-1">文件</span>
                    </div>
                  )}
                  
                  {/* ✅ 选择框 - 悬浮显示在右上角 */}
                  <div 
                    className={`absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                      isSelected ? 'opacity-100' : ''
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectOne(file.id, e as any);
                      }}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </div>
                  
                  {file.referenceCount > 0 && (
                    <span className="absolute bottom-1 right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {file.referenceCount}
                    </span>
                  )}
                </div>

                {/* 信息区 */}
                <div className="p-2">
                  <p className="text-xs font-medium truncate" title={file.display_name}>
                    {file.display_name}
                  </p>
                  <p className="text-xs text-gray-400">{formatSize(file.size)}</p>
                </div>

                {/* 操作按钮 */}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div 
                    className="relative"
                    ref={(el) => {
                      if (el) dropdownRefs.current[file.id] = el;
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === file.id ? null : file.id);
                      }}
                      className="p-1.5 bg-white/90 rounded hover:bg-white shadow"
                    >
                      <MoreVertical size={14} />
                    </button>
                    {openDropdownId === file.id && (
                      <div className="absolute left-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[150px] text-xs">
                        <button
                          onClick={() => openModal('rename', file)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit2 size={12} /> 重命名
                        </button>
                        <button
                          onClick={() => openModal('alt', file)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Edit2 size={12} /> 替代文本
                        </button>
                        <button
                          onClick={() => openModal('move', file)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Folder size={12} /> 调整分类
                        </button>
                        <button
                          onClick={() => {
                            copyToClipboard(getImageUrl(file.url));
                            setOpenDropdownId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <Copy size={12} /> 复制链接
                        </button>
                        <button
                          onClick={() => {
                            window.open(getImageUrl(file.url), '_blank');
                            setOpenDropdownId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2"
                        >
                          <ExternalLink size={12} /> 新窗口打开
                        </button>
                        <div className="border-t my-1" />
                        <button
                          onClick={() => {
                            handleDelete(file.id);
                            setOpenDropdownId(null);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
                        >
                          <Trash2 size={12} /> 删除
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total > pageSize && (
        <div className="flex justify-between items-center mt-4 px-2">
          <div className="text-sm text-gray-500">共 {total} 个文件</div>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              上一页
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              {page} / {Math.ceil(total / pageSize)}
            </span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50"
            >
              下一页
            </button>
          </div>
        </div>
      )}

      {/* ========== 模态框 ========== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {modalType === 'rename' && '重命名文件'}
                {modalType === 'alt' && '编辑替代文本'}
                {modalType === 'move' && '调整分类'}
                {modalType === 'batchMove' && `批量调整分类（${selectedIds.size} 个文件）`}
                {modalType === 'batchDelete' && `批量删除（${selectedIds.size} 个文件）`}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              {modalType === 'rename' && selectedFile && (
                <>
                  <div className="text-sm text-gray-500">
                    当前文件：<span className="font-medium text-gray-700">{selectedFile.display_name}</span>
                  </div>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入新文件名（不含扩展名）"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                  />
                  <p className="text-xs text-gray-400">扩展名将自动保留</p>
                </>
              )}

              {modalType === 'alt' && selectedFile && (
                <>
                  <div className="text-sm text-gray-500">
                    当前替代文本：<span className="font-medium text-gray-700">{selectedFile.alt_text || '（未设置）'}</span>
                  </div>
                  <input
                    type="text"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="请输入替代文本"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAlt()}
                  />
                  <p className="text-xs text-gray-400">替代文本用于无障碍访问和 SEO</p>
                </>
              )}

              {(modalType === 'move' || modalType === 'batchMove') && (
                <>
                  {modalType === 'move' && selectedFile && (
                    <div className="text-sm text-gray-500">
                      当前分类：<span className="font-medium text-gray-700">
                        {(() => {
                          const findCategory = (items: CategoryTree[]): string => {
                            for (const item of items) {
                              if (item.id === selectedFile.category_id) return item.name;
                              if (item.children) {
                                const found = findCategory(item.children);
                                if (found) return found;
                              }
                            }
                            return '无分类';
                          };
                          return findCategory(categories);
                        })()}
                      </span>
                    </div>
                  )}
                  {modalType === 'batchMove' && (
                    <div className="text-sm text-gray-500">
                      将 <span className="font-medium text-blue-600">{selectedIds.size}</span> 个文件移动到：
                    </div>
                  )}
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">无分类</option>
                    {renderCategoryTree(categories)}
                  </select>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (modalType === 'rename') handleRename();
                  else if (modalType === 'alt') handleSaveAlt();
                  else if (modalType === 'move') handleMoveCategory();
                  else if (modalType === 'batchMove') handleBatchMove();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}