'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function LanguageSelector({ currentLocale }: { currentLocale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const locales = [
    { code: 'zh', name: '中文' },
    { code: 'en', name: 'English' },
    { code: 'de', name: 'Deutsch' },
  ];

  const handleChange = (locale: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('locale', locale);
    // 保留当前的 category 参数
    router.push(`/admin/videosys?${params.toString()}`);
  };

  return (
    <select
      value={currentLocale}
      onChange={(e) => handleChange(e.target.value)}
      className="border rounded px-2 py-1 text-sm"
    >
      {locales.map((loc) => (
        <option key={loc.code} value={loc.code}>
          {loc.name}
        </option>
      ))}
    </select>
  );
}