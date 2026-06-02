// components/front/hooks/useProductFilters.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export type SortOption = 'title-asc' | 'title-desc' | 'price-asc' | 'price-desc' | 'created-asc' | 'created-desc';
export type AvailabilityFilter = 'in-stock' | 'out-of-stock' | null;
export type PriceRangeFilter = { min: number | null; max: number | null };

export interface FilterState {
  sort: SortOption;
  availability: AvailabilityFilter;
  priceRange: PriceRangeFilter;
}

const SORT_MAP: Record<SortOption, { column: string; order: 'ASC' | 'DESC' }> = {
  'title-asc': { column: 'product_name', order: 'ASC' },
  'title-desc': { column: 'product_name', order: 'DESC' },
  'price-asc': { column: 'first_price', order: 'ASC' },
  'price-desc': { column: 'first_price', order: 'DESC' },
  'created-asc': { column: 'createdAt', order: 'ASC' },
  'created-desc': { column: 'createdAt', order: 'DESC' },
};

export function useProductFilters(defaultSort: SortOption = 'title-asc') {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<FilterState>(() => ({
    sort: (searchParams.get('sort') as SortOption) || defaultSort,
    availability: (searchParams.get('availability') as AvailabilityFilter) || null,
    priceRange: {
      min: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : null,
      max: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : null,
    },
  }));

  const getDBFilters = useCallback(() => {
    const sortConfig = SORT_MAP[filters.sort];
    return {
      availability: filters.availability,
      minPrice: filters.priceRange.min,
      maxPrice: filters.priceRange.max,
      sortColumn: sortConfig.column,
      sortOrder: sortConfig.order,
    };
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.sort && filters.sort !== defaultSort) params.set('sort', filters.sort);
    if (filters.availability) params.set('availability', filters.availability);
    if (filters.priceRange.min) params.set('minPrice', filters.priceRange.min.toString());
    if (filters.priceRange.max) params.set('maxPrice', filters.priceRange.max.toString());
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [filters, router, pathname, defaultSort]);

  const getApiUrl = useCallback((baseUrl: string) => {
    const sortConfig = SORT_MAP[filters.sort];
    const url = new URL(baseUrl, window.location.origin);
    if (filters.availability) url.searchParams.set('availability', filters.availability);
    if (filters.priceRange.min) url.searchParams.set('minPrice', filters.priceRange.min.toString());
    if (filters.priceRange.max) url.searchParams.set('maxPrice', filters.priceRange.max.toString());
    url.searchParams.set('sortColumn', sortConfig.column);
    url.searchParams.set('sortOrder', sortConfig.order);
    return url.toString();
  }, [filters]);

  return { filters, updateFilters, getDBFilters, getApiUrl };
}