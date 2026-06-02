'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProxyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  sizes?: string;
  priority?: boolean;
  referrerPolicy?: React.HTMLAttributes<HTMLImageElement>['referrerPolicy'];
}

export default function ProxyImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  sizes,
  priority = false,
  referrerPolicy = 'no-referrer',
}: ProxyImageProps) {
  const [proxyUrl, setProxyUrl] = useState<string>(src);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) return;
    // 如果是本地已上传的图片（以 /uploads/ 开头），不需要代理
    if (src.startsWith('/uploads/') || src.startsWith('/api/upload') || src.includes('localhost') || src.includes('127.0.0.1')) {
      setProxyUrl(src);
      return;
    }
    // 其他外部图片，走代理
    setProxyUrl(`/api/proxy-image?url=${encodeURIComponent(src)}`);
  }, [src]);

  if (error) {
    // 降级：显示占位图
    return (
      <div className={`bg-gray-100 flex items-center justify-center ${className}`} style={{ width, height }}>
        <span className="text-gray-400 text-sm">图片加载失败</span>
      </div>
    );
  }

  if (fill) {
    return (
      <div className="relative w-full h-full">
        <Image
          src={proxyUrl}
          alt={alt}
          fill
          className={className}
          sizes={sizes}
          priority={priority}
          unoptimized // 因为已经是代理，可以直接使用原生优化？为了性能不再次优化，可去掉
          onError={() => setError(true)}
          referrerPolicy={referrerPolicy}
        />
      </div>
    );
  }

  return (
    <Image
      src={proxyUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      onError={() => setError(true)}
      referrerPolicy={referrerPolicy}
    />
  );
}