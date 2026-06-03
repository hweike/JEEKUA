// app/admin/discovery/search/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

interface Language {
  code: string;
  name: string;
}

export default function SearchAdminPage() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [locale, setLocale] = useState('zh');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 获取语言列表
  useEffect(() => {
    fetch('/api/languages/enabled')
      .then(res => res.json())
      .then(data => {
        const langs = data.map((lang: any) => ({
          code: lang.code,
          name: lang.zhName,
        }));
        setLanguages(langs);
        if (langs.length > 0 && !langs.find((l: Language) => l.code === locale)) {
          setLocale(langs[0].code);
        }
      })
      .catch(console.error);
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/discovery/search?q=${encodeURIComponent(query)}&locale=${locale}`);
      const data = await res.json();
      setResults(data);
      setSearched(true);
    } catch (error) {
      console.error(error);
      alert('搜索失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">全站搜索测试</h1>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <select
          value={locale}
          onChange={(e) => setLocale(e.target.value)}
          className="border rounded px-3 py-2 text-sm w-32"
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </select>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入关键词..."
            className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
            {loading ? '搜索中...' : '搜索'}
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-8">加载中...</div>}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">未找到相关结果</div>
      )}

      {results.length > 0 && (
        <div className="space-y-4">
          {results.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 hover:shadow transition">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-medium text-blue-600 hover:underline"
              >
                {item.title}
              </a>
              <div className="text-sm text-gray-500 mt-1">{item.url}</div>
              <div className="text-sm text-gray-700 mt-2 line-clamp-2">{item.content}</div>
              <div className="text-xs text-gray-400 mt-2">
                最后更新: {new Date(item.updatedAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}