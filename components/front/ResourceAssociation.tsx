'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RelatedResourcesProps {
  productId: string;
  locale: string;
}

interface ResourceItem {
  id: string;
  title?: string;
  slug?: string;
  url?: string;
  thumbnail?: string;
  sortOrder: number;
  locale?: string;
}

// ============================================================
// 公共样式常量
// ============================================================
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const SHADOW_TRANSITION = `box-shadow var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

export default function RelatedResources({ productId, locale }: RelatedResourcesProps) {
  const [resources, setResources] = useState<{
    blogs: ResourceItem[];
    documents: ResourceItem[];
    videos: ResourceItem[];
  }>({ blogs: [], documents: [], videos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/front/products/${productId}/related-resources?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const filtered = {
          blogs: (data.blogs || []).filter((item: ResourceItem) => !item.locale || item.locale === locale),
          documents: (data.documents || []).filter((item: ResourceItem) => !item.locale || item.locale === locale),
          videos: (data.videos || []).filter((item: ResourceItem) => !item.locale || item.locale === locale),
        };
        setResources(filtered);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch related resources:', err);
        setLoading(false);
      });
  }, [productId, locale]);

  if (loading) {
    return (
      <div
        className="animate-pulse"
        style={{
          height: '5rem',
          backgroundColor: 'var(--muted, #f1f5f9)',
          borderRadius: 'var(--radius, 0.625rem)',
        }}
      />
    );
  }

  const hasAny = resources.blogs.length > 0 || resources.documents.length > 0 || resources.videos.length > 0;
  if (!hasAny) return null;

  // 公共卡片样式
  const cardStyle: React.CSSProperties = {
    display: 'block',
    padding: 'var(--spacing-3, 0.75rem)',
    border: `1px solid var(--border, #e2e8f0)`,
    borderRadius: 'var(--radius, 0.625rem)',
    transition: SHADOW_TRANSITION,
    backgroundColor: 'var(--background, #ffffff)',
    color: 'var(--foreground, #0f172a)',
    textDecoration: 'none',
  };

  const cardTitleStyle: React.CSSProperties = {
    fontWeight: 'var(--font-weight-medium, 500)',
    color: 'var(--foreground, #0f172a)',
  };

  const cardMetaStyle: React.CSSProperties = {
    fontSize: 'var(--font-size-xs, 0.75rem)',
    color: 'var(--muted-foreground, #64748b)',
  };

  const handleCardEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.boxShadow = 'var(--shadow-sm, 0 1px 3px 0 rgb(0 0 0 / 0.1))';
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div
      style={{
        marginTop: 'var(--spacing-8, 2rem)',
        paddingTop: 'var(--spacing-6, 1.5rem)',
        borderTop: `1px solid var(--border, #e2e8f0)`,
      }}
    >
      <h2
        style={{
          fontSize: 'var(--font-size-xl, 1.25rem)',
          fontWeight: 'var(--font-weight-semibold, 600)',
          marginBottom: 'var(--spacing-4, 1rem)',
          color: 'var(--foreground, #0f172a)',
        }}
      >
        相关资源
      </h2>
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        style={{ gap: 'var(--spacing-4, 1rem)' }}
      >
        {/* 博客 */}
        {resources.blogs.map(blog => (
          <Link
            key={blog.id}
            href={`/${locale}/blog/${blog.slug}`}
            style={cardStyle}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            <h3 style={cardTitleStyle}>{blog.title}</h3>
            <span style={cardMetaStyle}>博客文章</span>
          </Link>
        ))}
        {/* 文档 */}
        {resources.documents.map(doc => (
          <a
            key={doc.id}
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            style={cardStyle}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            <h3 style={cardTitleStyle}>{doc.title}</h3>
            <span style={cardMetaStyle}>文档下载</span>
          </a>
        ))}
        {/* 视频 */}
        {resources.videos.map(video => (
          <Link
            key={video.id}
            href={`/${locale}/videos/${video.slug}`}
            style={cardStyle}
            onMouseEnter={handleCardEnter}
            onMouseLeave={handleCardLeave}
          >
            {video.thumbnail && (
              <img
                src={video.thumbnail}
                alt=""
                className="w-full object-cover"
                style={{
                  height: '6rem',
                  borderRadius: 'var(--radius, 0.625rem)',
                  marginBottom: 'var(--spacing-2, 0.5rem)',
                }}
              />
            )}
            <h3 style={cardTitleStyle}>{video.title}</h3>
            <span style={cardMetaStyle}>视频</span>
          </Link>
        ))}
      </div>
    </div>
  );
}