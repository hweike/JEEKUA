'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  locale: string;
}

export default function SearchPagination({
  currentPage,
  totalPages,
  searchTerm,
  locale,
}: SearchPaginationProps) {
  const t = useTranslations('Search.pagination');

  const buildHref = (page: number) => {
    const params = new URLSearchParams();
    params.set('q', searchTerm);
    if (page > 1) params.set('page', String(page));
    return `/${locale}/search?${params.toString()}`;
  };

  const pages: (number | '...')[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('...');
    pages.push(totalPages);
  }

  // ✅ 拆开 border 简写，避免和 borderColor 混用
  const btnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '2.25rem',
    height: '2.25rem',
    padding: '0 0.5rem',
    borderRadius: 'var(--radius-md, 0.375rem)',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border, #e2e8f0)',
    color: 'var(--foreground, #0f172a)',
    backgroundColor: 'var(--background, #ffffff)',
    fontSize: '0.875rem',
    textDecoration: 'none',
  };

  const activeBtn: React.CSSProperties = {
    ...btnBase,
    backgroundColor: 'var(--primary, #1e293b)',
    color: 'var(--primary-foreground, #ffffff)',
    borderColor: 'var(--primary, #1e293b)',
    fontWeight: 600,
  };

  const disabledBtn: React.CSSProperties = {
    ...btnBase,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <nav
      className="flex items-center justify-center gap-2"
      style={{ marginTop: 'var(--spacing-8, 2rem)', flexWrap: 'wrap' }}
      aria-label="Search pagination"
    >
      {currentPage > 1 ? (
        <Link href={buildHref(currentPage - 1)} style={btnBase}>
          {t('prev')}
        </Link>
      ) : (
        <span style={disabledBtn}>{t('prev')}</span>
      )}

      {pages.map((p, idx) =>
        p === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            style={{ padding: '0 0.25rem', color: 'var(--muted-foreground, #64748b)' }}
          >
            …
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            style={p === currentPage ? activeBtn : btnBase}
          >
            {p}
          </Link>
        )
      )}

      {currentPage < totalPages ? (
        <Link href={buildHref(currentPage + 1)} style={btnBase}>
          {t('next')}
        </Link>
      ) : (
        <span style={disabledBtn}>{t('next')}</span>
      )}
    </nav>
  );
}