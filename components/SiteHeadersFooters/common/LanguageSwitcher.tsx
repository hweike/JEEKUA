'use client';

import { useRouter } from 'next/navigation';

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();

  const switchLanguage = (locale: string) => {
    // 更新 URL 参数，触发页面重新加载（服务端重新获取数据）
    const url = new URL(window.location.href);
    url.searchParams.set('locale', locale);
    router.push(url.pathname + url.search);
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={() => switchLanguage('zh')}
        className={`px-3 py-1 rounded ${
          currentLocale === 'zh' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
        }`}
      >
        中文
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`px-3 py-1 rounded ${
          currentLocale === 'en' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border'
        }`}
      >
        English
      </button>
    </div>
  );
}