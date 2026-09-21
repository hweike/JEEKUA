// app/admin/themes/customizer/components/shared/RangeSlider.tsx
'use client';

interface RangeSliderProps {
  /** 当前值 */
  value: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 步长 */
  step?: number;
  /** 单位后缀（如 'rem'、'px'、'ms'） */
  unit?: string;
  /** 值变化回调 */
  onChange: (value: number) => void;
  /** 可选：显示在值旁的额外信息 */
  label?: string;
  /** 可选：是否禁用 */
  disabled?: boolean;
}

export default function RangeSlider({
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
  label,
  disabled = false,
}: RangeSliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) onChange(val);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {label && <span className="text-sm text-gray-600">{label}</span>}
        <span className="text-sm font-medium text-gray-800">
          {value}
          {unit && ` ${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      />
    </div>
  );
}