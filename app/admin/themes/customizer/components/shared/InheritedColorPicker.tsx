'use client';

import ColorPicker from './ColorPicker';

interface InheritedColorPickerProps {
  label: string;
  globalValue: string;
  currentValue: string;
  isInheritable: boolean;
  onOverride: (value: string) => void;
  onReset: () => void;
}

/** 透明棋盘格（SVG data URI，兼容性好） */
const TRANSPARENT_CHECKERBOARD: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='%23d1d5db'/%3E%3Crect x='4' y='4' width='4' height='4' fill='%23d1d5db'/%3E%3C/svg%3E")`,
  backgroundSize: '8px 8px',
};

export default function InheritedColorPicker({
  label,
  globalValue,
  currentValue,
  isInheritable,
  onOverride,
  onReset,
}: InheritedColorPickerProps) {
  const hasGlobalValue =
    globalValue !== '' && globalValue !== undefined && globalValue !== null;

  return (
    <div className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded px-1">
      <span className="text-sm w-28 truncate" title={label}>
        {label}
      </span>

      <div className="flex items-center gap-3 flex-1 justify-end">
        {isInheritable ? (
          <>
            <span className="text-xs text-gray-500 whitespace-nowrap">全局</span>
            {hasGlobalValue ? (
              <ColorPicker value={globalValue} editable={false} />
            ) : (
              <div
                className="w-8 h-8 rounded border shadow-sm flex-shrink-0"
                style={TRANSPARENT_CHECKERBOARD}
                title="透明（未设置）"
              />
            )}
          </>
        ) : (
          <span className="text-xs text-gray-400 italic whitespace-nowrap">
            全局无此变量
          </span>
        )}

        <span className="text-xs text-gray-500 whitespace-nowrap">页面</span>
        <ColorPicker value={currentValue} onChange={onOverride} editable={true} />

        {currentValue && (
          <button
            onClick={onReset}
            className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5 rounded border border-red-200 hover:bg-red-50 transition flex-shrink-0"
          >
            清空
          </button>
        )}
      </div>
    </div>
  );
}