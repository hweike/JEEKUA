// components/front/PageThemeStyle.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// ✅ 模块级缓存：跨路由共享
const cssCache = new Map<string, string>();

export default function PageThemeStyle() {
  const pathname = usePathname();
  const [css, setCss] = useState('');

  useEffect(() => {
    // 跳过路径
    if (
      !pathname ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/webbuilder') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/uploads')
    ) {
      setCss('');
      return;
    }

    // ✅ 缓存命中
    const cached = cssCache.get(pathname);
    if (cached !== undefined) {
      setCss(cached);
      return;
    }

    // ✅ 请求新 CSS
    const controller = new AbortController();
    fetch(`/api/themes/page-css?path=${encodeURIComponent(pathname)}`, {
      signal: controller.signal,
    })
      .then(res => res.text())
      .then(text => {
        if (!controller.signal.aborted) {
          cssCache.set(pathname, text);
          setCss(text);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setCss('');
        }
      });

    return () => controller.abort();
  }, [pathname]);

  if (!css) return null;

  return (
    <style
      id="page-theme-style"
      dangerouslySetInnerHTML={{ __html: css }}
    />
  );
}