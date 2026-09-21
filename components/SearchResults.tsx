'use client';

import Link from 'next/link';
import { Package, FileText, Newspaper, BookOpen, Video } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { getImageUrl } from '@/lib/files/url';

interface SearchResult {
  id: string;
  title: string;
  url: string;
  type: string;
  content_summary?: string;
  cover_image?: string;
  updatedAt?: string;
}

interface SearchResultsProps {
  results: SearchResult[];
  locale: string;
}

// ---- 类型 → 图标/颜色映射（label 走 i18n，这里只放图标和颜色） ----
const TYPE_META: Record<
  string,
  { Icon: any; color: string; bg: string }
> = {
  product:  { Icon: Package,   color: 'var(--search-type-product, #2563eb)', bg: 'var(--search-type-product-bg, #eff6ff)' },
  page:     { Icon: FileText,  color: 'var(--search-type-page, #16a34a)',    bg: 'var(--search-type-page-bg, #f0fdf4)' },
  blogPost: { Icon: Newspaper, color: 'var(--search-type-blog, #ea580c)',    bg: 'var(--search-type-blog-bg, #fff7ed)' },
  doc:      { Icon: BookOpen,  color: 'var(--search-type-doc, #7c3aed)',     bg: 'var(--search-type-doc-bg, #f5f3ff)' },
  video:    { Icon: Video,     color: 'var(--search-type-video, #dc2626)',   bg: 'var(--search-type-video-bg, #fef2f2)' },
};

function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find(p => p.type === t)?.value || '00';
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

export default function SearchResults({ results, locale }: SearchResultsProps) {
  const t = useTranslations('Search');

  if (results.length === 0) return null;

  const cardBg = 'var(--search-result-bg, var(--card))';
  const cardBorder = 'var(--search-result-border, var(--border))';
  const cardRadius = 'var(--search-result-radius, var(--radius))';
  const titleColor = 'var(--search-result-title, var(--foreground))';
  const titleHoverColor = 'var(--search-result-title-hover, var(--primary))';
  const metaColor = 'var(--search-result-meta, var(--muted-foreground))';
  const excerptColor = 'var(--search-result-excerpt, #0f172a)';
  const imageRadius = 'var(--search-image-radius, var(--radius))';

  return (
    <div className="space-y-6">
      {results.map((result) => {
        const summary = stripHtml(result.content_summary || '');
        const imgSrc = result.cover_image ? getImageUrl(result.cover_image) : '';
        const dateStr = formatDate(result.updatedAt);
        const meta = TYPE_META[result.type];
        const Icon = meta?.Icon;
        // ✅ 多语言标签
        const typeLabel = meta ? t(`types.${result.type}`) : result.type;

        const href = result.url
          ? (result.url.startsWith('http')
              ? result.url
              : `/${locale}${result.url.startsWith('/') ? '' : '/'}${result.url}`)
          : '#';

        return (
          <div
            key={result.id}
            className="group transition-all duration-200"
            style={{
              backgroundColor: cardBg,
              border: `1px solid ${cardBorder}`,
              borderRadius: cardRadius,
              padding: '1rem',
            }}
          >
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div className="flex items-start gap-4">
                {imgSrc && (
                  <img
                    src={imgSrc}
                    alt={result.title}
                    className="w-24 h-24 object-cover flex-shrink-0"
                    style={{ borderRadius: imageRadius }}
                    loading="lazy"
                  />
                )}

                <div className="flex-1 min-w-0">
                  {meta && Icon && (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full mb-1"
                      style={{ color: meta.color, backgroundColor: meta.bg }}
                    >
                      <Icon size={12} />
                      {typeLabel}
                    </span>
                  )}

                  <h3
                    className="text-lg font-semibold line-clamp-2"
                    style={{ color: titleColor }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = titleHoverColor)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = titleColor)}
                  >
                    {result.title}
                  </h3>

                  {summary && (
                    <p
                      className="text-sm mt-1 line-clamp-2"
                      style={{ color: excerptColor }}
                    >
                      {summary}
                    </p>
                  )}

                  {dateStr && (
                    <p
                      className="text-xs mt-2"
                      style={{ color: metaColor }}
                    >
                      {dateStr}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}