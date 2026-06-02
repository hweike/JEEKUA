'use client';

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';
import { ColorPickerField } from './ColorPickerField';

const SUPPORTED_LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

const RangeSlider = ({ value, min, max, onChange }) => (
  <div className="flex items-center gap-2">
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="flex-1"
    />
    <span className="text-xs w-12 text-right">{value}px</span>
  </div>
);

// 单选按钮组（是/否）
const RadioGroup = ({ value, onChange }) => (
  <div className="flex gap-4">
    <label className="flex items-center gap-1 text-xs">
      <input type="radio" checked={value === true} onChange={() => onChange(true)} /> 是
    </label>
    <label className="flex items-center gap-1 text-xs">
      <input type="radio" checked={value === false} onChange={() => onChange(false)} /> 否
    </label>
  </div>
);

// 单个列表项编辑器
const ListItemEditor = memo(({ item, index, isOpen, onToggle, onFieldChange, onRemove, currentLocale }: any) => {
  const [localText, setLocalText] = useState(item.text?.[currentLocale] || '');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalText(item.text?.[currentLocale] || '');
  }, [item.text, currentLocale]);

  const syncText = useCallback((text: string) => {
    const newLangObj = { ...(item.text || {}) };
    newLangObj[currentLocale] = text;
    onFieldChange(index, 'text', newLangObj);
  }, [index, item.text, currentLocale, onFieldChange]);

  const handleTextBlur = () => syncText(localText);
  const handleFieldChange = (field: string, val: any) => onFieldChange(index, field, val);
  const handleLinkBlur = () => {
    if (linkInputRef.current) onFieldChange(index, 'link', linkInputRef.current.value);
  };

  return (
    <div className="border border-border rounded-md bg-background mb-3">
      <div
        className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">列表项 {index + 1}</span>
          {item.text?.[currentLocale] && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              ({item.text[currentLocale]})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 pt-2 space-y-4 border-t border-border">
          {/* 项目文本 */}
          <div>
            <label className="block text-xs font-medium mb-1">项目文本 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={handleTextBlur}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder={`输入项目文本 (${currentLocale === 'zh' ? '中文' : '英文'})`}
            />
          </div>

          {/* 文本颜色 */}
          <div>
            <label className="block text-xs font-medium mb-1">文本颜色</label>
            <ColorPickerField
              field={{}}
              value={item.textColor || '#000000'}
              onChange={(v) => handleFieldChange('textColor', v)}
            />
          </div>

          {/* 文字大小 */}
          <div>
            <label className="block text-xs font-medium mb-1">文字大小 ({item.fontSize || 16}px)</label>
            <RangeSlider
              value={item.fontSize ?? 16}
              min={8}
              max={50}
              onChange={(v) => handleFieldChange('fontSize', v)}
            />
          </div>

          {/* 文本对齐 */}
          <div>
            <label className="block text-xs font-medium mb-1">文本对齐</label>
            <select
              value={item.textAlign || 'left'}
              onChange={(e) => handleFieldChange('textAlign', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            >
              <option value="left">左对齐</option>
              <option value="center">居中</option>
              <option value="right">右对齐</option>
            </select>
          </div>

          {/* 文本样式：加粗、斜体、下划线 */}
          <div>
            <label className="block text-xs font-medium mb-1">加粗</label>
            <RadioGroup value={item.bold} onChange={(v) => handleFieldChange('bold', v)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">斜体</label>
            <RadioGroup value={item.italic} onChange={(v) => handleFieldChange('italic', v)} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">下划线</label>
            <RadioGroup value={item.underline} onChange={(v) => handleFieldChange('underline', v)} />
          </div>

          {/* 链接 */}
          <div>
            <label className="block text-xs font-medium mb-1">链接</label>
            <input
              type="text"
              ref={linkInputRef}
              defaultValue={item.link || ''}
              onBlur={handleLinkBlur}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="https:// 或相对路径"
            />
          </div>
        </div>
      )}
    </div>
  );
});
ListItemEditor.displayName = 'ListItemEditor';

export function ListField({ value = [], onChange }: any) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentLocale, setCurrentLocale] = useState('zh');

  const handleAdd = () => {
    const newItem = {
      id: nanoid(),
      text: { zh: '', en: '', textId: nanoid() },
      textColor: '#000000',
      fontSize: 16,
      textAlign: 'left',
      bold: false,
      italic: false,
      underline: false,
      link: '',
    };
    onChange([...value, newItem]);
    setOpenIndex(value.length);
  };

  const handleRemove = (index: number) => {
    const newList = value.filter((_: any, i: number) => i !== index);
    onChange(newList);
    if (openIndex === index) setOpenIndex(null);
    else if (openIndex !== null && openIndex > index) setOpenIndex(openIndex - 1);
  };

  const handleFieldChange = (index: number, key: string, val: any) => {
    const newList = value.map((item: any, i: number) => i === index ? { ...item, [key]: val } : item);
    onChange(newList);
  };

  const handleToggle = (index: number) => {
    setOpenIndex(prev => prev === index ? null : index);
  };

  const handleLocaleChange = (newLocale: string) => {
    setCurrentLocale(newLocale);
    localStorage.setItem('webbuilder_edit_locale', newLocale);
    window.dispatchEvent(new StorageEvent('storage', { key: 'webbuilder_edit_locale', newValue: newLocale }));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">列表项目</label>
        <select
          value={currentLocale}
          onChange={(e) => handleLocaleChange(e.target.value)}
          className="px-2 py-1 border border-input rounded-md text-sm bg-background"
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </select>
      </div>

      {/* 添加列表项按钮 - 虚线边框，位于列表项列表上方 */}
      <button
        type="button"
        onClick={handleAdd}
        className="w-full py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-1 text-sm"
      >
        <Plus size={16} /> 添加列表项
      </button>

      <div className="max-h-[600px] overflow-y-auto pr-1">
        {value.map((item: any, index: number) => (
          <ListItemEditor
            key={item.id}
            item={item}
            index={index}
            isOpen={openIndex === index}
            onToggle={handleToggle}
            onFieldChange={handleFieldChange}
            onRemove={handleRemove}
            currentLocale={currentLocale}
          />
        ))}
      </div>
    </div>
  );
}