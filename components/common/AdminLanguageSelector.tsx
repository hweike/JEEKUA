'use client';

import { useState } from 'react';
import { LANGUAGES, getLanguageDisplayName } from '@/lib/languages/config';
import { Check } from 'lucide-react'; // 勾选图标

interface AdminLanguageSelectorProps {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
  className?: string;
}

export default function AdminLanguageSelector({
  currentLocale,
  onLocaleChange,
  className = '',
}: AdminLanguageSelectorProps) {
  const [open, setOpen] = useState(false);

  const currentDisplayName = getLanguageDisplayName(currentLocale, 'zh');

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        className="bg-white border rounded px-3 py-2 text-sm flex items-center gap-2"
      >
        <span>{currentDisplayName}</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 max-h-96 overflow-y-auto bg-white border rounded shadow-lg z-10">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => {
                onLocaleChange(lang.code);
                setOpen(false);
              }}
              className={`flex items-center justify-between w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                currentLocale === lang.code ? 'bg-blue-50 text-blue-700' : ''
              }`}
            >
              <span>{lang.zhName} ({lang.code})</span>
              {currentLocale === lang.code && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}