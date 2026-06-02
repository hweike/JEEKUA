'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { DESKTOP_MENU_ITEMS, SOCIAL_LINKS, LANGUAGES, CURRENCIES } from './constants';

interface MenuDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function LuxuryMenuDrawer({ open, onClose }: MenuDrawerProps) {
  const locale = useLocale();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [showLang, setShowLang] = useState(false);
  const [showCurr, setShowCurr] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setTimeout(() => setVisible(false), 300);
    }
  }, [open]);

  if (!visible) return null;

  const toggleSubmenu = (id: string) => {
    setOpenSubmenu(openSubmenu === id ? null : id);
  };

  const getFullPath = (path: string) => {
    if (path.startsWith('/')) return `/${locale}${path}`;
    return path;
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${open ? 'bg-black/50' : 'bg-black/0 pointer-events-none'}`}
      onClick={onClose}
    >
      <div
        className={`fixed left-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 flex justify-between items-center border-b">
          <span className="text-xl font-semibold">Menu</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" strokeWidth="2" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          {DESKTOP_MENU_ITEMS.map((item) => {
            const hasChildren = item.children && item.children.length > 0;
            const isOpen = openSubmenu === item.id;
            return (
              <div key={item.id} className="mb-2">
                <div
                  className="flex justify-between items-center py-2 cursor-pointer hover:text-primary transition"
                  onClick={() => hasChildren && toggleSubmenu(item.id)}
                >
                  <Link href={getFullPath(item.linkValue)} onClick={onClose} className="text-lg">
                    {item.label}
                  </Link>
                  {hasChildren && (
                    <svg className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M6 9l6 6 6-6" strokeWidth="2" />
                    </svg>
                  )}
                </div>
                {hasChildren && isOpen && (
                  <div className="ml-4 mt-1 space-y-1 border-l pl-2">
                    {item.children!.map((child) => (
                      <Link
                        key={child.id}
                        href={getFullPath(child.linkValue)}
                        onClick={onClose}
                        className="block py-1 text-sm text-gray-600 hover:text-primary transition"
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div className="border-t my-4 pt-4">
            <div className="mb-2">
              <button onClick={() => setShowLang(!showLang)} className="flex items-center gap-2 w-full justify-between py-2 hover:text-primary transition">
                <span>English</span>
                <svg className={`w-4 h-4 transition-transform ${showLang ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9l6 6 6-6" strokeWidth="2" />
                </svg>
              </button>
              {showLang && (
                <div className="ml-4 mt-1 space-y-1">
                  {LANGUAGES.map((lang) => (
                    <a key={lang.code} href="#" className="block py-1 text-sm text-gray-600 hover:text-primary transition">
                      {lang.nativeName}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="mb-2">
              <button onClick={() => setShowCurr(!showCurr)} className="flex items-center gap-2 w-full justify-between py-2 hover:text-primary transition">
                <span>China (USD $)</span>
                <svg className={`w-4 h-4 transition-transform ${showCurr ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M6 9l6 6 6-6" strokeWidth="2" />
                </svg>
              </button>
              {showCurr && (
                <div className="ml-4 mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {CURRENCIES.map((cur) => (
                    <a key={cur.code} href="#" className="block py-1 text-sm text-gray-600 hover:text-primary transition">
                      {cur.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-4">
              {SOCIAL_LINKS.map((link) => (
                <a key={link.platform} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}