// components/DetectLanguage.tsx
'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function DetectLanguage() {
  const pathname = usePathname();

  useEffect(() => {
    // 仅在无 cookie 且当前路径没有语言前缀时执行（避免无限循环）
    const hasLocalePrefix = /^\/(zh|en|ja|de|fr|es|ru|ar)/.test(pathname);
    if (!hasLocalePrefix && !document.cookie.includes('preferred_language')) {
      fetch('/api/detect-language')
        .then(res => res.json())
        .then(data => {
          const detected = data.locale;
          if (detected) {
            document.cookie = `preferred_language=${detected}; path=/; max-age=31536000`;
            // 重定向到首页（不带路径）
            window.location.href = `/${detected}`;
          }
        })
        .catch(err => console.error('Language detection failed:', err));
    }
  }, [pathname]);

  return null;
}