'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useCustomer } from '@/lib/account/useCustomer';
import LanguageSwitcher from './LanguageSwitcher';
import SearchButton from './SearchButton';

interface RightToolsProps {
  showSearch?: boolean;
  searchPlaceholder?: string;
  showLanguageSelector?: boolean;
  locale: string;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const OPACITY_TRANSITION = `opacity var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function RightTools({
  showSearch = true,
  searchPlaceholder = 'Search...',
  showLanguageSelector = true,
  locale,
}: RightToolsProps) {
  const [mounted, setMounted] = useState(false);
  const { customer, isLoading } = useCustomer();

  useEffect(() => {
    setMounted(true);
  }, []);

  const renderUserEntry = () => {
    if (!mounted) {
      return <div className="w-8 h-8" />;
    }

    if (isLoading) {
      return (
        <div
          className="w-8 h-8 rounded-full animate-pulse"
          style={{ backgroundColor: 'var(--muted, #f1f5f9)' }}
        />
      );
    }

    if (customer) {
      const user = customer as { name?: string; email?: string };
      const displayName = user.name || user.email || '';
      const initial = displayName.charAt(0).toUpperCase() || 'U';

      return (
        <Link
          href={`/${locale}/account`}
          className="flex items-center hover:opacity-80"
          title={displayName}
          style={{
            gap: 'var(--spacing-1, 0.25rem)',
            transition: OPACITY_TRANSITION,
          }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center hover:ring-2"
            style={{
              backgroundColor: 'var(--primary, #1e293b)',
              color: 'var(--primary-foreground, #f8fafc)',
              fontSize: 'var(--font-size-sm, 0.875rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              // ring 颜色通过 CSS 变量控制
              // hover:ring-2 使用 --ring 变量
            }}
          >
            {initial}
          </div>
        </Link>
      );
    }

    return (
      <Link
        href={`/${locale}/login`}
        style={{
          color: 'var(--navbar-text, var(--foreground, #0f172a))',
          transition: COLOR_TRANSITION,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--navbar-hover-text, var(--primary, #1e293b))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--navbar-text, var(--foreground, #0f172a))';
        }}
      >
        <User className="w-5 h-5" />
      </Link>
    );
  };

  return (
    <div
      className="flex items-center"
      style={{ gap: 'var(--spacing-2, 0.5rem)' }}
    >
      {showSearch && <SearchButton placeholder={searchPlaceholder} />}
      {showLanguageSelector && <LanguageSwitcher />}
      {renderUserEntry()}
    </div>
  );
}