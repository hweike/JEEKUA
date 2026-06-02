'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragMoveEvent,
  UniqueIdentifier,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ChevronRight, ChevronDown, GripVertical, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

export interface DocNode {
  id: string;
  title: string;
  slug: string;
  order: number;
  parentId: string | null;
  children?: DocNode[];
}

interface DocsTreeAdminProps {
  tree: DocNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onTreeChange: (newTree: DocNode[]) => void;
}

interface FlattenedItem extends DocNode {
  depth: number;
  childrenCount: number;
}

const flattenTree = (nodes: DocNode[], depth = 0): FlattenedItem[] => {
  let items: FlattenedItem[] = [];
  nodes.forEach((node) => {
    items.push({
      ...node,
      depth,
      childrenCount: node.children?.length || 0,
      children: undefined,
    });
    if (node.children && node.children.length) {
      items = items.concat(flattenTree(node.children, depth + 1));
    }
  });
  return items;
};

const buildTree = (items: FlattenedItem[]): DocNode[] => {
  const map = new Map<string, any>();
  const roots: any[] = [];

  items.forEach((item) => {
    map.set(item.id, {
      id: item.id,
      title: item.title,
      slug: item.slug,
      order: item.order,
      parentId: item.parentId === null ? null : item.parentId,
      children: [],
    });
  });

  items.forEach((item) => {
    const node = map.get(item.id);
    if (item.parentId && map.has(item.parentId)) {
      const parent = map.get(item.parentId);
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sortChildren = (node: any) => {
    node.children.sort((a: any, b: any) => a.order - b.order);
    node.children.forEach(sortChildren);
  };
  roots.sort((a, b) => a.order - b.order);
  roots.forEach(sortChildren);
  return roots;
};

// 根据鼠标坐标和元素矩形计算放置位置
const getDropPosition = (clientY: number, rect: DOMRect): 'before' | 'after' | 'child' => {
  const relativeY = clientY - rect.top;
  const height = rect.height;
  if (height <= 28) return 'child';
  if (relativeY < height * 0.3) return 'before';
  if (relativeY > height * 0.7) return 'after';
  return 'child';
};

// 可排序的树节点组件
interface SortableTreeItemProps {
  item: FlattenedItem;
  selectedId: string | null;
  activeId: UniqueIdentifier | null;
  onSelect: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  isDropTarget: boolean;
  dropPosition: 'before' | 'after' | 'child' | null;
}

const SortableTreeItem = ({
  item,
  selectedId,
  activeId,
  onSelect,
  onNewChild,
  onDelete,
  onReorder,
  expandedIds,
  onToggleExpand,
  isDropTarget,
  dropPosition,
}: SortableTreeItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const hasChildren = item.childrenCount > 0;
  const isExpanded = expandedIds.has(item.id);
  const isActive = activeId === item.id;
  const showDropIndicator = isDropTarget && !isActive;

  const getDropIndicator = () => {
    if (!showDropIndicator) return null;
    if (dropPosition === 'before') {
      return <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />;
    }
    if (dropPosition === 'after') {
      return <div className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-blue-500 rounded-full z-10" />;
    }
    if (dropPosition === 'child') {
      return <div className="absolute inset-0 border-2 border-blue-400 border-dashed rounded-md bg-blue-50 bg-opacity-30 z-10" />;
    }
    return null;
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative" data-doc-id={item.id}>
      {getDropIndicator()}
      <div
        className={`flex items-center justify-between py-1.5 rounded-md hover:bg-gray-50 ${
          selectedId === item.id ? 'bg-blue-50' : ''
        }`}
        style={{ paddingLeft: item.depth * 20 + 8 }}
      >
        <div className="flex items-center flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
          >
            <GripVertical size={14} />
          </button>

          {hasChildren ? (
            <button
              onClick={() => onToggleExpand(item.id)}
              className="p-1 text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-6" />
          )}

          <button
            onClick={() => onSelect(item.id)}
            className={`ml-1 px-2 py-0.5 rounded text-sm truncate flex-1 text-left ${
              selectedId === item.id
                ? 'text-blue-700 font-medium'
                : 'text-gray-700 hover:text-gray-900'
            }`}
          >
            {item.title}
          </button>
        </div>

        <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={() => onNewChild(item.id)}
            className="p-1 text-green-600 hover:text-green-800 rounded"
            title="添加子文档"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={() => onReorder(item.id, 'up')}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="向上移动"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onReorder(item.id, 'down')}
            className="p-1 text-gray-500 hover:text-gray-700 rounded"
            title="向下移动"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 text-red-500 hover:text-red-700 rounded"
            title="删除"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// 根放置区组件，使用 useDroppable 并添加标识
function RootDropZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: '__ROOT__' });
  const active = isActive || isOver;
  return (
    <div
      ref={setNodeRef}
      data-doc-id="__ROOT__"
      className={`mb-3 p-2 border-2 border-dashed rounded-md text-center text-sm transition-colors ${
        active
          ? 'border-blue-500 bg-blue-50 text-blue-600'
          : 'border-gray-300 text-gray-400 hover:border-gray-400'
      }`}
    >
      {active ? '释放以提升为一级分类' : '拖拽文档到此处可成为一级分类'}
    </div>
  );
}

export default function DocsTreeAdmin({
  tree,
  selectedId,
  onSelect,
  onNewChild,
  onDelete,
  onReorder,
  onTreeChange,
}: DocsTreeAdminProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const expandAll = (nodes: DocNode[]): Set<string> => {
      const set = new Set<string>();
      nodes.forEach((node) => {
        set.add(node.id);
        if (node.children) expandAll(node.children).forEach(id => set.add(id));
      });
      return set;
    };
    return expandAll(tree);
  });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'child' | null>(null);
  const elementRefs = useRef<Map<string, HTMLElement>>(new Map());

  // 树变化时展开新节点
  useEffect(() => {
    const newIds = new Set<string>();
    const collect = (nodes: DocNode[]) => {
      nodes.forEach(node => {
        newIds.add(node.id);
        if (node.children) collect(node.children);
      });
    };
    collect(tree);
    setExpandedIds(prev => {
      const next = new Set(prev);
      newIds.forEach(id => { if (!prev.has(id)) next.add(id); });
      return next;
    });
  }, [tree]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const visibleItems = useMemo(() => {
    const flat = flattenTree(tree);
    const expanded = new Set<string>();
    const visible: FlattenedItem[] = [];
    flat.forEach(item => {
      if (item.parentId === null) {
        visible.push(item);
        if (expandedIds.has(item.id)) expanded.add(item.id);
      } else if (expanded.has(item.parentId)) {
        visible.push(item);
        if (expandedIds.has(item.id)) expanded.add(item.id);
      }
    });
    return visible;
  }, [tree, expandedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const isDescendant = (ancestorId: string, descendantId: string, items: FlattenedItem[]): boolean => {
    let current = items.find(i => i.id === descendantId);
    while (current?.parentId) {
      if (current.parentId === ancestorId) return true;
      current = items.find(i => i.id === current.parentId);
    }
    return false;
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id);
  const handleDragCancel = () => {
    setActiveId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  // 拖拽移动过程中实时计算目标及放置位置
  const handleDragMove = (event: DragMoveEvent) => {
    const { over } = event;
    if (!over || !activeId) {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const targetId = over.id as string;
    if (targetId === activeId) {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    // 根放置区由 useDroppable 自动识别，over.id 为 '__ROOT__'
    if (targetId === '__ROOT__') {
      setDropTargetId('__ROOT__');
      setDropPosition('child');
      return;
    }

    // 对于普通文档节点，需要获取其 DOM 以计算 before/after/child
    const targetElement = elementRefs.current.get(targetId);
    if (!targetElement) {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    let clientY: number;
    if (event.activatorEvent instanceof MouseEvent) {
      clientY = event.activatorEvent.clientY;
    } else if (event.activatorEvent instanceof TouchEvent && event.activatorEvent.touches[0]) {
      clientY = event.activatorEvent.touches[0].clientY;
    } else {
      setDropTargetId(null);
      setDropPosition(null);
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    const position = getDropPosition(clientY, rect);

    // 防止将节点拖拽到自己的后代中（仅 child 放置需检查）
    if (position === 'child') {
      const flatAll = flattenTree(tree);
      if (isDescendant(activeId as string, targetId, flatAll)) {
        setDropTargetId(null);
        setDropPosition(null);
        return;
      }
    }

    setDropTargetId(targetId);
    setDropPosition(position);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    // 最终目标优先取 over.id（因为 useDroppable 已保证识别根放置区）
    let finalTarget = over?.id as string | undefined;
    let finalPos = dropPosition;
    // 如果 over.id 是 __ROOT__，则使用根放置区逻辑
    if (finalTarget === '__ROOT__') {
      finalPos = 'child';
    } else if (finalTarget && finalTarget !== active.id) {
      finalPos = dropPosition;
    } else {
      finalTarget = undefined;
    }

    setActiveId(null);
    setDropTargetId(null);
    setDropPosition(null);

    if (!finalTarget || !finalPos) return;

    const activeIdStr = active.id as string;
    const flatItems = flattenTree(tree);
    const activeItem = flatItems.find(i => i.id === activeIdStr);
    if (!activeItem) return;

    let newParentId: string | null = null;
    let newOrder = 0;
    const getSiblings = (parentId: string | null) =>
      flatItems.filter(i => i.parentId === parentId).sort((a, b) => a.order - b.order);

    if (finalTarget === '__ROOT__') {
      newParentId = null;
      const roots = getSiblings(null);
      newOrder = roots.length;
    } else {
      const overItem = flatItems.find(i => i.id === finalTarget);
      if (!overItem) return;
      if (finalPos === 'child') {
        newParentId = overItem.id;
        const siblings = getSiblings(newParentId);
        newOrder = siblings.length;
      } else {
        newParentId = overItem.parentId;
        const siblings = getSiblings(newParentId);
        const overIdx = siblings.findIndex(s => s.id === finalTarget);
        if (overIdx !== -1) {
          newOrder = finalPos === 'before' ? overIdx : overIdx + 1;
        } else {
          newOrder = siblings.length;
        }
      }
    }

    if (newParentId === activeItem.parentId && newOrder === activeItem.order) return;
    if (newParentId === activeItem.id) return;

    let updated = flatItems.filter(i => i.id !== activeIdStr);
    updated = updated.map(i => {
      if (i.parentId === newParentId && i.order >= newOrder)
        return { ...i, order: i.order + 1 };
      return i;
    });
    updated = updated.map(i => {
      if (i.parentId === activeItem.parentId && i.order > activeItem.order)
        return { ...i, order: i.order - 1 };
      return i;
    });
    const moved = { ...activeItem, parentId: newParentId, order: newOrder };
    updated.push(moved);

    // 重新压缩每个父级下的 order
    const grouped = new Map<string | null, FlattenedItem[]>();
    updated.forEach(i => {
      const key = i.parentId;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(i);
    });
    grouped.forEach(items => {
      items.sort((a, b) => a.order - b.order);
      items.forEach((i, idx) => { i.order = idx; });
    });
    const newTree = buildTree(updated);
    onTreeChange(newTree);
  };

  const dragItem = activeId ? visibleItems.find(i => i.id === activeId) : null;

  return (
    <div className="select-none" id="docs-tree-container">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis]}
      >
        <RootDropZone isActive={dropTargetId === '__ROOT__'} />
        <SortableContext items={visibleItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-0.5">
            {visibleItems.map((item) => (
              <div
                key={item.id}
                ref={(el) => {
                  if (el) elementRefs.current.set(item.id, el);
                  else elementRefs.current.delete(item.id);
                }}
              >
                <SortableTreeItem
                  item={item}
                  selectedId={selectedId}
                  activeId={activeId}
                  onSelect={onSelect}
                  onNewChild={onNewChild}
                  onDelete={onDelete}
                  onReorder={onReorder}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
                  isDropTarget={dropTargetId === item.id}
                  dropPosition={dropPosition}
                />
              </div>
            ))}
          </div>
        </SortableContext>
        <DragOverlay>
          {dragItem && (
            <div className="bg-white border border-blue-400 shadow-lg rounded-md px-3 py-1.5 inline-flex items-center gap-2">
              <GripVertical size={14} className="text-gray-400" />
              <span className="text-sm">{dragItem.title}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}