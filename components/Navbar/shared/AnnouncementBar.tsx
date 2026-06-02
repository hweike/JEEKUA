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
      className="w-full h-[40px] flex items-center justify-center text-sm overflow-hidden"
      style={{
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {current.link ? (
        <a href={current.link} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {current.text}
        </a>
      ) : (
        <span>{current.text}</span>
      )}
    </div>
  );
}