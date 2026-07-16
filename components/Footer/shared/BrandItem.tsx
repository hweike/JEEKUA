'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getImageUrl } from '@/lib/files/url'; // 公共函数

interface BrandItemProps {
  imageUrl: string;
  imageWidth: number;
  imageAlign: 'left' | 'center' | 'right';
  siteName: string;
}

export default function BrandItem({ imageUrl, imageWidth, imageAlign, siteName }: BrandItemProps) {
  const locale = useLocale();
  const homeUrl = `/${locale}`;
  
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  }[imageAlign] || 'justify-start';
  
  return (
    <div className={`flex ${alignClass}`}>
      <Link href={homeUrl} className="inline-block">
        {imageUrl ? (
          <img 
            src={getImageUrl(imageUrl)} // 使用公共函数转换
            alt={siteName} 
            width={imageWidth} 
            height="auto"
            className="h-auto object-contain"
            onError={(e) => {
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