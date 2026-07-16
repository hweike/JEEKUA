// components/admin/menus/MenuTreeEditor.tsx
'use client';
import { forwardRef, useImperativeHandle, useState, useEffect, useCallback, useRef } from 'react';
import { GripVertical, Pencil, Trash2, Plus, Check, X, ChevronRight, ChevronDown } from 'lucide-react';
import LinkInput from './LinkInput';
import type { MenuItem } from '@/lib/menus/types';

interface FlatNode extends MenuItem {
  depth: number;
}

export interface MenuTreeEditorRef {
  save: () => void;
  addTopLevel: () => void;
}

interface MenuTreeEditorProps {
  initialItems: MenuItem[];
  onSave: (items: MenuItem[]) => void;
  onCancel: () => void;
  locale?: string; // 新增 locale prop
}

function buildFlatList(items: MenuItem[]): FlatNode[] {
  const map = new Map<string, MenuItem>();
  items.forEach(item => map.set(item.id, item));
  const result: FlatNode[] = [];
  const addNode = (id: string, depth: number) => {
    const node = map.get(id);
    if (!node) return;
    result.push({ ...node, depth });
    const children = items.filter(i => i.parentId === id).sort((a, b) => a.order - b.order);
    children.forEach(child => addNode(child.id, depth + 1));
  };
  const roots = items.filter(i => !i.parentId).sort((a, b) => a.order - b.order);
  roots.forEach(root => addNode(root.id, 0));
  return result;
}

function rebuildItems(flatList: FlatNode[]): MenuItem[] {
  const groups = new Map<string | null, FlatNode[]>();
  flatList.forEach(node => {
    const key = node.parentId;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(node);
  });
  const newItems: MenuItem[] = [];
  for (const [_, group] of groups) {
    group.forEach((node, idx) => {
      newItems.push({
        id: node.id,
        parentId: node.parentId,
        label: node.label,
        linkType: node.linkType,
        linkValue: node.linkValue,
        order: idx,
      });
    });
  }
  return newItems;
}

