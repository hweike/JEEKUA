'use client';

import { useRef } from 'react';

interface BackgroundImageFieldProps {
  field: any;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}

export function BackgroundImageField({
  field,
  value,
  onChange,
  readOnly = false,
}: BackgroundImageFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        onChange({ url: data.url });
      } else {
        alert(data.error || '上传失败');
      }
    } catch (error) {
      alert('上传失败');
    }
  };

  return (
    <div className="space-y-2">
      {field.label && (
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value?.url || ''}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder={field.placeholder || '输入图片URL或点击上传'}
          disabled={readOnly}
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={readOnly}
          className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition disabled:opacity-50"
        >
          上传
        </button>
      </div>
      {field.description && (
        <p className="text-xs text-gray-500">{field.description}</p>
      )}
    </div>
  );
}