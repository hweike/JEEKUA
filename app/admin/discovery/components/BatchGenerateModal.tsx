// app/admin/discovery/components/BatchGenerateModal.tsx

'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Check, AlertTriangle, Square, CheckSquare } from 'lucide-react';

interface BatchGenerateModalProps {
  isOpen: boolean;
  mode: 'selected' | 'all';
  count: number;
  onClose: () => void;
  onConfirm: (fields: { title: boolean; description: boolean; keywords: boolean }) => void;
  loading: boolean;
}

const FIELD_CONFIG = [
  { key: 'title' as const, label: 'SEO 标题', description: '页面标题标签，影响搜索排名' },
  { key: 'description' as const, label: 'SEO 描述', description: '页面描述标签，影响点击率' },
  { key: 'keywords' as const, label: 'SEO 关键词', description: '关键词列表，影响内容匹配' },
];

export function BatchGenerateModal({
  isOpen,
  mode,
  count,
  onClose,
  onConfirm,
  loading,
}: BatchGenerateModalProps) {
  const [fields, setFields] = useState({
    title: true,
    description: true,
    keywords: true,
  });

  // 当弹窗关闭再打开时重置为全选
  useEffect(() => {
    if (isOpen) {
      setFields({ title: true, description: true, keywords: true });
    }
  }, [isOpen]);

  const selectedCount = Object.values(fields).filter(Boolean).length;
  const totalFields = Object.keys(fields).length;
  const isAllSelected = selectedCount === totalFields;

  const handleToggleAll = () => {
    if (isAllSelected) {
      setFields({ title: false, description: false, keywords: false });
    } else {
      setFields({ title: true, description: true, keywords: true });
    }
  };

  const handleFieldToggle = (key: keyof typeof fields) => {
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    if (selectedCount === 0) {
      alert('请至少选择一个要生成的信息项');
      return;
    }
    onConfirm(fields);
  };

  if (!isOpen) return null;

  const modeLabel = mode === 'all' ? '一键全部生成' : '批量生成';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10 rounded-t-lg">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-purple-600">⚙️</span>
            {modeLabel}
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-5">
          {/* 统计信息 */}
          <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 border border-gray-100">
            <div className="flex items-center justify-between">
              <span>
                将对 <span className="font-semibold text-blue-600">{count}</span> 个页面执行
              </span>
              <span className="text-xs text-gray-400">分析 → AI 生成 → 确认发布</span>
            </div>
          </div>

          {/* 警告 */}
          <div className="border rounded-lg p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">⚠️ 重要提醒</p>
                <p className="text-xs text-amber-600 mt-1">
                  批量生成将覆盖所选页面原来的 SEO 信息，可能对页面的搜索引擎排名产生影响，请谨慎操作。
                </p>
              </div>
            </div>
          </div>

          {/* 字段选择 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">选择要生成的信息项</p>
              <button
                onClick={handleToggleAll}
                className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
              >
                {isAllSelected ? (
                  <>
                    <Square className="w-3.5 h-3.5" />
                    取消全选
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" />
                    全选
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              {FIELD_CONFIG.map(({ key, label, description }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    fields[key]
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={fields[key]}
                    onChange={() => handleFieldToggle(key)}
                    className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400">{description}</p>
                  </div>
                  {fields[key] && (
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">
                已选 <span className="font-semibold text-purple-600">{selectedCount}</span> / {totalFields} 项
              </span>
              {selectedCount === 0 && (
                <span className="text-red-400">请至少选择一项</span>
              )}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50 rounded-b-lg sticky bottom-0">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || selectedCount === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {loading
              ? '处理中...'
              : `确认生成（${count} 页${selectedCount < totalFields ? `, ${selectedCount}项` : ''}）`}
          </button>
        </div>
      </div>
    </div>
  );
}