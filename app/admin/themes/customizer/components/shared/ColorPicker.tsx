// app/admin/themes/customizer/components/shared/ColorPicker.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { HexColorPicker } from 'react-colorful';

interface ColorPickerProps {
  /** 当前颜色值（十六进制字符串，如 "#ffffff"） */
  value: string;
  /** 颜色变化回调（仅当 editable 为 true 时生效） */
  onChange?: (color: string) => void;
  /** 是否可编辑（true 表示可点击选择，false 表示只读预览） */
  editable?: boolean;
  /** 可选：额外的 CSS 类名 */
  className?: string;
  /** 可选：色块大小，默认 w-8 h-8 */
  size?: 'sm' | 'md' | 'lg';
}

/** 透明棋盘格（SVG data URI，兼容性好） */
const TRANSPARENT_CHECKERBOARD: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23d1d5db'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23d1d5db'/%3E%3C/svg%3E")`,
  backgroundSize: '8px 8px',
};

export default function ColorPicker({
  value,
  onChange,
  editable = true,
  className = '',
  size = 'sm',
}: ColorPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭选择器
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = () => {
    if (editable) {
      setShowPicker(!showPicker);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  // ✅ 判断是否有值
  const hasValue = value !== '' && value !== undefined && value !== null;

  // ✅ 有值时用背景色，无值时用透明棋盘格
  const colorStyle: React.CSSProperties = hasValue
    ? { backgroundColor: value }
    : TRANSPARENT_CHECKERBOARD;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <div
        className={`
          ${sizeClasses[size]} rounded border shadow-sm transition-colors
          ${editable ? 'cursor-pointer hover:border-blue-400' : 'cursor-default'}
        `}
        style={colorStyle}
        onClick={handleToggle}
        title={editable ? '点击选择颜色' : `颜色值: ${value || '未设置'}`}
      />
      {showPicker && editable && (
        <div
          className="absolute z-50 bg-white p-3 rounded-lg shadow-xl border"
          style={{
            right: 0,
            bottom: 'calc(100% + 8px)', // 向上弹出
          }}
        >
          <HexColorPicker color={value || '#ffffff'} onChange={onChange!} />
        </div>
      )}
    </div>
  );
}