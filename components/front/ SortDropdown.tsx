// components/front/SortDropdown.tsx
'use client';
import { SortOption } from './hooks/useProductFilters';

export default function SortDropdown({ value, onChange }: { value: SortOption; onChange: (val: SortOption) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as SortOption)} className="border rounded p-2 text-sm bg-white">
      <option value="title-asc">按字母顺序，A-Z</option>
      <option value="title-desc">按字母顺序，Z-A</option>
      <option value="price-asc">价格，从低到高</option>
      <option value="price-desc">价格，从高到低</option>
      <option value="created-asc">日期，从旧到新</option>
      <option value="created-desc">日期，从新到旧</option>
    </select>
  );
}