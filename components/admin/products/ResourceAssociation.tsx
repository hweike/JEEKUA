'use client';

import { useState, useEffect, useCallback } from 'react';
import { GripVertical, Trash2, Plus } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProductSelectorDialog from './ProductSelectorDialog';

interface AssociatedProduct {
  productId: string;
  productName: string;
  sku: string;
  sortOrder: number;
}

interface ResourceAssociationProps {
  resourceType: 'blog' | 'document' | 'video';
  resourceId: string;
  locale: string;
  onSave?: () => void;
}

// 可拖拽列表项组件
function SortableItem({ product, onRemove, saving }: { product: AssociatedProduct; onRemove: (id: string) => void; saving: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.productId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-2 border rounded bg-gray-50"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} className="text-gray-400" />
        </button>
        <div>
          <div className="font-medium text-sm">{product.productName}</div>
          <div className="text-xs text-gray-500">SKU: {product.sku}</div>
        </div>
      </div>
      <button
        type="button"
        onClick={() => onRemove(product.productId)}
        className="text-red-500 hover:text-red-700"
        disabled={saving}
      >
        <Trash2 size={16} />
      </button>
    </li>
  );
}

export default function ResourceAssociation({
  resourceType,
  resourceId,
  locale,
  onSave,
}: ResourceAssociationProps) {
  const [products, setProducts] = useState<AssociatedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadProducts = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/resources/${resourceType}/${resourceId}`);
      const data = await res.json();
      setProducts(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const updateServer = async (newProductIds: string[]) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/products/resources/${resourceType}/${resourceId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: newProductIds }),
      });
      await loadProducts();
      onSave?.();
    } catch (err) {
      console.error(err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = (newIds: string[]) => {
    const existingIds = products.map(p => p.productId);
    const merged = [...existingIds, ...newIds.filter(id => !existingIds.includes(id))];
    if (merged.length > 10) {
      alert('最多关联10个产品');
      return;
    }
    updateServer(merged);
  };

  const handleRemove = (productId: string) => {
    const newIds = products.filter(p => p.productId !== productId).map(p => p.productId);
    updateServer(newIds);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = products.findIndex(p => p.productId === active.id);
      const newIndex = products.findIndex(p => p.productId === over?.id);
      const newOrder = arrayMove(
        products.map(p => p.productId),
        oldIndex,
        newIndex
      );
      updateServer(newOrder);
    }
  };

  if (loading) {
    return <div className="border rounded p-4 text-gray-500">加载中...</div>;
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-medium text-lg">关联产品</h3>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={saving}
          className="text-sm text-blue-600 flex items-center gap-1"
        >
          <Plus size={16} /> 添加产品
        </button>
      </div>
      <p className="text-xs text-gray-500 mb-3">最多可关联10个产品，支持拖拽排序</p>
      {products.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">暂无关联产品，点击上方按钮添加</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={products.map(p => p.productId)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {products.map((p) => (
                <SortableItem
                  key={p.productId}
                  product={p}
                  onRemove={handleRemove}
                  saving={saving}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
      {products.length > 0 && (
        <div className="text-xs text-gray-400 mt-2">拖拽左侧手柄可调整排序</div>
      )}
      {saving && <div className="text-right text-xs text-gray-400 mt-2">保存中...</div>}
      <ProductSelectorDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConfirm={handleAdd}
        maxSelection={10}
        initialSelectedIds={products.map(p => p.productId)}
        locale={locale}
      />
    </div>
  );
}