'use client';
import { useEffect } from 'react';

// 需要 RTL 的语言列表（可根据需要扩展）
const rtlLocales = ['ar', 'he', 'fa', 'ur', 'yi'];

export default function RtlSupport({ locale }: { locale: string }) {
  useEffect(() => {
    const dir = rtlLocales.includes(locale) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    // 添加 CSS 类以便样式适配
    document.documentElement.classList.toggle('rtl', dir === 'rtl');
  }, [locale]);

  return null;
}