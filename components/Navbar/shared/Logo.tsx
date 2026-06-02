'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { HeaderConfig } from '@/lib/config-loader';

interface LogoProps {
  logoConfig: HeaderConfig['logo'];
  siteName: string;
}

export default function Logo({ logoConfig, siteName }: LogoProps) {
  const locale = useLocale();
  const homeUrl = `/${locale}`;
  const logoSrc = logoConfig.imageUrl;
  const width = logoConfig.width || 120;
  
  // 根据位置设置对齐类
  const positionClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    'middle-left': 'justify-start',
    'middle-right': 'justify-end',
  }[logoConfig.position] || 'justify-start';
  
  const mobilePositionClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[logoConfig.mobilePosition] || 'justify-start';
  
  return (
    <div className={`flex ${positionClass} md:${mobilePositionClass} items-center`}>
      <Link href={homeUrl} className="flex items-center">
        {logoSrc ? (
          <img 
            src={logoSrc} 
            alt={siteName} 
            width={width} 
            height="auto"
            className="h-auto object-contain"
            onError={(e) => {
              // 图片加载失败时隐藏图片并显示文本
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                const fallbackSpan = document.createElement('span');
                fallbackSpan.className = 'text-xl font-semibold';
                fallbackSpan.textContent = siteName;
                parent.appendChild(fallbackSpan);
              }
            }}
          />
        ) : (
          <span className="text-xl font-semibold">{siteName}</span>
        )}
      </Link>
    </div>
  );
}