// components/front/FilterSidebar.tsx
'use client';

export default function FilterSidebar({ filters, updateFilters, total }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-medium mb-3">库存状态</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.availability === 'in-stock'} onChange={() => updateFilters({ availability: filters.availability === 'in-stock' ? null : 'in-stock' })} />
            <span>有货</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={filters.availability === 'out-of-stock'} onChange={() => updateFilters({ availability: filters.availability === 'out-of-stock' ? null : 'out-of-stock' })} />
            <span>无货</span>
          </label>
        </div>
      </div>
      <div>
        <h3 className="font-medium mb-3">价格区间</h3>
        <div className="flex items-center gap-2">
          <input type="number" placeholder="最低价" value={filters.priceRange.min ?? ''} onChange={e => updateFilters({ priceRange: { ...filters.priceRange, min: e.target.value ? Number(e.target.value) : null } })} className="border rounded p-2 w-24" />
          <span>至</span>
          <input type="number" placeholder="最高价" value={filters.priceRange.max ?? ''} onChange={e => updateFilters({ priceRange: { ...filters.priceRange, max: e.target.value ? Number(e.target.value) : null } })} className="border rounded p-2 w-24" />
        </div>
      </div>
    </div>
  );
}