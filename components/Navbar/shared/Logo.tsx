'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useState } from 'react';
import { HeaderConfig } from '@/lib/config-loader';
import { getImageUrl } from '@/lib/files/url';

interface LogoProps {
  logoConfig: HeaderConfig['logo'];
  siteName: string;
}

export default function Logo({ logoConfig, siteName }: LogoProps) {
  const locale = useLocale();
  const homeUrl = `/${locale}`;
  const logoSrc = logoConfig.imageUrl;
  const width = logoConfig.width || 120;
  const [imageError, setImageError] = useState(false);

  // 根据位置设置对齐类
  const positionClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'middle-left': 'justify-start',
    'middle-right': 'justify-end',
    'middle-center': 'justify-center',
    'top-center': 'justify-center',
  }[logoConfig.position] || 'justify-start';

  const mobilePositionClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[logoConfig.mobilePosition] || 'justify-start';

  // ✅ 文字样式（从主题变量读取，带 fallback）
  const textStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xl, 1.25rem)',
    fontWeight: 'var(--font-weight-semibold, 600)',
    color: 'var(--navbar-text, var(--foreground, #0f172a))',
  };

  return (
    <div className={`flex ${positionClass} items-center`}>
      <Link href={homeUrl} className="flex items-center">
        {logoSrc && !imageError ? (
          <img
            src={getImageUrl(logoSrc)}
            alt={siteName}
            width={width}
            height="auto"
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