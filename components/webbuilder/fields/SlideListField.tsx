'use client';

import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { Plus, Trash2, GripVertical, ChevronRight, ChevronDown } from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';
import { ColorPickerField } from '@/components/webbuilder/fields/ColorPickerField';
import { nanoid } from 'nanoid';

const SUPPORTED_LOCALES = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' }
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

const SlideItemEditor = memo(({ 
  item, 
  index, 
  isOpen, 
  onToggle, 
  onFieldChange,
  onRemove, 
  currentLocale 
}: any) => {
  const [localTitle, setLocalTitle] = useState(item.title?.[currentLocale] || '');
  const [localSubtitle, setLocalSubtitle] = useState(item.subtitle?.[currentLocale] || '');
  const [localButtonText, setLocalButtonText] = useState(item.buttonText?.[currentLocale] || '');
  const linkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalTitle(item.title?.[currentLocale] || '');
    setLocalSubtitle(item.subtitle?.[currentLocale] || '');
    setLocalButtonText(item.buttonText?.[currentLocale] || '');
  }, [item.title, item.subtitle, item.buttonText, currentLocale]);

  const syncTextField = (field: 'title' | 'subtitle' | 'buttonText', text: string) => {
    const newLangObj = { ...(item[field] || {}) };
    newLangObj[currentLocale] = text;
    onFieldChange(index, field, newLangObj);
  };

  const handleTitleBlur = () => syncTextField('title', localTitle);
  const handleSubtitleBlur = () => syncTextField('subtitle', localSubtitle);
  const handleButtonBlur = () => syncTextField('buttonText', localButtonText);

  const handleFieldChange = (field: string, val: any) => {
    onFieldChange(index, field, val);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFieldChange(index, 'buttonLink', e.target.value);
  };

  return (
    <div className="border border-border rounded-md bg-background">
      <div
        className="flex items-center justify-between cursor-pointer p-3 hover:bg-muted/50"
        onClick={() => onToggle(index)}
      >
        <div className="flex items-center gap-2">
          <GripVertical size={18} className="text-muted-foreground cursor-grab" />
          <span className="text-sm font-medium">幻灯片 {index + 1}</span>
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
        <div className="p-3 pt-0 space-y-3 border-t border-border mt-2">
          {/* 图片上传 */}
          <div>
            <label className="block text-xs font-medium mb-1">图片</label>
            <ImageUpload
              value={item.imageUrl}
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
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
              placeholder="主标题"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">标题字号 ({item.titleFontSize}px)</label>
              <RangeSlider
                value={item.titleFontSize ?? 40}
                min={20}
                max={120}
                onChange={(v) => handleFieldChange('titleFontSize', v)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">标题颜色</label>
            <ColorPickerField
              key={`title-color-${item.titleColor}`}
              field={{}}
              value={item.titleColor ?? '#ffffff'}
              onChange={(v) => handleFieldChange('titleColor', v)}
            />
          </div>

          {/* 副标题 */}
          <div>
            <label className="block text-xs font-medium mb-1">副标题 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localSubtitle}
              onChange={(e) => setLocalSubtitle(e.target.value)}
              onBlur={handleSubtitleBlur}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
              placeholder="副标题"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">副标题字号 ({item.subtitleFontSize}px)</label>
              <RangeSlider
                value={item.subtitleFontSize ?? 24}
                min={20}
                max={60}
                onChange={(v) => handleFieldChange('subtitleFontSize', v)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">副标题颜色</label>
            <ColorPickerField
              key={`subtitle-color-${item.subtitleColor}`}
              field={{}}
              value={item.subtitleColor ?? '#cccccc'}
              onChange={(v) => handleFieldChange('subtitleColor', v)}
            />
          </div>

          {/* 按钮文字 */}
          <div>
            <label className="block text-xs font-medium mb-1">按钮文字 ({currentLocale === 'zh' ? '中文' : '英文'})</label>
            <input
              type="text"
              value={localButtonText}
              onChange={(e) => setLocalButtonText(e.target.value)}
              onBlur={handleButtonBlur}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
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
              onChange={handleLinkChange}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
              placeholder="https://"
            />
            <p className="text-xs text-muted-foreground mt-1">支持以 https:// 开头的网址或相对路径</p>
          </div>

          {/* 内容位置 */}
          <div>
            <label className="block text-xs font-medium mb-1">内容位置</label>
            <select
              value={item.contentPosition}
              onChange={(e) => handleFieldChange('contentPosition', e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
            >
              <option value="top-left">左上</option>
              <option value="top-center">顶部居中</option>
              <option value="top-right">右上</option>
              <option value="center-left">中间居左</option>
              <option value="center-center">中间居中</option>
              <option value="center-right">中间居右</option>
              <option value="bottom-left">左下</option>
              <option value="bottom-center">底部居中</option>
              <option value="bottom-right">右下</option>
            </select>
          </div>

          {/* 对齐方式 */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium mb-1">桌面端对齐</label>
              <select
                value={item.desktopAlign}
                onChange={(e) => handleFieldChange('desktopAlign', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
              >
                <option value="left">左对齐</option>
                <option value="center">居中</option>
                <option value="right">右对齐</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">移动端对齐</label>
              <select
                value={item.mobileAlign}
                onChange={(e) => handleFieldChange('mobileAlign', e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-input rounded-md bg-background"
              >
                <option value="left">左对齐</option>
                <option value="center">居中</option>
                <option value="right">右对齐</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
SlideItemEditor.displayName = 'SlideItemEditor';

export function SlideListField({ field, value = [], onChange, readOnly }: any) {
  const [openIndex, setOpenIndex] = useState<number | null>(value.length > 0 ? 0 : null);
  const [currentLocale, setCurrentLocale] = useState('zh');

  const handleAdd = () => {
    if (value.length >= 5) return;
    const id = nanoid();
    const newItem: any = {
      imageUrl: '',
      title: { zh: '', en: '', textId: `${id}_title` },
      subtitle: { zh: '', en: '', textId: `${id}_sub` },
      buttonText: { zh: '', en: '', textId: `${id}_btn` },
      buttonLink: '',
      contentPosition: 'center-center',
      desktopAlign: 'left',
      mobileAlign: 'left',
      titleFontSize: 40,
      titleColor: '#ffffff',
      subtitleFontSize: 24,
      subtitleColor: '#cccccc',
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <span className="text-sm font-medium text-foreground">编辑语言：</span>
        {/* 语言选择器：添加 localStorage 广播代码 */}
        <select
          value={currentLocale}
          onChange={(e) => {
            const newLocale = e.target.value;
            setCurrentLocale(newLocale);
            // 将所选语言存储到 localStorage，以便预览组件同步
            localStorage.setItem('webbuilder_edit_locale', newLocale);
            // 手动触发 storage 事件（同页面内其他监听器需要）
            window.dispatchEvent(new StorageEvent('storage', { key: 'webbuilder_edit_locale', newValue: newLocale }));
          }}
          className="px-2 py-1 border border-input rounded-md text-sm bg-background"
        >
          {SUPPORTED_LOCALES.map(loc => (
            <option key={loc.value} value={loc.value}>{loc.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-foreground">{field.label || '幻灯片'}</label>
        <button
          type="button"
          onClick={handleAdd}
          disabled={value.length >= 5 || readOnly}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          <Plus size={16} /> 添加图片
        </button>
      </div>

      {value.map((item: any, index: number) => (
        <SlideItemEditor
          key={index}
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
  );
}