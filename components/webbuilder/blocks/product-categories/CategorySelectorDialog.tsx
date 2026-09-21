'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { getImageUrl } from '@/lib/files/url';

interface CategorySeries {
  id: string;
  name: string;
  slug: string;
  image: string;
  order: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  order: number;
  series: CategorySeries[];
}

interface CategorySelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (categoryIds: string[]) => void;
  maxSelection?: number;
  initialSelectedIds?: string[];
  locale: string;
}

export default function CategorySelectorDialog({
  open,
  onClose,
  onConfirm,
  maxSelection = 20,
  initialSelectedIds = [],
  locale,
}: CategorySelectorDialogProps) {
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialSelectedIds));

  useEffect(() => {
    setMounted(true);
  }, []);

  // 打开时重置选中
  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(initialSelectedIds));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);

    fetch(`/api/front/products/categories?locale=${encodeURIComponent(locale)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setCategories(data.items || []);
      })
      .catch((err) => console.error('[CategorySelectorDialog]', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size >= maxSelection) {
        alert(`最多只能选择 ${maxSelection} 个分类`);
        return;
      }
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleConfirm = () => {
    // ✅ 按 categories 的顺序返回（保持用户看到的顺序）
    const ordered = categories
      .map((c) => c.id)
      .filter((id) => selectedIds.has(id));
    onConfirm(ordered);
    onClose();
  };

  if (!mounted || !open) return null;

  const dialogContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white rounded-lg shadow-xl w-[700px] max-w-[90vw] h-[70vh] flex flex-col">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            选择分类（最多 {maxSelection} 个）
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* 分类列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-400">加载中...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 text-gray-500">暂无分类</div>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => {
                const isSelected = selectedIds.has(cat.id);
                return (
                  <label
                    key={cat.id}
                    className={`flex items-center gap-3 p-3 border rounded cursor-pointer transition ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(cat.id)}
                      className="w-4 h-4 flex-shrink-0"
                    />
                    {cat.image ? (
                      <img
                        src={getImageUrl(cat.image)}
                        alt={cat.name}
                        className="w-12 h-12 object-cover rounded flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs flex-shrink-0">
                        无图
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{cat.name}</div>
                      {cat.description && (
                        <div className="text-xs text-gray-500 line-clamp-1">
                          {cat.description}
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={18} className="text-blue-500 flex-shrink-0" />
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="border-t p-3 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            已选择 {selectedIds.size} 个分类
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 border rounded hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="button"
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