'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface AddMenuModalProps {
  onClose: () => void;
  onSave: (locale: string, name: string) => Promise<void>;
  availableLocales: string[];
  defaultLocale: string;
}

export default function AddMenuModal({
  onClose,
  onSave,
  availableLocales,
  defaultLocale,
}: AddMenuModalProps) {
  const [locale, setLocale] = useState(defaultLocale);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('请输入菜单名称');
      return;
    }
    setLoading(true);
    try {
      await onSave(locale, name.trim());
      onClose();
    } catch (error) {
      // 错误已在父组件通过 Toast 显示
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">新增自定义菜单</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标语言</label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableLocales.map((loc) => (
                <option key={loc} value={loc}>
                  {loc.toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">菜单名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="例如：帮助中心"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end space-x-3 p-4 border-t bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-100">
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '添加中...' : '添加'}
          </button>
        </div>
      </div>
    </div>
  );
}