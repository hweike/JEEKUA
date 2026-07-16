// components/litechat/ImagePreview.tsx
'use client';

import { X } from 'lucide-react';
import { getProxyImageUrl } from '@/lib/litechat/utils';

interface ImagePreviewProps {
  src: string;
  onClose: () => void;
}

export default function ImagePreview({ src, onClose }: ImagePreviewProps) {
  // 如果 src 是代理 URL，尝试提取原始 URL 用于降级
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // 如果预览URL是代理地址，尝试直接访问原图
    if (src.includes('/api/proxy-image?url=')) {
      const urlParams = new URLSearchParams(src.split('?')[1]);
      const original = urlParams.get('url');
      if (original && img.src !== original) {
        img.src = original;
        img.onerror = null;
        return;
      }
    }
    console.error('[预览加载失败]', img.src);
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999]"
      onClick={onClose}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img
          src={src}
          alt="预览"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg bg-gray-200"
          referrerPolicy="no-referrer"
          onError={handleImageError}
        />
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition"
        >
          <X size={24} />
        </button>
      </div>
    </div>
  );
}