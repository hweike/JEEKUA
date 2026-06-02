// components/admin/menus/AddEditMenuItemForm.tsx
'use client';
import { useState } from 'react';
import LinkSelector from './LinkSelector';
import { X } from 'lucide-react';

interface Props {
  initialData?: {
    label: string;
    linkType: 'internal' | 'external';
    linkValue: string;
  };
  parentId?: string | null;
  onCancel: () => void;
  onSave: (data: { label: string; linkType: 'internal' | 'external'; linkValue: string }) => void;
}

export default function AddEditMenuItemForm({ initialData, onCancel, onSave }: Props) {
  const [label, setLabel] = useState(initialData?.label || '');
  const [linkType, setLinkType] = useState<'internal' | 'external'>(initialData?.linkType || 'internal');
  const [linkValue, setLinkValue] = useState(initialData?.linkValue || '');
  const [locale] = useState('zh'); // 可从上下文获取当前语言

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      alert('请填写菜单标签');
      return;
    }
    if (!linkValue.trim()) {
      alert('请填写链接');
      return;
    }
    onSave({ label: label.trim(), linkType, linkValue: linkValue.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-medium">{initialData ? '编辑菜单项' : '新增菜单项'}</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例如：产品中心"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">链接类型</label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as any)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="internal">内部页面</option>
              <option value="external">外部链接</option>
            </select>
          </div>

          {linkType === 'internal' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">选择页面</label>
              <LinkSelector
                locale={locale}
                onSelect={(link) => setLinkValue(link.url)}
                selectedUrl={linkValue}
              />
              {linkValue && (
                <p className="text-xs text-gray-500 mt-1">已选：{linkValue}</p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="https://"
              />
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}