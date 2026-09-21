'use client';

import React, { useMemo, useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface DocTocProps {
  /** Markdown 原文（或 HTML） */
  content: string;
  /** 主题变量 */
  theme?: {
    titleColor?: string;
    textColor?: string;
    activeColor?: string;
    hoverColor?: string;
    borderColor?: string;
  };
}

/**
 * 从 Markdown 里提取 `##` / `###` 标题
 * 生成 id 采用与 react-markdown 一致的 slug 规则（小写、空格转 -、去特殊字符）
 */
function extractTocFromMarkdown(markdown: string): TocItem[] {
  if (!markdown) return [];
  const lines = markdown.split('\n');
  const items: TocItem[] = [];
  const slugCount: Record<string, number> = {};

  const makeSlug = (raw: string): string => {
    let slug = raw
      .trim()
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
      .replace(/\s+/g, '-');
    // 去重
    if (slugCount[slug] !== undefined) {
      slugCount[slug] += 1;
      slug = `${slug}-${slugCount[slug]}`;
    } else {
      slugCount[slug] = 0;
    }
    return slug;
  };

  for (const line of lines) {
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length as 2 | 3;
    const text = match[2].trim();
    items.push({ id: makeSlug(text), text, level });
  }
  return items;
}

export default function DocToc({ content, theme }: DocTocProps) {
  const items = useMemo(() => extractTocFromMarkdown(content), [content]);

  const [activeId, setActiveId] = useState<string>('');

  // ============================================================
  // 滚动监听：高亮当前可见的标题
  // ============================================================
  useEffect(() => {
    if (items.length === 0) return;

    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);

    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -70% 0px',
        threshold: 0,
      }
    );

    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  const titleColor  = theme?.titleColor  ?? 'var(--doc-sidebar-group-label-color, var(--foreground, #17181c))';
  const textColor   = theme?.textColor   ?? 'var(--doc-sidebar-text, var(--foreground, #263238))';
  const activeColor = theme?.activeColor ?? 'var(--doc-sidebar-active-text, #17181c)';
  const hoverColor  = theme?.hoverColor  ?? 'var(--doc-sidebar-hover-text, #17181c)';
  const borderColor = theme?.borderColor ?? 'var(--doc-sidebar-border, var(--border, #edeef3))';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
      setActiveId(id);
    }
  };

  return (
    <nav
      aria-label="On this page"
      style={{
        paddingTop: 'var(--spacing-4, 1rem)',
        paddingBottom: 'var(--spacing-4, 1rem)',
        borderLeft: `1px solid ${borderColor}`,
        paddingLeft: 'var(--spacing-4, 1rem)',
      }}
    >
      <div
        style={{
          fontSize: 'var(--font-size-xs, 0.75rem)',
          fontWeight: 'var(--font-weight-semibold, 600)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--letter-spacing-wide, 0.025em)',
          color: titleColor,
          marginBottom: 'var(--spacing-3, 0.75rem)',
        }}
      >
        On this page
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {items.map((item) => {
          const isActive = activeId === item.id;
          return (
            <li
              key={item.id}
              style={{
                marginBottom: 'var(--spacing-1, 0.25rem)',
                paddingLeft: item.level === 3 ? 'var(--spacing-3, 0.75rem)' : 0,
              }}
            >
              <a
                href={`#${item.id}`}
                onClick={(e) => handleClick(e, item.id)}
                style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm, 14px)',
                  lineHeight: 'var(--line-height-normal, 1.5)',
                  color: isActive ? activeColor : textColor,
                  fontWeight: isActive
                    ? 'var(--font-weight-semibold, 600)'
                    : 'var(--font-weight-normal, 400)',
                  textDecoration: 'none',
                  transition:
                    'color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.color = hoverColor;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.color = textColor;
                }}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}