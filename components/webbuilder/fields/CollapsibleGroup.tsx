'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useMemo } from 'react';
import { ColorPickerField } from './ColorPickerField';
import { BackgroundImageField } from './BackgroundImageField';
import { refreshPuckPreview } from '@/lib/webbuilder/refresh-preview';

interface CollapsibleGroupProps {
  field: any;
  name: string;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
}

export function CollapsibleGroup({
  field,
  name,
  value,
  onChange,
  readOnly = false,
}: CollapsibleGroupProps) {
  const [isOpen, setIsOpen] = useState(field.defaultOpen !== false);
  const safeValue = value || {};

  const renderField = (fieldName: string, fieldConfig: any) => {
    const fieldValue = safeValue[fieldName] ?? fieldConfig.default;

    if (fieldConfig.type === 'number' && fieldConfig.suffix) {
      return (
        <div key={fieldName} className="space-y-1">
          {fieldConfig.label && (
            <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
          )}
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={fieldConfig.min}
              max={fieldConfig.max}
              step={1}
              value={fieldValue ?? ''}
              onChange={(e) => {
                const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                onChange({ ...safeValue, [fieldName]: isNaN(val as any) ? undefined : val });
              }}
              disabled={readOnly}
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">{fieldConfig.suffix}</span>
          </div>
          {fieldConfig.description && <p className="text-xs text-gray-500">{fieldConfig.description}</p>}
        </div>
      );
    }

    if (fieldConfig.type === 'number') {
      return (
        <div key={fieldName} className="space-y-1">
          {fieldConfig.label && (
            <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
          )}
          <input
            type="number"
            min={fieldConfig.min}
            max={fieldConfig.max}
            step={fieldConfig.step || 1}
            value={fieldValue ?? ''}
            onChange={(e) => {
              const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
              onChange({ ...safeValue, [fieldName]: isNaN(val as any) ? undefined : val });
            }}
            disabled={readOnly}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {fieldConfig.description && <p className="text-xs text-gray-500">{fieldConfig.description}</p>}
        </div>
      );
    }

    if (fieldConfig.type === 'text') {
      return (
        <div key={fieldName} className="space-y-1">
          {fieldConfig.label && (
            <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
          )}
          <input
            type="text"
            placeholder={fieldConfig.placeholder}
            value={fieldValue ?? ''}
            onChange={(e) => onChange({ ...safeValue, [fieldName]: e.target.value })}
            disabled={readOnly}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {fieldConfig.description && <p className="text-xs text-gray-500">{fieldConfig.description}</p>}
        </div>
      );
    }

    if (fieldConfig.type === 'radio') {
      return (
        <div key={fieldName} className="space-y-2">
          {fieldConfig.label && (
            <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
          )}
          <div className="flex flex-wrap gap-2">
            {fieldConfig.options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                
                  onChange({ ...safeValue, [fieldName]: opt.value });
                  refreshPuckPreview();
                }}
                disabled={readOnly || opt.disabled}
                className={`
                  px-3 py-1.5 text-sm rounded-md transition-colors
                  ${fieldValue === opt.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                  ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {fieldConfig.description && <p className="text-xs text-gray-500">{fieldConfig.description}</p>}
        </div>
      );
    }

    if (fieldConfig.type === 'button-group') {
      return (
        <div key={fieldName} className="space-y-2">
          {fieldConfig.label && (
            <label className="block text-sm font-medium text-gray-700">{fieldConfig.label}</label>
          )}
          <div className="flex flex-wrap gap-2">
            {fieldConfig.options.map((opt: any) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                
                  if (!opt.disabled) {
                    onChange({ ...safeValue, [fieldName]: opt.value });
                    refreshPuckPreview();
                  }
                }}
                disabled={readOnly || opt.disabled}
                title={opt.tooltip || opt.label}
                className={`
                  px-3 py-1.5 text-sm rounded-md transition-colors
                  ${fieldValue === opt.value ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}
                  ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {fieldConfig.description && <p className="text-xs text-gray-500">{fieldConfig.description}</p>}
        </div>
      );
    }

    if (fieldConfig.type === 'color-picker') {
      return (
        <ColorPickerField
          key={fieldName}
          field={fieldConfig}
          value={fieldValue}
          onChange={(val) => onChange({ ...safeValue, [fieldName]: val })}
          readOnly={readOnly}
        />
      );
    }

    if (fieldConfig.type === 'background-image') {
      return (
        <BackgroundImageField
          key={fieldName}
          field={fieldConfig}
          value={fieldValue}
          onChange={(val) => onChange({ ...safeValue, [fieldName]: val })}
          readOnly={readOnly}
        />
      );
    }

    return null;
  };

  const fieldsContent = useMemo(() => {
    if (!field.objectFields) return null;
    return Object.entries(field.objectFields)
      .filter(([_, subField]: [string, any]) => {
        if (typeof subField.showIf === 'function') return subField.showIf(safeValue);
        return true;
      })
      .map(([subName, subField]: [string, any]) => renderField(subName, subField));
  }, [field.objectFields, safeValue, readOnly]);

  return (
    <div className="border-b border-gray-200 last:border-b-0 py-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full py-2 px-1 hover:bg-gray-50 rounded-md transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">{field.label || name}</span>
        {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && <div className="pl-3 pr-1 py-1 space-y-3">{fieldsContent}</div>}
    </div>
  );
}