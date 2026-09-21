'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X } from 'lucide-react';

interface SearchFormProps {
  initialValue: string;
  locale: string;
}

export default function SearchForm({ initialValue, locale }: SearchFormProps) {
  const t = useTranslations('Search');
  const [query, setQuery] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/${locale}/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleClear = () => {
    setQuery('');
    router.push(`/${locale}/search`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('placeholder')}
          className="w-full px-4 py-3 pl-12 pr-10 rounded-full border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>
      <button
        type="submit"
        className="px-6 py-3 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors font-medium whitespace-nowrap"
      >
        {t('submit')}
      </button>
    </form>
  );
}