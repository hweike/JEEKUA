'use client';

import { useState, useCallback, memo, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';
import ImageUpload from '@/components/ImageUpload';

const SUPPORTED_LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
];

// 单个列项编辑器
const ColumnItemEditor = memo(({ item, index, isOpen, onToggle, onFieldChange, onRemove, currentLocale }: any) => {
  const [localTitle, setLocalTitle] = useState(item.title?.[currentLocale] || '');
  const [localDesc, setLocalDesc] = useState(item.description?.[currentLocale] || '');
  const [localButtonLabel, setLocalButtonLabel] = useState(item.buttonLabel?.[currentLocale] || '');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(item.title?.[currentLocale] || '');
    setLocalDesc(item.description?.[currentLocale] || '');
    setLocalButtonLabel(item.buttonLabel?.[currentLocale] || '');
  }, [item.title, item.description, item.buttonLabel, currentLocale]);

  const syncTextField = (field: 'title' | 'description' | 'buttonLabel', text: string) => {
    const newLangObj = { ...(item[field] || {}) };
    newLangObj[currentLocale] = text;
    onFieldChange(index, field, newLangObj);
  };

  const handleTitleBlur = () => syncTextField('title', localTitle);
  const handleDescBlur = () => syncTextField('description', localDesc);
  const handleButtonBlur = () => syncTextField('buttonLabel', localButtonLabel);
  const handleFieldChange = (field: string, val: any) => onFieldChange(index, field, val);
  const handleLinkBlur = () => {
    if (linkInputRef.current) onFieldChange(index, 'buttonLink', linkInputRef.current.value);
  };

  return (
    <div className="border border-border rounded-md bg-background mb-3">
      <div
        className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">内容列 {index + 1}</span>
          {item.title?.[currentLocale] && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              ({item.title[currentLocale]})
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
          {/* 图片 */}
          <div>
            <label className="block text-xs font-medium mb-1">图片</label>
            <ImageUpload
              value={item.imageUrl || ''}
              onChange={(url) => handleFieldChange('imageUrl', url)}
              maxCount={1}
              label=""
              hint="支持上传本地图片或输入网络图片地址"
              previewAspectRatio="16:9"
            />
          </div>
          {/* 标题 */}
          <div>
            <label className="block text-xs font-medium mb-1">标题 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="输入标题"
            />
          </div>
          {/* 描述 */}
          <div>
            <label className="block text-xs font-medium mb-1">描述 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <textarea
              value={localDesc}
              onChange={(e) => setLocalDesc(e.target.value)}
              onBlur={handleDescBlur}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="输入描述"
            />
          </div>
          {/* 链接标签 */}
          <div>
            <label className="block text-xs font-medium mb-1">链接标签 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localButtonLabel}
              onChange={(e) => setLocalButtonLabel(e.target.value)}
              onBlur={handleButtonBlur}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="按钮文字"
            />
          </div>
          {/* 链接 */}
          <div>
            <label className="block text-xs font-medium mb-1">链接</label>
            <input
              type="text"
              ref={linkInputRef}
              defaultValue={item.buttonLink || ''}
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
ColumnItemEditor.displayName = 'ColumnItemEditor';

export function MulticolumnListField({ value = [], onChange }: any) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentLocale, setCurrentLocale] = useState('zh');

  // 初始化语言：从 localStorage 读取全局语言
  useEffect(() => {
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (stored && (stored === 'zh' || stored === 'en')) {
      setCurrentLocale(stored);
    }
  }, []);

  // 监听全局语言切换事件
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setCurrentLocale(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleAdd = () => {
    if (value.length >= 9) return;
    const newItem = {
      id: nanoid(),
      imageUrl: '',
      title: { zh: '', en: '', textId: nanoid() },
      description: { zh: '', en: '', textId: nanoid() },
      buttonLabel: { zh: '', en: '', textId: nanoid() },
      buttonLink: '',
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

  return (
    <div className="space-y-3">
      {/* 标题栏：只保留标签和添加按钮（语言选择器已移除） */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">内容列管理</label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={value.length >= 9}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} /> 添加列
        </button>
      </div>

      {/* 内容列列表 */}
      <div className="max-h-[600px] overflow-y-auto pr-1">
        {value.map((item: any, index: number) => (
          <ColumnItemEditor
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
      {value.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">暂无内容列，点击“添加列”开始添加</div>
      )}
    </div>
  );
}