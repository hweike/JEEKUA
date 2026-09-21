// app/admin/themes/customizer/components/shared/SelectInput.tsx
'use client';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps {
  /** 当前选中的值 */
  value: string;
  /** 选项列表 */
  options: SelectOption[];
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 可选：占位文本或分组标签 */
  placeholder?: string;
  /** 可选：额外的 CSS 类名 */
  className?: string;
  /** 可选：是否禁用 */
  disabled?: boolean;
}

export default function SelectInput({
  value,
  options,
  onChange,
  placeholder = '请选择',
  className = '',
  disabled = false,
}: SelectInputProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`
        border rounded px-3 py-2 w-full text-sm
        ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
        ${className}
      `}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}