// app/admin/discovery/seo/hooks/useSEOData.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { GenerationStatus } from '../../../components/StatusBadge';
import type { PageListItem, Language } from '../types';

const PAGE_SIZE = 50;

interface UseSEODataOptions {
  initialLocale?: string;
}

export function useSEOData(options: UseSEODataOptions = {}) {
  const { initialLocale = 'zh' } = options;

  // 数据状态
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 筛选与分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLocale, setSelectedLocale] = useState(initialLocale);
  const [filterStatus, setFilterStatus] = useState<GenerationStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // 语言列表
  const [languages, setLanguages] = useState<Language[]>([]);

  // 加载语言列表
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

  // 加载页面列表
  const loadPages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        pageSize: String(PAGE_SIZE),
        locale: selectedLocale,
        status: filterStatus,
        type: filterType,
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
  }, [currentPage, selectedLocale, filterStatus, filterType, searchQuery]);

  // 重置分页并刷新
  const refreshWithReset = useCallback(() => {
    setCurrentPage(1);
    // 在 useEffect 中会触发 loadPages
  }, []);

  // 当筛选条件变化时重置分页
  const handleLocaleChange = (locale: string) => {
    setSelectedLocale(locale);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: GenerationStatus | 'all') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  const handleTypeChange = (type: string) => {
    setFilterType(type);
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

  // 自动加载
  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // 初始化加载语言
  useEffect(() => {
    loadLanguages();
  }, [loadLanguages]);

  // 类型选项
  const typeOptions = useMemo(() => {
    const types = Array.from(new Set(pages.map((p) => p.type)));
    return types.map((type) => ({
      key: type,
      label: type,
    }));
  }, [pages]);

  return {
    // 数据
    pages,
    total,
    totalPages,
    loading,
    error,
    setError,

    // 筛选与分页
    currentPage,
    selectedLocale,
    filterStatus,
    filterType,
    searchQuery,
    PAGE_SIZE,

    // 语言
    languages,

    // 操作
    loadPages,
    refreshWithReset,
    goToPage,
    handleLocaleChange,
    handleStatusChange,
    handleTypeChange,
    handleSearchChange,

    // 工具
    typeOptions,
    setSelectedIds: () => {}, // 由父组件管理
  };
}