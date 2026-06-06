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

    // 1. 本地相对路径（以 /uploads/ 或 /api/upload 开头）直接使用
    if (src.startsWith('/uploads/') || src.startsWith('/api/upload')) {
      setProxyUrl(src);
      return;
    }

    // 2. 本地开发地址直接使用
    if (src.includes('localhost') || src.includes('127.0.0.1')) {
      setProxyUrl(src);
      return;
    }

    // 3. 云存储公开 URL（包含 /uploads/ 的绝对路径）直接使用
    //    这包括 R2 默认域名或自定义 CDN 域名下的图片
    if (src.includes('/uploads/')) {
      setProxyUrl(src);
      return;
    }

    // 4. 其他外部图片，走代理（防止防盗链、跨域等问题）
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
          unoptimized
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