'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function AutoLanguageDetector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // 检查 cookie 中是否已有用户选择
    const hasUserSelected = document.cookie.includes('user_selected_language=true');
    if (hasUserSelected) return;

    // 否则调用推荐 API
    fetch('/api/language/recommend')
      .then(res => res.json())
      .then(data => {
        const recommended = data.recommendedLocale;
        if (recommended && recommended !== currentLocale) {
          // 切换语言
          const newPathname = pathname.replace(`/${currentLocale}`, `/${recommended}`);
          document.cookie = `NEXT_LOCALE=${recommended}; path=/`;
          document.cookie = `user_selected_language=false; path=/`; // 标记为自动推荐
          router.push(newPathname);
        }
      })
      .catch(console.error);
  }, [currentLocale, pathname, router]);

  return null;
}