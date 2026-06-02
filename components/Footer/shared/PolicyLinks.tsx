'use client';

import Link from 'next/link';
import { useLocale } from 'next-intl';

// 政策链接列表（可根据需要扩展或从配置读取）
const policyLinks = [
  { key: 'privacy', label: 'Privacy Policy', path: '/privacy' },
  { key: 'terms', label: 'Terms of Service', path: '/terms' },
  { key: 'shipping', label: 'Shipping Policy', path: '/shipping' },
  { key: 'returns', label: 'Returns Policy', path: '/returns' },
];

export default function PolicyLinks() {
  const locale = useLocale();
  
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
      {policyLinks.map((link) => (
        <Link
          key={link.key}
          href={`/${locale}${link.path}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {link.label}
        </Link>
      ))}
    </div>
  );
}