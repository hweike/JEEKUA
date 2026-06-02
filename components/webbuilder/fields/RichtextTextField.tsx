'use client';

import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';

export function RichtextTextField({ value, onChange, label }: any) {
  const [currentLocale, setCurrentLocale] = useState('zh');
  const [localText, setLocalText] = useState('');
  const hasGeneratedId = useRef(false);
  const initialValueRef = useRef(value);

  // 监听语言变化
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

  // 初始化：确保 value 对象包含 textId（仅在第一次渲染时执行）
  useEffect(() => {
    if (!hasGeneratedId.current) {
      // 如果 value 无效或缺少 textId，生成一个
      if (!initialValueRef.current || typeof initialValueRef.current !== 'object' || !initialValueRef.current.textId) {
        const newValue = {
          zh: initialValueRef.current?.zh || '',
          en: initialValueRef.current?.en || '',
          textId: nanoid(),
        };
        onChange(newValue);
      }
      hasGeneratedId.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 空依赖数组，只执行一次

  // 同步外部 value 到本地文本
  useEffect(() => {
    if (value && typeof value === 'object') {
      setLocalText(value[currentLocale] || '');
    }
  }, [value, currentLocale]);

  const update = (text: string) => {
    setLocalText(text);
    onChange({ ...value, [currentLocale]: text });
  };

  if (!value || typeof value !== 'object') return null;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="text"
        value={localText}
        onChange={(e) => update(e.target.value)}
        className="w-full border border-input rounded-md p-2 text-sm"
        placeholder={`输入${label}`}
      />
    </div>
  );
}