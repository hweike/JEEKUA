'use client';

import { useState, memo, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import { nanoid } from 'nanoid';
import ImageUpload from '@/components/ImageUpload';

// ---------- 二级：内容列表项编辑器 ----------
const ContentItemEditor = memo(({ item, onFieldChange, onRemove, currentLocale }: any) => {
  const [localTitle, setLocalTitle] = useState(item.title?.[currentLocale] || '');
  const [localParagraph, setLocalParagraph] = useState(item.paragraph?.[currentLocale] || '');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(item.title?.[currentLocale] || '');
    setLocalParagraph(item.paragraph?.[currentLocale] || '');
  }, [item.title, item.paragraph, currentLocale]);

  const syncTextField = (field: 'title' | 'paragraph', text: string) => {
    const newLangObj = { ...(item[field] || {}), [currentLocale]: text };
    onFieldChange(field, newLangObj);
  };

  const handleTitleBlur = () => syncTextField('title', localTitle);
  const handleParagraphBlur = () => syncTextField('paragraph', localParagraph);
  const handleLinkBlur = () => {
    if (linkInputRef.current) onFieldChange('link', linkInputRef.current.value);
  };

  return (
    <div className="border border-border rounded-md bg-background mb-2">
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">内容项</span>
          {item.title?.[currentLocale] && (
            <span className="text-xs text-muted-foreground truncate max-w-[150px]">
              ({item.title[currentLocale]})
            </span>
          )}
        </div>
        <button type="button" onClick={onRemove} className="text-destructive hover:text-destructive/80">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="p-3 pt-0 space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1">图片</label>
          <ImageUpload
            value={item.imageUrl || ''}
            onChange={(url) => onFieldChange('imageUrl', url)}
            maxCount={1}
            label=""
            hint=""
            previewAspectRatio="16:9"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">标题 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="w-full px-2 py-1 text-xs border border-input rounded-md bg-background"
            placeholder="输入标题"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">段落文本 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
          <textarea
            value={localParagraph}
            onChange={(e) => setLocalParagraph(e.target.value)}
            onBlur={handleParagraphBlur}
            rows={2}
            className="w-full px-2 py-1 text-xs border border-input rounded-md bg-background"
            placeholder="输入段落文本"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">链接</label>
          <input
            type="text"
            ref={linkInputRef}
            defaultValue={item.link || ''}
            onBlur={handleLinkBlur}
            className="w-full px-2 py-1 text-xs border border-input rounded-md bg-background"
            placeholder="https:// 或相对路径"
          />
        </div>
      </div>
    </div>
  );
});
ContentItemEditor.displayName = 'ContentItemEditor';

// ---------- 一级：手风琴项目编辑器 ----------
const AccordionItemEditor = memo(({ item, index, isOpen, onToggle, onFieldChange, onRemove, currentLocale }: any) => {
  const [localTitle, setLocalTitle] = useState(item.title?.[currentLocale] || '');
  const [localContents, setLocalContents] = useState(item.contents || []);
  const [openContentIndex, setOpenContentIndex] = useState<number | null>(null);

  useEffect(() => {
    setLocalTitle(item.title?.[currentLocale] || '');
    setLocalContents(item.contents || []);
  }, [item.title, item.contents, currentLocale]);

  const handleTitleBlur = () => {
    const newLangObj = { ...(item.title || {}), [currentLocale]: localTitle };
    onFieldChange('title', newLangObj);
  };

  // 内容列表操作
  const handleAddContent = () => {
    if (localContents.length >= 6) return;
    const newContent = {
      id: nanoid(),
      imageUrl: '',
      title: { zh: '', en: '', textId: nanoid() },
      paragraph: { zh: '', en: '', textId: nanoid() },
      link: '',
    };
    const newContents = [...localContents, newContent];
    setLocalContents(newContents);
    onFieldChange('contents', newContents);
    setOpenContentIndex(localContents.length);
  };

  const handleRemoveContent = (contentIndex: number) => {
    const newContents = localContents.filter((_: any, i: number) => i !== contentIndex);
    setLocalContents(newContents);
    onFieldChange('contents', newContents);
    if (openContentIndex === contentIndex) setOpenContentIndex(null);
    else if (openContentIndex !== null && openContentIndex > contentIndex) setOpenContentIndex(openContentIndex - 1);
  };

  const handleContentFieldChange = (contentIndex: number, field: string, val: any) => {
    const newContents = [...localContents];
    newContents[contentIndex] = { ...newContents[contentIndex], [field]: val };
    setLocalContents(newContents);
    onFieldChange('contents', newContents);
  };

  const toggleContent = (contentIndex: number) => {
    setOpenContentIndex(prev => prev === contentIndex ? null : contentIndex);
  };

  return (
    <div className="border border-border rounded-md bg-background mb-4">
      <div
        className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">手风琴项目 {index + 1}</span>
          {localTitle && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              ({localTitle})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="text-destructive hover:text-destructive/80"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="p-4 pt-2 space-y-4 border-t border-border">
          <div>
            <label className="block text-xs font-medium mb-1">标题 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleBlur}
              className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
              placeholder="输入手风琴项目标题"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">内容列表（最多6项）</label>
              <button
                type="button"
                onClick={handleAddContent}
                disabled={localContents.length >= 6}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                <Plus size={14} /> 添加内容项
              </button>
            </div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {localContents.map((content: any, idx: number) => (
                <div key={content.id}>
                  <div
                    className="flex items-center justify-between cursor-pointer p-2 bg-muted/30 rounded-md"
                    onClick={() => toggleContent(idx)}
                  >
                    <div className="flex items-center gap-2">
                      {openContentIndex === idx ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="text-xs font-medium">内容项 {idx + 1}</span>
                      {content.title?.[currentLocale] && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          ({content.title[currentLocale]})
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveContent(idx); }}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {openContentIndex === idx && (
                    <ContentItemEditor
                      item={content}
                      onFieldChange={(field, val) => handleContentFieldChange(idx, field, val)}
                      onRemove={() => handleRemoveContent(idx)}
                      currentLocale={currentLocale}
                    />
                  )}
                </div>
              ))}
              {localContents.length === 0 && (
                <div className="text-center py-2 text-gray-400 text-xs">暂无内容项，点击“添加内容项”</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
AccordionItemEditor.displayName = 'AccordionItemEditor';

// ---------- 主组件：手风琴列表管理 ----------
export function AccordionListField({ value = [], onChange }: any) {
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
    if (value.length >= 10) return;
    const newItem = {
      id: nanoid(),
      title: { zh: '', en: '', textId: nanoid() },
      contents: [],
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
    setOpenIndex(prev => (prev === index ? null : index));
    // ✅ 派发事件，通知左侧预览组件展开对应的手风琴项目
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('accordion-edit-item', { detail: { index } }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">手风琴项目管理（最多10项）</label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={value.length >= 10}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} /> 添加手风琴项目
        </button>
      </div>
      <div className="max-h-[600px] overflow-y-auto pr-1">
        {value.map((item: any, index: number) => (
          <AccordionItemEditor
            key={item.id}
            item={item}
            index={index}
            isOpen={openIndex === index}
            onToggle={handleToggle}
            onFieldChange={(key, val) => handleFieldChange(index, key, val)}
            onRemove={() => handleRemove(index)}
            currentLocale={currentLocale}
          />
        ))}
      </div>
      {value.length === 0 && (
        <div className="text-center py-4 text-gray-400 text-sm">暂无手风琴项目，点击“添加手风琴项目”开始添加</div>
      )}
    </div>
  );
}