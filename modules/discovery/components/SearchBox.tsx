// modules/discovery/components/SearchBox.tsx
'use client';
import { useState, useEffect } from 'react';
import FlexSearch from 'flexsearch';

export default function SearchBox({ locale }: { locale: string }) {
  const [index, setIndex] = useState<any>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/discovery/search-index?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        const idx = new FlexSearch.Index({ tokenize: 'full' });
        data.forEach((item: any) => idx.add(item.id, item.title + ' ' + item.content));
        setIndex(idx);
        // 存储文档内容以备显示
        window.__searchDocs = data;
      });
  }, [locale]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (val && index) {
      const ids = index.search(val);
      const docs = (window as any).__searchDocs || [];
      setResults(docs.filter((doc: any) => ids.includes(doc.id)));
    } else {
      setResults([]);
    }
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder="搜索..."
        value={query}
        onChange={handleSearch}
        className="border rounded px-3 py-2 w-64"
      />
      {results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-white border rounded shadow-lg max-h-60 overflow-auto z-10">
          {results.map((res) => (
            <a key={res.id} href={res.url} className="block p-2 hover:bg-gray-100">
              <div className="font-medium">{res.title}</div>
              <div className="text-xs text-gray-500">{res.url}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}