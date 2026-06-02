// components/webbuilder/fields/RangeField.tsx
'use client';

export function RangeField({ value, onChange, min, max, step, label, unit = '%' }: any) {
  const displayValue = value !== undefined && value !== null ? value : 0;
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label} ({displayValue}{unit})
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={displayValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </div>
  );
}