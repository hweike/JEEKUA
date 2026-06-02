'use client';

import { useState, useEffect, useRef } from 'react';
import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaYoutube,
  FaGlobe,
} from 'react-icons/fa';

interface AnnouncementItem {
  id: string;
  text: string;
  link?: string;
  icon?: string;
}

interface SocialLink {
  platform: string;
  url: string;
}

interface LuxuryAnnouncementBarProps {
  items: AnnouncementItem[];
  socialLinks: SocialLink[];
  hidden?: boolean;
}

const platformIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FaFacebook,
  twitter: FaTwitter,
  instagram: FaInstagram,
  youtube: FaYoutube,
};

interface Language {
  code: string;
  nativeName: string;
  zhName: string;
}

export default function LuxuryAnnouncementBar({ items, socialLinks, hidden = false }: LuxuryAnnouncementBarProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasMultiple = items.length > 1;

  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLocale, setCurrentLocale] = useState<string>('zh');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => setLanguages(data))
      .catch(err => console.error('Failed to load languages:', err));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const segments = path.split('/').filter(Boolean);
      const first = segments[0];
      if (languages.some(lang => lang.code === first)) {
        setCurrentLocale(first);
      } else {
        setCurrentLocale('zh');
      }
    }
  }, [languages]);

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setDropdownOpen(true);
  };
  const handleMouseLeave = () => {
    hoverTimerRef.current = setTimeout(() => setDropdownOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % items.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  useEffect(() => {
    if (isPlaying && hasMultiple) {
      timerRef.current = setInterval(nextSlide, 5000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isPlaying, hasMultiple, items.length]);

  const handleLocaleChange = (newLocale: string) => {
    if (newLocale === currentLocale) return;
    document.cookie = `user_selected_language=true; path=/; max-age=31536000`;
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/`;
    const currentPath = window.location.pathname;
    const targetPath = currentPath.replace(`/${currentLocale}`, `/${newLocale}`);
    window.location.href = targetPath;
  };

  if (!items || items.length === 0) return null;

  const current = items[currentIndex];
  const currentLang = languages.find(lang => lang.code === currentLocale)?.nativeName || currentLocale;

  return (
    <div
      className="transition-transform duration-300 ease-in-out"
      style={{
        backgroundColor: 'var(--popover)',
        color: 'var(--popover-foreground)',
        transform: hidden ? 'translateY(-100%)' : 'translateY(0)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-4">
        {/* 左侧社交图标 */}
        <div className="hidden lg:flex items-center gap-4">
          {socialLinks.slice(0, 5).map((link) => {
            const platform = link.platform.toLowerCase();
            const Icon = platformIconMap[platform] || FaGlobe;
            return (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-white/70 transition-colors"
                aria-label={link.platform}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>

        {/* 中间轮播公告 - 无左右箭头 */}
        <div className="flex-1 flex justify-center relative max-w-[40%] mx-auto">
          <div className="flex items-center gap-2 text-sm text-white">
            {current.link ? (
              <a href={current.link} className="hover:underline">
                {current.text}
              </a>
            ) : (
              <span>{current.text}</span>
            )}
          </div>
        </div>

        {/* 右侧多语言下拉菜单 */}
        <div className="hidden lg:flex items-center relative">
          <button
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="flex items-center gap-1 text-sm focus:outline-none"
            style={{ color: 'var(--popover-foreground)' }}
          >
            {currentLang}
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {dropdownOpen && (
            <div
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="absolute right-0 w-48 rounded-t-lg shadow-lg overflow-hidden"
              style={{
                top: '100%',
                marginTop: '-1px',
                backgroundColor: 'var(--popover)',
                color: 'var(--popover-foreground)',
                borderTop: 'none',
                zIndex: 60,
              }}
            >
              <div className="py-1">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLocaleChange(lang.code)}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                      currentLocale === lang.code
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    {lang.nativeName} ({lang.code})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}