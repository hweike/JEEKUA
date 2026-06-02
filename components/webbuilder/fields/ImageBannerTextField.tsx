'use client';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';

export function ImageBannerTextField({ value, onChange, field }: any) {
  // 从 field 中获取标签，若没有则使用默认值
  const label = field?.label || '文本';
  
  // 确保 value 是一个有效的对象结构
  const safeValue = value && typeof value === 'object' ? value : { zh: '', en: '', textId: '' };
  
  const [currentLocale, setCurrentLocale] = useState('zh');
  const [localText, setLocalText] = useState('');
  const initialized = useRef(false);

  // 监听全局语言切换
  useEffect(() => {
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (stored && (stored === 'zh' || stored === 'en')) {
      setCurrentLocale(stored);
    }
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale' && e.newValue && (e.newValue === 'zh' || e.newValue === 'en')) {
        setCurrentLocale(e.newValue);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  // 自动生成 textId（仅在首次且缺失时执行）
  useEffect(() => {
    if (!initialized.current && !safeValue.textId) {
      const newValue = {
        zh: safeValue.zh || '',
        en: safeValue.en || '',
        textId: nanoid(),
      };
      onChange(newValue);
      initialized.current = true;
    }
  }, [safeValue, onChange]);

  // 同步当前语言的文本到本地状态
  useEffect(() => {
    setLocalText(safeValue[currentLocale] || '');
  }, [safeValue, currentLocale]);

  const updateText = (text: string) => {
    setLocalText(text);
    onChange({ ...safeValue, [currentLocale]: text });
  };

  // 始终渲染输入框，不再因 value 为空而返回 null
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        value={localText}
        onChange={(e) => updateText(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-input rounded-md bg-background"
        placeholder={`输入${label} (${currentLocale === 'zh' ? '中文' : '英文'})`}
      />
    </div>
  );
}