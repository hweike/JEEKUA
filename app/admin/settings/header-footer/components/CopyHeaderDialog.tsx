'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { LANGUAGES } from '@/lib/languages/config';

interface CopyHeaderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'header' | 'footer';
  sourceLocale: string;
  availableLocales: string[];
  onRefresh: () => void;
}

export default function CopyHeaderDialog({
  isOpen,
  onClose,
  type,
  sourceLocale,
  availableLocales,
  onRefresh,
}: CopyHeaderDialogProps) {
  const [targetLocale, setTargetLocale] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const targetOptions = availableLocales.filter(loc => loc !== sourceLocale);

  const getLocaleDisplay = (code: string) => {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? `${lang.zhName}(${code})` : code.toUpperCase();
  };

  const handleCopy = async () => {
    if (!targetLocale) {
      setError('请选择一个目标站点');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/header-footer/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,           // 新增
          sourceLocale,
          targetLocale,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '复制失败');
      onRefresh();
      onClose();
    } catch (err: any) {
      setError(err.message || '复制失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">复制{type === 'header' ? '页头' : '页脚'}到</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">源站点</label>
            <div className="text-gray-900 bg-gray-50 px-3 py-2 rounded border border-gray-200">
              {getLocaleDisplay(sourceLocale)}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标站点</label>
            <select
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">请选择...</option>
              {targetOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {getLocaleDisplay(loc)}
                </option>
              ))}
            </select>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
            <p className="font-medium">温馨提示：</p>
            <p>此操作将覆盖目标站点的{type === 'header' ? '页头' : '页脚'}配置（只复制不翻译），不可撤回。</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md hover:bg-gray-100"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleCopy}
            disabled={loading || !targetLocale}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? '复制中...' : '确认复制'}
          </button>
        </div>
      </div>
    </div>
  );
}