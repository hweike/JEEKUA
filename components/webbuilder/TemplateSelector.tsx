'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface TemplateSelectorProps {
  category: string;
  value?: string;
  onChange: (templateId: string) => void;
  placeholder?: string;
  autoSelectFirst?: boolean;
}

export function TemplateSelector({
  category,
  value,
  onChange,
  placeholder = '选择网页模板',
  autoSelectFirst = true,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoSelectedRef = useRef(false);
  const onChangeRef = useRef(onChange);

  // 保持 ref 最新
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // ✅ 诊断：打印接收到的 props
  console.log('[TemplateSelector] 🔍 组件渲染');
  console.log('[TemplateSelector] 🔍 category:', category);
  console.log('[TemplateSelector] 🔍 value:', value);
  console.log('[TemplateSelector] 🔍 templates.length:', templates.length);
  console.log('[TemplateSelector] 🔍 loading:', loading);

  // 获取模板列表
  useEffect(() => {
    console.log('[TemplateSelector] 🔍 开始加载模板列表，category:', category);
    fetch(`/api/webbuilder?category=${category}`)
      .then((res) => {
        console.log('[TemplateSelector] 🔍 API 响应状态:', res.status);
        return res.json();
      })
      .then((data: any[]) => {
        console.log('[TemplateSelector] 🔍 API 返回数据:', data);
        const mapped = data.map((t) => ({ id: t.id, name: t.name }));
        console.log('[TemplateSelector] 🔍 映射后的模板列表:', mapped);
        console.log('[TemplateSelector] 🔍 模板列表中的 ID:', mapped.map(t => t.id));
        setTemplates(mapped);
        setLoading(false);
      })
      .catch((err) => {
        console.error('[TemplateSelector] ❌ 加载模板失败:', err);
        setLoading(false);
      });
  }, [category]);

  // 自动选中第一个（仅在 autoSelectFirst 开启且 value 为空且从未选中过）
  useEffect(() => {
    if (autoSelectFirst && !loading && templates.length > 0 && (value === undefined || value === '') && !autoSelectedRef.current) {
      console.log('[TemplateSelector] 🔍 自动选中第一个模板:', templates[0].id);
      autoSelectedRef.current = true;
      setTimeout(() => {
        onChangeRef.current(templates[0].id);
      }, 0);
    }
  }, [loading, templates, value, autoSelectFirst]);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedTemplate = templates.find((t) => t.id === value);

  // ✅ 诊断：打印匹配结果
  console.log('[TemplateSelector] 🔍 当前 value:', value);
  console.log('[TemplateSelector] 🔍 selectedTemplate:', selectedTemplate);
  console.log('[TemplateSelector] 🔍 是否匹配成功:', !!selectedTemplate);
  console.log('[TemplateSelector] 🔍 将显示的文字:', 
    loading ? '加载中...' : selectedTemplate ? selectedTemplate.name : placeholder
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        className="flex items-center justify-between w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
      >
        <span className={!selectedTemplate ? 'text-gray-400' : ''}>
          {loading ? '加载中...' : selectedTemplate ? selectedTemplate.name : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 ml-2 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !loading && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {templates.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-400">暂无模板</li>
          ) : (
            templates.map((template) => (
              <li
                key={template.id}
                className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 transition ${
                  template.id === value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                }`}
                onClick={() => {
                  console.log('[TemplateSelector] 🔍 用户选择模板:', template.id);
                  onChange(template.id);
                  setIsOpen(false);
                }}
              >
                {template.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}