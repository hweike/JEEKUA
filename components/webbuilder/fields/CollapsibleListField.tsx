'use client';

import { useState, memo, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';

// 图标选项列表（基于提供的 option 值）
const ICON_OPTIONS = [
  { value: 'none', label: '无' },
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉' },
  { value: 'bottle', label: '瓶子' },
  { value: 'box', label: '箱子' },
  { value: 'carrot', label: '胡萝卜' },
  { value: 'chat_bubble', label: '聊天泡泡' },
  { value: 'check_mark', label: '复选标记' },
  { value: 'clipboard', label: '剪贴板' },
  { value: 'dairy', label: '乳制品' },
  { value: 'dairy_free', label: '不食乳制品' },
  { value: 'dryer', label: '吹风机' },
  { value: 'eye', label: '眼睛' },
  { value: 'fire', label: '火' },
  { value: 'gluten_free', label: '无麸质' },
  { value: 'heart', label: '心形' },
  { value: 'iron', label: '铁' },
  { value: 'leaf', label: '树叶' },
  { value: 'leather', label: '皮革' },
  { value: 'lightning_bolt', label: '闪电束' },
  { value: 'lipstick', label: '口红' },
  { value: 'lock', label: '锁' },
  { value: 'map_pin', label: '图钉' },
  { value: 'nut_free', label: '不含坚果' },
  { value: 'pants', label: '裤装' },
  { value: 'paw_print', label: '爪印' },
  { value: 'pepper', label: '胡椒粉' },
  { value: 'perfume', label: '香水' },
  { value: 'plane', label: '飞机' },
  { value: 'plant', label: '绿植' },
  { value: 'price_tag', label: '价格标签' },
  { value: 'question_mark', label: '问号' },
  { value: 'recycle', label: '回收利用' },
  { value: 'return', label: '退货' },
  { value: 'ruler', label: '直尺' },
  { value: 'serving_dish', label: '餐盘' },
  { value: 'shirt', label: '衬衫' },
  { value: 'shoe', label: '鞋' },
  { value: 'silhouette', label: '剪影' },
  { value: 'snowflake', label: '雪花' },
  { value: 'star', label: '星星' },
  { value: 'stopwatch', label: '秒表' },
  { value: 'truck', label: '卡车' },
  { value: 'washing', label: '洗涤剂' },
];

// 单个可折叠行编辑器
const CollapsibleItemEditor = memo(({ item, index, isOpen, onToggle, onFieldChange, onRemove, currentLocale }: any) => {
  const [localTitle, setLocalTitle] = useState(item.title?.[currentLocale] || '');
  const [localContent, setLocalContent] = useState(item.content?.[currentLocale] || '');

  useEffect(() => {
    setLocalTitle(item.title?.[currentLocale] || '');
    setLocalContent(item.content?.[currentLocale] || '');
  }, [item.title, item.content, currentLocale]);

  const syncTextField = (field: 'title' | 'content', text: string) => {
    const newLangObj = { ...(item[field] || {}) };
    newLangObj[currentLocale] = text;
    onFieldChange(index, field, newLangObj);
  };

  const handleTitleBlur = () => syncTextField('title', localTitle);
  const handleContentBlur = () => syncTextField('content', localContent);
  const handleFieldChange = (field: string, val: any) => onFieldChange(index, field, val);

  return (
    <div className="border border-border rounded-md bg-background mb-3">
      <div
        className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">折叠项 {index + 1}</span>
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
          {/* 标题（多语言） */}
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
          {/* 图标选择 */}
          <div>
            <label className="block text-xs font-medium mb-1">图标</label>
            <select
              value={item.icon || 'none'}
              onChange={(e) => handleFieldChange('icon', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
            >
              {ICON_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {/* 内容（多语言） */}
          <div>
            <label className="block text-xs font-medium mb-1">内容 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <textarea
              value={localContent}
              onChange={(e) => setLocalContent(e.target.value)}
              onBlur={handleContentBlur}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="输入内容"
            />
          </div>
        </div>
      )}
    </div>
  );
});
CollapsibleItemEditor.displayName = 'CollapsibleItemEditor';

export function CollapsibleListField({ value = [], onChange }: any) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [currentLocale, setCurrentLocale] = useState('zh');

  useEffect(() => {
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (stored && (stored === 'zh' || stored === 'en')) setCurrentLocale(stored);
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setCurrentLocale(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const handleAdd = () => {
    // 最多10行（可调整）
    if (value.length >= 10) return;
    const newItem = {
      id: nanoid(),
      title: { zh: '', en: '', textId: nanoid() },
      icon: 'none',
      content: { zh: '', en: '', textId: nanoid() },
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">可折叠行管理</label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={value.length >= 10}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} /> 添加折叠项
        </button>
      </div>
      <div className="max-h-[600px] overflow-y-auto pr-1">
        {value.map((item: any, index: number) => (
          <CollapsibleItemEditor
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
        <div className="text-center py-4 text-gray-400 text-sm">暂无折叠项，点击“添加折叠项”开始添加</div>
      )}
    </div>
  );
}