'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface MegaPanelProps {
  item: any;
  pathname: string;
  locale: string;
  navbarBottom: number;
}

export default function MegaPanel({ item, pathname, locale, navbarBottom }: MegaPanelProps) {
  const [open, setOpen] = useState(false);
  const hoverTimer = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setOpen(true);
  };
  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    };
  }, []);

  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        className="text-base font-medium transition-colors duration-200 hover:bg-[var(--navbar-hover-bg)] hover:text-[var(--navbar-hover-text)] rounded-md px-3 py-2"
        style={{ color: 'var(--navbar-text, var(--foreground))' }}
      >
        {item.label}
      </button>
      {open && (
        <div
          className="fixed left-0 w-screen z-50 shadow-xl"
          style={{
            top: `${navbarBottom}px`, // 从导航栏底部开始
            backgroundColor: 'var(--navbar-bg, var(--background))',
            color: 'var(--navbar-text, var(--foreground))',
            borderBottomLeftRadius: '12px',
            borderBottomRightRadius: '12px',
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* 面板内容示例 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="font-semibold mb-3">精选分类</h3>
                <ul className="space-y-2">
                  <li><Link href="/collections/new" className="text-sm hover:text-primary">新品上市</Link></li>
                  <li><Link href="/collections/best-sellers" className="text-sm hover:text-primary">畅销榜</Link></li>
                  <li><Link href="/collections/sale" className="text-sm hover:text-primary">限时特惠</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">技术支持</h3>
                <ul className="space-y-2">
                  <li><Link href="/docs" className="text-sm hover:text-primary">文档中心</Link></li>
                  <li><Link href="/videos" className="text-sm hover:text-primary">视频教程</Link></li>
                  <li><Link href="/inquiry" className="text-sm hover:text-primary">询盘支持</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">关于我们</h3>
                <ul className="space-y-2">
                  <li><Link href="/about" className="text-sm hover:text-primary">公司简介</Link></li>
                  <li><Link href="/contact" className="text-sm hover:text-primary">联系方式</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-3">特别推荐</h3>
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-sm">限时优惠，全场低至5折</p>
                  <Link href="/promo" className="text-sm text-primary hover:underline mt-2 inline-block">查看详情 →</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}