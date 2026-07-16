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
import { ChevronRight, ChevronDown, GripVertical, Edit, Plus } from 'lucide-react';

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
  onEdit?: (id: string) => void;
  onNewChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onReorder: (id: string, direction: 'up' | 'down') => void;
  onTreeChange: (newTree: DocNode[]) => void;
  docsLibId?: string;
  locale?: string;
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

const getDropPosition = (clientY: number, rect: DOMRect): 'before' | 'after' | 'child' => {
  const relativeY = clientY - rect.top;
  const height = rect.height;
  if (height <= 30) return 'child';
  if (relativeY < height * 0.15) return 'before';
  if (relativeY > height * 0.85) return 'after';
  return 'child';
};

interface SortableTreeItemProps {
  item: FlattenedItem;
  selectedId: string | null;
  activeId: UniqueIdentifier | null;
  onSelect: (id: string) => void;
  onEdit?: (id: string) => void;
  onNewChild: (parentId: string) => void;
  isDropTarget: boolean;
  dropPosition: 'before' | 'after' | 'child' | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}

const SortableTreeItem = ({
  item,
  selectedId,
  activeId,
  onSelect,
  onEdit,
  onNewChild,
  isDropTarget,
  dropPosition,
  expandedIds,
  onToggleExpand,
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
    const paddingLeft = item.depth * 20 + 8;
    if (dropPosition === 'before') {
      return <div className="absolute -top-0.5 h-0.5 bg-blue-500 rounded-full z-10" style={{ left: `${paddingLeft}px`, right: 0 }} />;
    }
    if (dropPosition === 'after') {
      return <div className="absolute -bottom-0.5 h-0.5 bg-blue-500 rounded-full z-10" style={{ left: `${paddingLeft}px`, right: 0 }} />;
    }
    if (dropPosition === 'child') {
      return <div className="absolute inset-0 border-2 border-green-500 border-dashed rounded-md bg-green-50 bg-opacity-40 z-10" style={{ left: `${paddingLeft}px` }} />;
    }
    return null;
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative" data-doc-id={item.id}>
      {getDropIndicator()}
      <div
        className={`flex items-center justify-between py-1.5 rounded-md hover:bg-blue-50 ${
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

        {/* 操作按钮组：新增子文档 + 编辑（悬浮显示） */}
        <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNewChild(item.id);
            }}
            className="p-1.5 text-green-600 hover:text-green-800 rounded-full hover:bg-green-50"
            title="新增子文档"
          >
            <Plus size={14} />
          </button>
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(item.id);
              }}
              className="p-1.5 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-100"
              title="编辑文档"
            >
              <Edit size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function RootDropZone({ isActive }: { isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: '__ROOT__' });
  const active = isActive || isOver;
  return (
    <div
      ref={setNodeRef}
      data-doc-id="__ROOT__"
      className={`mb-3 p-2 border-2 border-dashed rounded-md text-center text-sm transition-colors ${
        active
          ? 'border-green-500 bg-green-50 text-green-600'
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
  onEdit,
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
  const dropTargetRef = useRef<string | null>(null);
  const dropPositionRef = useRef<'before' | 'after' | 'child' | null>(null);
  const startClientYRef = useRef<number | null>(null);

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

  const getDepth = (id: string, items: FlattenedItem[]): number => {
    const item = items.find(i => i.id === id);
    if (!item || item.parentId === null) return 0;
    return 1 + getDepth(item.parentId, items);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
    dropTargetRef.current = null;
    dropPositionRef.current = null;
    setDropTargetId(null);
    setDropPosition(null);
    // 记录鼠标起始 Y
    const activator = event.activatorEvent;
    if (activator instanceof MouseEvent || activator instanceof PointerEvent) {
      startClientYRef.current = activator.clientY;
    } else if (activator instanceof TouchEvent && activator.touches.length > 0) {
      startClientYRef.current = activator.touches[0].clientY;
    } else {
      startClientYRef.current = null;
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setDropTargetId(null);
    setDropPosition(null);
    dropTargetRef.current = null;
    dropPositionRef.current = null;
    startClientYRef.current = null;
  };

  const handleDragMove = (event: DragMoveEvent) => {
    const { over, delta } = event;
    if (!over || !activeId) {
      setDropTargetId(null);
      setDropPosition(null);
      dropTargetRef.current = null;
      dropPositionRef.current = null;
      return;
    }

    const targetId = over.id as string;
    if (targetId === activeId) {
      setDropTargetId(null);
      setDropPosition(null);
      dropTargetRef.current = null;
      dropPositionRef.current = null;
      return;
    }

    if (targetId === '__ROOT__') {
      setDropTargetId('__ROOT__');
      setDropPosition('child');
      dropTargetRef.current = '__ROOT__';
      dropPositionRef.current = 'child';
      return;
    }

    const targetElement = elementRefs.current.get(targetId);
    if (!targetElement) {
      setDropTargetId(null);
      setDropPosition(null);
      dropTargetRef.current = null;
      dropPositionRef.current = null;
      return;
    }

    // 计算当前鼠标 Y 坐标：起始 Y + delta.y
    let clientY: number;
    if (startClientYRef.current !== null) {
      clientY = startClientYRef.current + delta.y;
    } else {
      // 降级：使用 over.rect 估算（不准确但避免崩溃）
      const overRect = event.over?.rect;
      if (overRect) {
        clientY = overRect.top + overRect.height / 2;
      } else {
        setDropTargetId(null);
        setDropPosition(null);
        dropTargetRef.current = null;
        dropPositionRef.current = null;
        return;
      }
    }

    const rect = targetElement.getBoundingClientRect();
    const position = getDropPosition(clientY, rect);

    // 深度限制
    if (position === 'child') {
      const flatAll = flattenTree(tree);
      const targetDepth = getDepth(targetId, flatAll);
      if (targetDepth >= 2) {
        setDropTargetId(null);
        setDropPosition(null);
        dropTargetRef.current = null;
        dropPositionRef.current = null;
        return;
      }
      if (isDescendant(activeId as string, targetId, flatAll)) {
        setDropTargetId(null);
        setDropPosition(null);
        dropTargetRef.current = null;
        dropPositionRef.current = null;
        return;
      }
    }

    setDropTargetId(targetId);
    setDropPosition(position);
    dropTargetRef.current = targetId;
    dropPositionRef.current = position;
  };

  const handleDragEnd = (event: DragEndEvent) => {
  const { active } = event;

  // 优先使用 ref 中记录的最后有效目标和位置
  let finalTarget = dropTargetRef.current;
  let finalPos = dropPositionRef.current;

  // 如果 ref 为空，尝试从 over 获取（但可能不准确）
  if (!finalTarget) {
    const overId = event.over?.id as string | undefined;
    if (overId && overId !== active.id) {
      finalTarget = overId;
    }
  }

  // 如果是根放置区，强制 child
  if (finalTarget === '__ROOT__') {
    finalPos = 'child';
  }

  // 清空 refs 和状态（在获取 final 之后）
  setActiveId(null);
  setDropTargetId(null);
  setDropPosition(null);
  dropTargetRef.current = null;
  dropPositionRef.current = null;
  startClientYRef.current = null;

  // 如果目标无效或位置无效，跳过
  if (!finalTarget || !finalPos) {
    console.log('[DragEnd] 无效放置，跳过');
    return;
  }

  // 防止将节点拖到自己（已过滤）
  if (finalTarget === active.id) return;

  const activeIdStr = active.id as string;
  const flatItems = flattenTree(tree);
  const activeItem = flatItems.find(i => i.id === activeIdStr);
  if (!activeItem) {
    console.warn('[DragEnd] 未找到活动项');
    return;
  }

  // 计算新父级和顺序
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
    if (!overItem) {
      console.warn('[DragEnd] 未找到目标项');
      return;
    }
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

  if (newParentId === activeItem.parentId && newOrder === activeItem.order) {
    console.log('[DragEnd] 位置未变，跳过更新');
    return;
  }
  if (newParentId === activeItem.id) {
    console.warn('[DragEnd] 不能将节点设为自己的子级');
    return;
  }

  // 更新数据
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
  console.log('[DragEnd] 应用新树');
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
                  onEdit={onEdit}
                  onNewChild={onNewChild}
                  isDropTarget={dropTargetId === item.id}
                  dropPosition={dropPosition}
                  expandedIds={expandedIds}
                  onToggleExpand={toggleExpand}
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