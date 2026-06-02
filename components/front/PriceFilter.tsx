'use client';

interface PriceFilterProps {
  minPrice: number | '';
  maxPrice: number | '';
  onMinChange: (value: number | '') => void;
  onMaxChange: (value: number | '') => void;
}

export default function PriceFilter({ 
  minPrice, 
  maxPrice, 
  onMinChange, 
  onMaxChange 
}: PriceFilterProps) {
  return (
    <div className="flex gap-2 items-center">
      <input
        type="number"
        placeholder="最低价"
        value={minPrice}
        onChange={(e) => onMinChange(e.target.value ? Number(e.target.value) : '')}
        className="border rounded px-3 py-2 text-sm w-28"
      />
      <span>-</span>
      <input
        type="number"
        placeholder="最高价"
        value={maxPrice}
        onChange={(e) => onMaxChange(e.target.value ? Number(e.target.value) : '')}
        className="border rounded px-3 py-2 text-sm w-28"
      />
    </div>
  );
}