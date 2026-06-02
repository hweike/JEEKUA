'use client';

import { useState, useRef } from 'react';
import { Upload, X } from 'lucide-react';

interface ImageUploaderProps {
  value: string;           // 当前图片URL
  onChange: (url: string) => void;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  accept?: string;
  maxSize?: number;        // 单位 MB
  locale?: string;
  className?: string;
}

export default function ImageUploader({
  value,
  onChange,
  onUploadStart,
  onUploadEnd,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  maxSize = 5,
  locale = 'zh',
  className = '',
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 校验文件类型
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    // 校验文件大小
    if (file.size > maxSize * 1024 * 1024) {
      setError(`图片大小不能超过 ${maxSize}MB`);
      return;
    }

    setError(null);
    setUploading(true);
    onUploadStart?.();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('locale', locale);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '上传失败');
      }
      const data = await res.json();
      onChange(data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      onUploadEnd?.();
      // 清空 input 以便再次上传同一文件
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleClear = () => {
    onChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="图片 URL"
          className="flex-1 border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg flex items-center gap-1 transition disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading ? '上传中' : '上传'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-red-500 px-2"
            title="清除"
          >
            <X size={18} />
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {value && (
        <div className="relative w-full max-w-[200px] border rounded overflow-hidden bg-gray-50">
          <img src={value} alt="预览" className="w-full h-auto object-cover" />
        </div>
      )}
    </div>
  );
}