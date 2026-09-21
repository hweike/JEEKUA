// app/admin/discovery/seo/hooks/useSEOData.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GenerationStatus } from '../../../components/StatusBadge';
import type { PageListItem, Language } from '../types';
import { PAGE_TYPE_LABELS } from '@/lib/seo/constants';

const PAGE_SIZE = 50;

// 类别与具体类型映射（顺序即下拉显示顺序）
const CATEGORY_TYPE_MAP: Record<string, string[]> = {
  product: ['productLine', 'productCollection', 'product'],
  blog: ['blogCategory', 'blogPost'],
  doc: ['docLibrary', 'doc'],
  video: ['videoCategory', 'video'],
  page: ['home', 'page', 'inquiry', 'policy'],
};

// ✅ 需要查询 global locale 的类型列表
const GLOBAL_LOCALE_TYPES = ['docLibrary'];

interface UseSEODataOptions {
  initialLocale?: string;
}

export function useSEOData(options: UseSEODataOptions = {}) {
  const { initialLocale = 'zh' } = options;

  const [pages, setPages] = useState<PageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLocale, setSelectedLocale] = useState(initialLocale);
  const [filterStatus, setFilterStatus] = useState<GenerationStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [category, setCategoryState] = useState<string | null>('product');

  const [languages, setLanguages] = useState<Language[]>([]);

  const loadLanguages = useCallback(async () => {
    try {
      const res = await fetch('/api/languages/enabled');
      if (!res.ok) throw new Error('加载语言列表失败');
      const data = await res.json();
      setLanguages(data);
      if (data.length > 0 && !initialLocale) {
        setSelectedLocale(data[0].code);
      }
    } catch (err) {
      console.error('加载语言列表失败:', err);
      setLanguages([{ code: 'zh', zhName: '中文', nativeName: '中文' }]);
    }
  }, [initialLocale]);

  const setCategory = (newCategory: string | null) => {
    setCategoryState(newCategory);
    setFilterType('all');
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let typeParam = '';
      if (filterType && filterType !== 'all') {
        typeParam = filterType;
      } else if (category) {
        const types = CATEGORY_TYPE_MAP[category];
        if (types && types.length > 0) {
          typeParam = types.join(',');
        }
      }

      // ✅ 构建 locale 参数：检查是否需要包含 global
      let localeParam = selectedLocale;
      if (typeParam) {
        // 将 typeParam 拆分为数组，检查是否包含需要 global 的类型
        const types = typeParam.split(',');
        const needsGlobal = types.some((t) => GLOBAL_LOCALE_TYPES.includes(t));
        if (needsGlobal) {
          const locales = [selectedLocale, 'global'];
          const uniqueLocales = Array.from(new Set(locales));
          localeParam = uniqueLocales.join(',');
        }
      }

      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        locale: localeParam,
        status: filterStatus,
        type: typeParam,
        keyword: searchQuery,
      });
      const res = await fetch(`/api/discovery/seo/pages?${params.toString()}`);
      if (!res.ok) throw new Error('加载页面列表失败');
      const json = await res.json();
      setPages(json.data || []);
      setTotal(json.pagination?.total || 0);
      setTotalPages(json.pagination?.totalPages || 0);
      return json.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      return [];
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedLocale, filterStatus, filterType, searchQuery, category]);

  const refreshWithReset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handleLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: GenerationStatus | 'all') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  useEffect(() => {
    loadPages();
  }, [loadPages]);

  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  const typeOptions = useMemo(() => {
    if (!category) return [];
    const types = CATEGORY_TYPE_MAP[category] || [];
    return types.map(type => ({
      key: type,
      label: PAGE_TYPE_LABELS[type as keyof typeof PAGE_TYPE_LABELS] || type,
    }));
  }, [category]);

  return {
    pages,
    total,
    totalPages,
    loading,
    error,
    setError,
    currentPage,
    selectedLocale,
    filterStatus,
    filterType,
    searchQuery,
    PAGE_SIZE,
    languages,
    loadPages,
    refreshWithReset,
    goToPage,
    handleLocaleChange,
    handleStatusChange,
    handleTypeChange,
    handleSearchChange,
    category,
    setCategory,
    typeOptions,
  };
}