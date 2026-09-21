'use client';
import { useEffect, useState } from 'react';

interface Announcement {
  id: string;
  text: string;
  link?: string;
}

export default function AnnouncementBar({ items }: { items: Announcement[] }) {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (items.length <= 1 || isHovered) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [items.length, isHovered]);

  if (!items.length) return null;

  const current = items[index];
  return (
    <div
      className="w-full flex items-center justify-center overflow-hidden"
      style={{
        // ✅ 高度：标准化硬编码（不进入主题系统）
        height: '40px',
        // ✅ 字号
        fontSize: 'var(--font-size-sm, 0.875rem)',
        // ✅ 字重
        fontWeight: 'var(--font-weight-medium, 500)',
        // ✅ 字间距
        letterSpacing: 'var(--letter-spacing-wide, 0.025em)',
        // ✅ 内边距
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        // ✅ 颜色：三层兜底（主题 → 基础变量 → 硬编码）
        backgroundColor: 'var(--announcement-bg, var(--popover, #ffffff))',
        color: 'var(--announcement-text, var(--popover-foreground, #0f172a))',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {current.link ? (
        <a
          href={current.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
          style={{
            transition: `color var(--transition-duration-200, 200ms) var(--transition-timing-ease, ease)`,
          }}
        >
          {current.text}
        </a>
      ) : (
        <span>{current.text}</span>
      )}
    </div>
  );
}