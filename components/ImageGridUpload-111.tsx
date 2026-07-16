'use client';

import { useState } from 'react';

interface ImageGridUploadProps {
  images: string[];
  onChange: (urls: string[]) => void;
  maxImages: number;
}

export default function ImageGridUpload({ images, onChange, maxImages }: ImageGridUploadProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (index: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        const newImages = [...images];
        newImages[index] = data.url;
        onChange(newImages);
      } else {
        alert('上传失败');
      }
    } catch (err) {
      console.error(err);
      alert('上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newImages = [...images];
    newImages[index] = '';
    onChange(newImages);
  };

  const handleUrlChange = (index: number, url: string) => {
    const newImages = [...images];
    newImages[index] = url;
    onChange(newImages);
  };

  return (
    <div className="grid grid-cols-3 gap-4">
      {images.map((img, idx) => (
        <div key={idx} className="relative border rounded p-2 bg-gray-50">
          {img ? (
            <>
              <img src={img} alt={`图片 ${idx + 1}`} className="w-full h-32 object-contain" />
              <button
                onClick={() => handleRemove(idx)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
              >
                ×
              </button>
              <input
                type="text"
                value={img}
                onChange={(e) => handleUrlChange(idx, e.target.value)}
                className="mt-2 w-full text-xs border rounded p-1"
                placeholder="或直接输入图片URL"
              />
            </>
          ) : (
            <label className="flex flex-col items-center justify-center h-32 cursor-pointer bg-gray-100 rounded">
              {uploading ? (
                <span className="text-sm">上传中...</span>
              ) : (
                <>
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-xs text-gray-500">上传图片</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(idx, file);
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      ))}
    </div>
  );
}