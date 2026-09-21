'use client';

interface EditableColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export default function EditableColorPicker({ label, value, onChange }: EditableColorPickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex items-center gap-3 py-1.5 hover:bg-gray-50 rounded px-1">
      <span className="text-sm text-gray-700 w-28 truncate" title={label}>
        {label}
      </span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={handleChange}
          className="w-8 h-8 p-0 border-2 border-gray-300 rounded cursor-pointer hover:border-blue-400 transition"
          title="点击选择颜色"
        />
        <span className="text-xs text-gray-400">{value || '未设置'}</span>
      </div>
    </div>
  );
}