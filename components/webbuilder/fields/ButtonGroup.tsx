// components/webbuilder/fields/ButtonGroup.tsx
'use client';

import React from 'react';

interface ButtonGroupOption {
  label: string;
  value: string;
  disabled?: boolean;
  tooltip?: string;
}

interface ButtonGroupProps {
  field: {
    label?: string;
    options: ButtonGroupOption[];
  };
  value: string;
  onChange: (value: string) => void;
}

export function ButtonGroup({ field, value, onChange }: ButtonGroupProps) {
  return (
    <div className="space-y-1.5">
      {/* 左侧标签，如“宽度”或“高度” */}
      {field.label && (
        <label className="block text-sm font-medium text-gray-700">
          {field.label}
        </label>
      )}
      
      {/* 按钮组 */}
      <div className="flex flex-wrap gap-1">
        {field.options.map((option) => {
          const isSelected = value === option.value;
          
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => !option.disabled && onChange(option.value)}
              disabled={option.disabled}
              title={option.tooltip || option.label}
              className={`
                px-3 py-1.5 text-sm rounded-md transition-colors
                ${isSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
                ${option.disabled
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
                }
              `}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}