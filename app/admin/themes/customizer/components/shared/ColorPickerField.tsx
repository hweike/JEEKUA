// app/admin/themes/customizer/components/shared/ColorPickerField.tsx
'use client';

import ColorPicker from './ColorPicker';

interface ColorPickerFieldProps {
  /** 显示标签 */
  label: string;
  /** 当前颜色值 */
  value: string;
  /** 颜色变化回调 */
  onChange: (color: string) => void;
  /** 可选：是否禁用 */
  disabled?: boolean;
}

export default function ColorPickerField({
  label,
  value,
  onChange,
  disabled = false,
}: ColorPickerFieldProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-700">{label}</label>
      <ColorPicker
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}