const MenuTreeEditor = forwardRef<MenuTreeEditorRef, MenuTreeEditorProps>(
  ({ initialItems, onSave, onCancel, locale = 'zh' }, ref) => {
    const [allNodes, setAllNodes] = useState<FlatNode[]>([]);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [addingParentId, setAddingParentId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ label: '', linkValue: '' });
    const dragSourceRef = useRef<{ id: string; parentId: string | null; depth: number } | null>(null);
    const [dragTarget, setDragTarget] = useState<{ id: string; position: 'before' | 'after' | 'inside' } | null>(null);

    useEffect(() => {
      const flat = buildFlatList(initialItems);
      setAllNodes(flat);
      const allIds = new Set(flat.map(n => n.id));
      setExpandedIds(allIds);
    }, [initialItems]);

    const getVisibleNodes = useCallback(() => {
      return allNodes.filter(node => {
        if (node.depth === 0) return true;
        let parentId = node.parentId;
        while (parentId) {
          if (!expandedIds.has(parentId)) return false;
          const parent = allNodes.find(p => p.id === parentId);
          parentId = parent?.parentId || null;
        }
        return true;
      });
    }, [allNodes, expandedIds]);

    const getDescendantIds = (id: string): string[] => {
      const result: string[] = [];
      const queue = [id];
      while (queue.length) {
        const current = queue.shift()!;
        const children = allNodes.filter(n => n.parentId === current);
        children.forEach(child => {
          result.push(child.id);
          queue.push(child.id);
        });
      }
      return result;
    };

    const getMaxDepthOfSubtree = (id: string, currentDepth: number): number => {
      let maxDepth = currentDepth;
      const children = allNodes.filter(n => n.parentId === id);
      for (const child of children) {
        maxDepth = Math.max(maxDepth, getMaxDepthOfSubtree(child.id, currentDepth + 1));
      }
      return maxDepth;
    };

    const updateTree = (newItems: MenuItem[]) => {
      const newFlat = buildFlatList(newItems);
      setAllNodes(newFlat);
      const newExpandedIds = new Set<string>();
      expandedIds.forEach(id => {
        if (newFlat.some(n => n.id === id)) newExpandedIds.add(id);
      });
      setExpandedIds(newExpandedIds);
    };

    const saveEdit = (id: string) => {
      const { label, linkValue } = editForm;
      if (!label.trim() || !linkValue.trim()) {
        alert('请填写完整');
        return;
      }
      const linkType = linkValue.startsWith('http') ? 'external' : 'internal';
      const updated = allNodes.map(node =>
        node.id === id ? { ...node, label: label.trim(), linkValue: linkValue.trim(), linkType } : node
      );
      const newItems = rebuildItems(updated);
      updateTree(newItems);
      setEditingId(null);
      setAddingParentId(null);
    };

    const cancelEdit = () => {
      if (addingParentId !== null && editingId) {
        const newItems = rebuildItems(allNodes.filter(n => n.id !== editingId));
        updateTree(newItems);
      }
      setEditingId(null);
      setAddingParentId(null);
    };

    const startAdd = (parentId: string | null) => {
      const parentNode = parentId ? allNodes.find(n => n.id === parentId) : null;
      const parentDepth = parentNode?.depth ?? -1;
      if (parentDepth >= 2) {
        alert('最多支持三级菜单，不能添加子菜单');
        return;
      }
      const newId = crypto.randomUUID();
      const siblings = allNodes.filter(n => n.parentId === parentId);
      const newOrder = siblings.length;
      const newNode: FlatNode = {
        id: newId,
        parentId,
        label: '',
        linkType: 'internal',
        linkValue: '',
        order: newOrder,
        depth: parentId ? parentDepth + 1 : 0,
      };
      const newItems = rebuildItems([...allNodes, newNode]);
      updateTree(newItems);
      setEditingId(newId);
      setAddingParentId(parentId);
      setEditForm({ label: '', linkValue: '' });
      if (parentId) {
        setExpandedIds(prev => new Set(prev).add(parentId));
      }
    };

    const deleteNode = (id: string) => {
      if (!confirm('删除此项会同时删除其所有子项，确定吗？')) return;
      const descendantIds = getDescendantIds(id);
      const idsToDelete = new Set([id, ...descendantIds]);
      const newItems = rebuildItems(allNodes.filter(n => !idsToDelete.has(n.id)));
      updateTree(newItems);
      if (editingId === id) setEditingId(null);
    };

    const handleDragStart = (e: React.DragEvent, node: FlatNode) => {
      if (editingId !== null) cancelEdit();
      dragSourceRef.current = { id: node.id, parentId: node.parentId, depth: node.depth };
      e.dataTransfer.setData('text/plain', node.id);
      e.dataTransfer.effectAllowed = 'move';
      const dragIcon = document.createElement('div');
      dragIcon.style.opacity = '0';
      document.body.appendChild(dragIcon);
      e.dataTransfer.setDragImage(dragIcon, 0, 0);
      setTimeout(() => document.body.removeChild(dragIcon), 0);
    };

    const handleDragOver = (e: React.DragEvent, targetNode: FlatNode) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!dragSourceRef.current || dragSourceRef.current.id === targetNode.id) return;
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const y = e.clientY - rect.top;
      const height = rect.height;
      let position: 'before' | 'after' | 'inside' = 'inside';
      if (y < height * 0.25) position = 'before';
      else if (y > height * 0.75) position = 'after';
      else position = 'inside';
      setDragTarget({ id: targetNode.id, position });
    };

    const handleDragLeave = () => setDragTarget(null);

    const handleDrop = (e: React.DragEvent, targetNode: FlatNode) => {
      e.preventDefault();
      const dragId = dragSourceRef.current?.id;
      if (!dragId || dragId === targetNode.id) {
        setDragTarget(null);
        return;
      }
      const sourceNode = allNodes.find(n => n.id === dragId);
      if (!sourceNode) {
        setDragTarget(null);
        return;
      }
      const position = dragTarget?.position || 'inside';
      let newParentId: string | null = null;
      if (position === 'inside') newParentId = targetNode.id;
      else newParentId = targetNode.parentId;

      const descendantIds = getDescendantIds(dragId);
      if (newParentId === dragId || (newParentId && descendantIds.includes(newParentId))) {
        alert('不能将菜单项移动到自身或其子菜单中');
        setDragTarget(null);
        return;
      }
      const getDepth = (id: string | null): number => {
        if (!id) return 0;
        const node = allNodes.find(n => n.id === id);
        if (!node) return 0;
        return 1 + getDepth(node.parentId);
      };
      const newParentDepth = getDepth(newParentId);
      const maxDepthOfDraggedTree = getMaxDepthOfSubtree(dragId, 0);
      if (newParentDepth + maxDepthOfDraggedTree > 2) {
        alert('最多支持三级菜单，移动后会导致超过三级限制');
        setDragTarget(null);
        return;
      }

      let updated = allNodes.map(node =>
        node.id === dragId ? { ...node, parentId: newParentId } : node
      );
      const groups = new Map<string | null, FlatNode[]>();
      updated.forEach(node => {
        const key = node.parentId;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(node);
      });
      const newFlat: FlatNode[] = [];
      for (const [parentId, group] of groups) {
        group.sort((a, b) => a.order - b.order);
        if (parentId === newParentId && position !== 'inside') {
          const sourceIndex = group.findIndex(g => g.id === dragId);
          const targetIndex = group.findIndex(g => g.id === targetNode.id);
          if (sourceIndex !== -1 && targetIndex !== -1 && sourceIndex !== targetIndex) {
            const [moved] = group.splice(sourceIndex, 1);
            let insertIndex = targetIndex;
            if (position === 'after') insertIndex = targetIndex + 1;
            if (sourceIndex < targetIndex && position === 'before') insertIndex--;
            group.splice(insertIndex, 0, moved);
          }
        }
        group.forEach((node, idx) => newFlat.push({ ...node, order: idx }));
      }
      const recomputeDepths = (items: FlatNode[]): FlatNode[] => {
        const depthMap = new Map<string, number>();
        const compute = (id: string, depth: number) => {
          depthMap.set(id, depth);
          const children = items.filter(c => c.parentId === id);
          children.forEach(child => compute(child.id, depth + 1));
        };
        const roots = items.filter(i => !i.parentId);
        roots.forEach(root => compute(root.id, 0));
        return items.map(item => ({ ...item, depth: depthMap.get(item.id) || 0 }));
      };
      const finalFlat = recomputeDepths(newFlat);
      const newItems = rebuildItems(finalFlat);
      updateTree(newItems);
      dragSourceRef.current = null;
      setDragTarget(null);
    };

    const handleDragEnd = () => {
      dragSourceRef.current = null;
      setDragTarget(null);
    };

    const toggleExpand = (id: string) => {
      setExpandedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        return newSet;
      });
    };

    const handleSave = () => {
      const items = rebuildItems(allNodes);
      onSave(items);
    };

    const addTopLevel = () => startAdd(null);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      addTopLevel,
    }));

    const visibleNodes = getVisibleNodes();
    const getCardMarginLeft = (depth: number) => depth * 28;
    const getContentPaddingLeft = (depth: number) => 12 + depth * 28;
    const getLineStart = (depth: number) => getCardMarginLeft(depth);

    return (
      <>
        <style jsx>{`
          .drag-over-before { position: relative; }
          .drag-over-before::before {
            content: '';
            position: absolute;
            top: -2px;
            left: var(--line-start, 0px);
            right: 0;
            height: 2px;
            background-color: #3b82f6;
            box-shadow: 0 0 0 2px #3b82f6;
            z-index: 10;
            pointer-events: none;
          }
          .drag-over-before::after {
            content: '';
            position: absolute;
            top: -5px;
            left: calc(var(--line-start, 0px) - 5px);
            width: 8px;
            height: 8px;
            background-color: #3b82f6;
            border-radius: 50%;
            z-index: 11;
            pointer-events: none;
          }
          .drag-over-after { position: relative; }
          .drag-over-after::before {
            content: '';
            position: absolute;
            bottom: -2px;
            left: var(--line-start, 0px);
            right: 0;
            height: 2px;
            background-color: #3b82f6;
            box-shadow: 0 0 0 2px #3b82f6;
            z-index: 10;
            pointer-events: none;
          }
          .drag-over-after::after {
            content: '';
            position: absolute;
            bottom: -5px;
            left: calc(var(--line-start, 0px) - 5px);
            width: 8px;
            height: 8px;
            background-color: #3b82f6;
            border-radius: 50%;
            z-index: 11;
            pointer-events: none;
          }
          .drag-over-inside-card {
            background-color: rgba(59, 130, 246, 0.1);
            border: 1px dashed #3b82f6 !important;
            border-radius: 8px;
          }
        `}</style>

        {/* 标题栏：与“菜单名称”卡片样式一致 */}
        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h2 className="text-lg font-semibold">菜单项</h2>
          <button
            onClick={addTopLevel}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            添加菜单项
          </button>
        </div>

        {/* 树形菜单列表 */}
         <div className="p-4">
          {visibleNodes.map((node) => {
            const hasChildren = allNodes.some(c => c.parentId === node.id);
            const isExpanded = expandedIds.has(node.id);
            const isEditing = editingId === node.id;
            const canAddChild = node.depth < 2;
            const cardMarginLeft = getCardMarginLeft(node.depth);
            const contentPaddingLeft = getContentPaddingLeft(node.depth);
            const lineStart = getLineStart(node.depth);

            let dragOverClass = '';
            let isDragInside = false;
            if (dragTarget?.id === node.id) {
              if (dragTarget.position === 'before') dragOverClass = 'drag-over-before';
              else if (dragTarget.position === 'after') dragOverClass = 'drag-over-after';
              else {
                dragOverClass = '';
                isDragInside = true;
              }
            }

            return (
              <div
                key={node.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, node)}
                onDragOver={(e) => handleDragOver(e, node)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, node)}
                onDragEnd={handleDragEnd}
                className={`mb-2 ${dragOverClass}`}
                style={{ '--line-start': `${lineStart}px` } as React.CSSProperties}
              >
                <div
                  className={`group border border-gray-200 rounded-lg bg-white hover:shadow-sm transition-shadow ${isDragInside ? 'drag-over-inside-card' : ''}`}
                  style={{ marginLeft: `${cardMarginLeft}px` }}
                >
                  <div
                    className="flex items-center py-3 px-3"
                    style={{ paddingLeft: `${contentPaddingLeft - cardMarginLeft}px` }}
                  >
                    <div className="cursor-grab mr-3 text-gray-400 hover:text-gray-600">
                      <GripVertical className="w-4 h-4" />
                    </div>
                    {hasChildren ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(node.id);
                        }}
                        className="mr-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    ) : (
                      <div className="w-6 mr-2" />
                    )}

                    {isEditing ? (
                      <div className="flex-1 flex items-center space-x-2">
                        <input
                          value={editForm.label}
                          onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                          className="flex-1 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          autoFocus
                          placeholder="标签"
                        />
                        <LinkInput
                          value={editForm.linkValue}
                          onChange={val => setEditForm({ ...editForm, linkValue: val })}
                          placeholder="搜索或粘贴链接"
                          locale={locale} // 传递 locale
                        />
                        <button onClick={() => saveEdit(node.id)} className="p-1 text-green-600 hover:text-green-800">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 text-gray-500 hover:text-gray-700">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(node.id);
                            setEditForm({ label: node.label, linkValue: node.linkValue });
                            setAddingParentId(null);
                          }}
                          className="flex-1 text-left text-sm font-medium text-gray-800 hover:text-blue-600 truncate"
                        >
                          {node.label || '（未命名）'}
                        </button>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canAddChild && (
                            <button
                              onClick={() => startAdd(node.id)}
                              className="p-1 text-gray-500 hover:text-green-600"
                              title="添加子菜单"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(node.id);
                              setEditForm({ label: node.label, linkValue: node.linkValue });
                              setAddingParentId(null);
                            }}
                            className="p-1 text-gray-500 hover:text-blue-600"
                            title="编辑"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteNode(node.id)}
                            className="p-1 text-gray-500 hover:text-red-600"
                            title="删除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </>
    );
  }
);

MenuTreeEditor.displayName = 'MenuTreeEditor';
export default MenuTreeEditor;