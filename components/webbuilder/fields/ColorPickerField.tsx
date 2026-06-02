// components/webbuilder/fields/ColorPickerField.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerFieldProps {
  field: {
    label?: string;
    placeholder?: string;
  };
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export function ColorPickerField({
  field,
  value,
  onChange,
  readOnly = false,
}: ColorPickerFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 处理点击外部区域关闭选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="space-y-1.5">
      {field.label && (
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
        </label>
      )}
      <div className="relative" ref={popoverRef}>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            disabled={readOnly}
            className="w-10 h-10 rounded-md border border-gray-300 shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: value || '#ffffff' }}
          />
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || '#ffffff'}
            disabled={readOnly}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
        {isOpen && !readOnly && (
          <div className="absolute z-50 mt-2 p-3 bg-white rounded-lg shadow-xl border">
            <HexColorPicker color={value || '#ffffff'} onChange={onChange} />
          </div>
        )}
      </div>
      {field.placeholder && (
        <p className="text-xs text-gray-500">{field.placeholder}</p>
      )}
    </div>
  );
}