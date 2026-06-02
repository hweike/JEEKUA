'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;                     // 提示文字
  width?: number;                    // 预览框宽度（px）
  height?: number;                   // 预览框高度（px）
  aspectRatio?: number;              // 宽高比（如 2.5），若提供则高度 = width / aspectRatio
  buttonText?: string;               // 自定义按钮文字，默认“上传图片”，有图时自动变为“更改图片”
}

export default function ImageUploader({
  value,
  onChange,
  label,
  hint,
  width = 80,
  height,
  aspectRatio,
  buttonText,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  // 计算最终预览尺寸
  let finalWidth = width;
  let finalHeight = height;
  if (aspectRatio && !height) {
    finalHeight = Math.round(width / aspectRatio);
  } else if (!height) {
    finalHeight = width; // 默认正方形
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/SiteHeadersFooters/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onChange(data.url);
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
  };

  const buttonLabel = value 
    ? (buttonText || '更改图片') 
    : (buttonText || '上传图片');

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium">{label}</label>}
      <div className="flex items-center gap-4">
        {value && (
          <div
            className="relative border rounded overflow-hidden bg-gray-50"
            style={{ width: finalWidth, height: finalHeight }}
          >
            <Image
              src={value}
              alt="Preview"
              fill
              className="object-contain"
            />
          </div>
        )}
        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded text-sm">
          {uploading ? '上传中...' : buttonLabel}
          <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
      </div>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
    </div>
  );
}