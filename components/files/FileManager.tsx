'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Folder,
  FolderPlus,
  Edit2,
  Trash2,
  X,
  FilePlus,
  Link as LinkIcon,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Inbox,
} from 'lucide-react';
import LocalFileUploader from './LocalFileUploader';
import UrlFileUploader from './UrlFileUploader';
import FileListTable from './FileListTable';

interface FileCategory {
  id: string;
  name: string;
  parent_id: string | null;
  parentId: string | null;
  order: number;
  createdAt: string;
  children?: FileCategory[];
  isSystem?: boolean;
  slug?: string;
}

const SPECIAL_CATEGORIES = {
  ALL: 'all',
};

export default function FileManager() {
  const [categories, setCategories] = useState<FileCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(SPECIAL_CATEGORIES.ALL);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showLocalUploader, setShowLocalUploader] = useState(false);
  const [showUrlUploader, setShowUrlUploader] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FileCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', parentId: '' });
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const getUncategorizedId = useCallback((): string | null => {
    const uncategorized = categories.find(
      cat => cat.slug === 'uncategorized' || cat.name === '未分类'
    );
    return uncategorized?.id || null;
  }, [categories]);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/files/categories');
      if (!res.ok) {
        throw new Error(`加载分类失败 (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCategories(data);
      setSelectedCategoryId(SPECIAL_CATEGORIES.ALL);
      
      const firstLevelIds = data
        .filter((cat: FileCategory) => !cat.parent_id && !cat.parentId)
        .map((cat: FileCategory) => cat.id);
      setExpandedCategories(new Set(firstLevelIds));
    } catch (err) {
      console.error('加载分类失败:', err);
      alert(err instanceof Error ? err.message : '加载分类失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleCreateCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('请输入分类名称');
      return;
    }
    try {
      const res = await fetch('/api/admin/files/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          parentId: categoryForm.parentId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建失败');
      }
      const newCategory = await res.json();
      await fetchCategories();
      if (newCategory.parentId) {
        setExpandedCategories(prev => new Set(prev).add(newCategory.parentId));
      }
      setShowCategoryModal(false);
      setCategoryForm({ name: '', parentId: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory) return;
    if (!categoryForm.name.trim()) {
      alert('请输入分类名称');
      return;
    }
    if (editingCategory.isSystem) {
      alert('系统分类不能修改');
      return;
    }
    try {
      const res = await fetch(`/api/admin/files/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          parentId: categoryForm.parentId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '更新失败');
      }
      await fetchCategories();
      setShowCategoryModal(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', parentId: '' });
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category?.isSystem) {
      alert('系统分类不能删除');
      return;
    }
    if (!confirm('确定要删除此分类吗？其子分类将被保留并提升为顶级分类。')) return;
    try {
      const res = await fetch(`/api/admin/files/categories/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '删除失败');
      }
      await fetchCategories();
      if (selectedCategoryId === id) {
        setSelectedCategoryId(SPECIAL_CATEGORIES.ALL);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openCreateModal = (parentId?: string) => {
    setEditingCategory(null);
    setCategoryForm({ name: '', parentId: parentId || '' });
    setShowCategoryModal(true);
  };

  const openEditModal = (category: FileCategory) => {
    if (category.isSystem) {
      alert('系统分类不能编辑');
      return;
    }
    setEditingCategory(category);
    setCategoryForm({ name: category.name, parentId: category.parent_id || category.parentId || '' });
    setShowCategoryModal(true);
  };

  const toggleExpand = (id: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const renderCategoryTree = () => {
    const isAllSelected = selectedCategoryId === SPECIAL_CATEGORIES.ALL;
    const uncategorizedId = getUncategorizedId();
    
    const tree = categories.filter(cat => cat.slug !== 'uncategorized' && cat.name !== '未分类');
    
    return (
      <div className="space-y-0.5">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition ${
            isAllSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          onClick={() => {
            console.log('点击全部文件');
            setSelectedCategoryId(SPECIAL_CATEGORIES.ALL);
            setRefreshKey(prev => prev + 1);
          }}
        >
          <LayoutGrid size={16} className="flex-shrink-0" />
          <span className="flex-1 text-sm font-medium">全部文件</span>
        </div>

        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition ${
            !isAllSelected && uncategorizedId && selectedCategoryId === uncategorizedId ? 'bg-blue-50 text-blue-700' : ''
          }`}
          onClick={() => {
            if (uncategorizedId) {
              console.log('点击未分类，ID:', uncategorizedId);
              setSelectedCategoryId(uncategorizedId);
              setRefreshKey(prev => prev + 1);
            }
          }}
        >
          <Inbox size={16} className="flex-shrink-0" />
          <span className="flex-1 text-sm">未分类</span>
          <span className="text-xs text-gray-400">系统</span>
        </div>

        {tree.map(node => renderTreeNode(node, 0))}
      </div>
    );
  };

  const renderTreeNode = (node: FileCategory, depth: number) => {
    const isExpanded = expandedCategories.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedCategoryId === node.id;
    const paddingLeft = 12 + depth * 20;
    const canAdd = depth === 0;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-3 py-2 rounded-md cursor-pointer hover:bg-gray-100 transition group ${
            isSelected ? 'bg-blue-50 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => {
            console.log('点击分类:', node.name, 'ID:', node.id);
            setSelectedCategoryId(node.id);
            setRefreshKey(prev => prev + 1);
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }}
              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}
          <Folder size={16} className="flex-shrink-0" />
          <span className="flex-1 text-sm truncate">{node.name}</span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openEditModal(node); }}
              className="p-1 hover:bg-gray-200 rounded"
              title="编辑"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleDeleteCategory(node.id); }}
              className="p-1 hover:bg-red-100 rounded text-red-500"
              title="删除"
            >
              <Trash2 size={12} />
            </button>
            {canAdd && (
              <button
                onClick={(e) => { e.stopPropagation(); openCreateModal(node.id); }}
                className="p-1 hover:bg-gray-200 rounded text-green-500"
                title="添加子分类"
              >
                <FolderPlus size={12} />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>{node.children!.map(child => renderTreeNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const getCategoryPath = (id: string | null): string => {
    if (!id || id === SPECIAL_CATEGORIES.ALL) return '全部文件';
    const uncategorizedId = getUncategorizedId();
    if (id === uncategorizedId) return '未分类';
    
    const findPath = (nodes: FileCategory[], targetId: string, path: string[] = []): string | null => {
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
    const tree = categories.filter(cat => cat.slug !== 'uncategorized' && cat.name !== '未分类');
    return findPath(tree, id) || '全部文件';
  };

  const getEffectiveCategoryId = (): string | null => {
    if (selectedCategoryId === SPECIAL_CATEGORIES.ALL) return null;
    console.log('有效分类ID:', selectedCategoryId);
    return selectedCategoryId;
  };

  const refresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchCategories();
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-6 p-6">
      <div className="w-64 flex-shrink-0 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-3 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">文件分类</h2>
          <button
            onClick={() => openCreateModal()}
            className="p-1 hover:bg-gray-100 rounded text-blue-600"
            title="新建一级分类"
          >
            <FolderPlus size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center text-gray-500 text-sm py-4">加载中...</div>
          ) : categories.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8">
              <Folder size={32} className="mx-auto mb-2 opacity-50" />
              暂无分类
            </div>
          ) : (
            renderCategoryTree()
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold">
              文件列表
              <span className="text-sm font-normal text-gray-500 ml-2">
                / {getCategoryPath(selectedCategoryId)}
              </span>
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowLocalUploader(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <FilePlus size={16} /> 上传文件
            </button>
            <button
              onClick={() => setShowUrlUploader(true)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm"
            >
              <LinkIcon size={16} /> 从URL上传
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <FileListTable
            key={refreshKey}
            categoryId={getEffectiveCategoryId()}
            onRefresh={refresh}
          />
        </div>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingCategory ? '编辑分类' : '新建分类'}
              </h3>
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); setCategoryForm({ name: '', parentId: '' }); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">分类名称 *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="请输入分类名称"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">上级分类</label>
                <select
                  value={categoryForm.parentId}
                  onChange={(e) => setCategoryForm(prev => ({ ...prev, parentId: e.target.value }))}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">无（顶级分类）</option>
                  {categories
                    .filter(cat => cat.slug !== 'uncategorized' && cat.name !== '未分类' && (!editingCategory || cat.id !== editingCategory.id))
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => { setShowCategoryModal(false); setEditingCategory(null); }}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={editingCategory ? handleUpdateCategory : handleCreateCategory}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingCategory ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      <LocalFileUploader
        open={showLocalUploader}
        onClose={() => setShowLocalUploader(false)}
        onUploadSuccess={refresh}
        categoryId={getEffectiveCategoryId()}
      />

      <UrlFileUploader
        open={showUrlUploader}
        onClose={() => setShowUrlUploader(false)}
        onUploadSuccess={refresh}
        categoryId={getEffectiveCategoryId()}
      />
    </div>
  );
}