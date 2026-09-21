'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { getImageUrl } from '@/lib/files/url';

interface BrandItemProps {
  imageUrl: string;
  imageWidth: number;
  imageAlign: 'left' | 'center' | 'right';
  siteName: string;
}

export default function BrandItem({
  imageUrl,
  imageWidth = 200,
  imageAlign,
  siteName,
}: BrandItemProps) {
  const locale = useLocale();
  const homeUrl = `/${locale}`;
  const [imageError, setImageError] = useState(false);

  // ✅ 显式映射，避免 Tailwind 动态类名失效
  // 移动端统一居中，md 及以上按配置对齐
  const alignClass = {
    left: 'justify-center md:justify-start',
    center: 'justify-center md:justify-center',
    right: 'justify-center md:justify-end',
  }[imageAlign] || 'justify-center md:justify-start';

  // ✅ 文字样式
  const textStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xl, 1.25rem)',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--footer-text, var(--foreground, #0f172a))',
  };

  // ✅ 图片宽度：来自数据库配置，缺失时回退 200
  const safeWidth = imageWidth || 200;

  // ✅ 图片样式：桌面用 safeWidth，移动端按约 0.7（视口 70%）缩小，且不超出容器
  const imgStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: `min(${safeWidth}px, 70vw)`,
    height: 'auto',
  };

  return (
    <div className={`flex ${alignClass}`}>
      <Link href={homeUrl} className="inline-block max-w-full">
        {imageUrl && !imageError ? (
          <img
            src={getImageUrl(imageUrl)}
            alt={siteName}
            style={imgStyle}
            className="h-auto object-contain"
            onError={() => setImageError(true)}
          />
        ) : (
          <span style={textStyle}>{siteName}</span>
        )}
      </Link>
    </div>
  );
}