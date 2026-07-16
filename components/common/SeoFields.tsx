'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toPinyin } from '@/lib/utils/pinyin';
import { getFieldHint, getFieldPlaceholder, HINT_PATHS, InfoTooltip } from '@/config/fieldHints';

export interface SeoData {
  slug: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
}

export interface SeoFieldsProps {
  slug?: string;
  seoKeywords?: string;
  seoTitle?: string;
  seoDescription?: string;

  onSlugChange?: (value: string) => void;
  onKeywordsChange?: (value: string) => void;
  onTitleChange?: (value: string) => void;
  onDescriptionChange?: (value: string) => void;
  onChange?: (data: SeoData) => void;

  autoGenerateFrom?: string;
  showSlug?: boolean;
  showKeywords?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;

  titleMaxLength?: number;
  descMaxLength?: number;
  slugMaxLength?: number;
  keywordsMaxLength?: number;

  disabled?: boolean;
  className?: string;

  labels?: {
    slug?: string;
    keywords?: string;
    title?: string;
    description?: string;
  };
}

/**
 * 智能生成 Slug：
 * - 连续的数字/字母视为一个整体（不拆分）
 * - 中文转换为拼音（每个字的拼音用连字符连接）
 * - 英文单词与数字字母组合保留原样（小写）
 * - 不同整体之间用连字符分隔
 */
function generateSlugFromText(text: string): string {
  if (!text) return '';

  const parts: string[] = [];
  let currentToken = ''; // 累积连续的字母/数字

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    // 字母或数字：累积到当前token
    if (/[a-zA-Z0-9]/.test(ch)) {
      currentToken += ch;
      continue;
    }

    // 遇到非字母数字，先结束当前token
    if (currentToken) {
      parts.push(currentToken.toLowerCase());
      currentToken = '';
    }

    // 处理中文：转换为拼音（整体）
    if (/[\u4e00-\u9fa5]/.test(ch)) {
      const pinyin = toPinyin(ch);
      if (pinyin) parts.push(pinyin);
    }
    // 其他字符（空格、标点等）直接忽略
  }

  // 处理末尾可能剩余的token
  if (currentToken) {
    parts.push(currentToken.toLowerCase());
  }

  // 用连字符连接并清理多余连字符
  let slug = parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');

  // 回退逻辑：如果没有任何有效字符，则按原始方式清理
  if (!slug) {
    slug = text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  return slug;
}

export default function SeoFields({
  slug: externalSlug = '',
  seoKeywords: externalKeywords = '',
  seoTitle: externalTitle = '',
  seoDescription: externalDescription = '',
  onSlugChange,
  onKeywordsChange,
  onTitleChange,
  onDescriptionChange,
  onChange,
  autoGenerateFrom,
  showSlug = true,
  showKeywords = true,
  showTitle = true,
  showDescription = true,
  titleMaxLength = 70,
  descMaxLength = 160,
  slugMaxLength = 100,
  keywordsMaxLength = 255,
  disabled = false,
  className = '',
  labels = {},
}: SeoFieldsProps) {
  // 本地状态：初始化时使用外部传入的值
  const [slug, setSlug] = useState(externalSlug);
  const [seoKeywords, setSeoKeywords] = useState(externalKeywords);
  const [seoTitle, setSeoTitle] = useState(externalTitle);
  const [seoDescription, setSeoDescription] = useState(externalDescription);

  // 标记 slug 是否被用户手动编辑过
  const [isSlugManual, setIsSlugManual] = useState(!!externalSlug); // 如果有初始值，认为是手动编辑过的

  // 用于避免因外部 props 变化覆盖内部手动标记的标志
  const isSlugManualRef = useRef(isSlugManual);
  useEffect(() => {
    isSlugManualRef.current = isSlugManual;
  }, [isSlugManual]);

  // 长度计数器（仅用于显示）
  const [slugLength, setSlugLength] = useState(slug.length);
  const [titleLength, setTitleLength] = useState(seoTitle.length);
  const [descLength, setDescLength] = useState(seoDescription.length);

  useEffect(() => setSlugLength(slug.length), [slug]);
  useEffect(() => setTitleLength(seoTitle.length), [seoTitle]);
  useEffect(() => setDescLength(seoDescription.length), [seoDescription]);

  // 同步外部变化到内部状态（当外部值明确变化时）
  // 但要注意：如果 slug 外部变化且当前不是手动编辑模式，则更新；否则保留内部手动值
  useEffect(() => {
    setSeoKeywords(externalKeywords);
    setSeoTitle(externalTitle);
    setSeoDescription(externalDescription);
  }, [externalKeywords, externalTitle, externalDescription]);

  useEffect(() => {
    // 如果 slug 外部值变化，且当前不是手动编辑模式（或者外部值由空变为非空也可能是初始化），则使用外部值
    if (!isSlugManualRef.current) {
      setSlug(externalSlug);
    } else {
      // 如果已经是手动模式，但外部值变化且不为空（例如加载已保存的 slug），
      // 这时应保留外部值，并标记为手动（因为加载的 slug 就是用户之前保存的手动值）
      if (externalSlug && externalSlug !== slug) {
        setSlug(externalSlug);
        // 注意：不改变 isSlugManual，因为外部值已经是手动编辑的结果
      }
    }
  }, [externalSlug, slug]);

  // 自动生成 slug（仅在非手动模式且 autoGenerateFrom 触发时）
  useEffect(() => {
    if (!autoGenerateFrom || disabled || !showSlug) return;
    if (!isSlugManual) {
      const generated = generateSlugFromText(autoGenerateFrom);
      // 只有当生成的值与当前 slug 不同，且当前 slug 为空或者不是由外部手动提供时，才更新
      if (generated && generated !== slug) {
        setSlug(generated);
        handleChange({ slug: generated });
      }
    }
  }, [autoGenerateFrom, isSlugManual, slug, showSlug, disabled]);

  // 统一向外发送变化
  const handleChange = useCallback(
    (updates: Partial<SeoData>) => {
      const newData = {
        slug: updates.slug ?? slug,
        seoKeywords: updates.seoKeywords ?? seoKeywords,
        seoTitle: updates.seoTitle ?? seoTitle,
        seoDescription: updates.seoDescription ?? seoDescription,
      };
      if (updates.slug !== undefined && onSlugChange) onSlugChange(updates.slug);
      if (updates.seoKeywords !== undefined && onKeywordsChange) onKeywordsChange(updates.seoKeywords);
      if (updates.seoTitle !== undefined && onTitleChange) onTitleChange(updates.seoTitle);
      if (updates.seoDescription !== undefined && onDescriptionChange) onDescriptionChange(updates.seoDescription);
      if (onChange) onChange(newData);
    },
    [slug, seoKeywords, seoTitle, seoDescription, onSlugChange, onKeywordsChange, onTitleChange, onDescriptionChange, onChange]
  );

  const handleSlugEdit = (value: string) => {
    if (disabled) return;
    setIsSlugManual(true);
    const newSlug = value.slice(0, slugMaxLength);
    setSlug(newSlug);
    handleChange({ slug: newSlug });
  };

  const handleKeywords = (value: string) => {
    if (disabled) return;
    const newVal = value.slice(0, keywordsMaxLength);
    setSeoKeywords(newVal);
    handleChange({ seoKeywords: newVal });
  };

  const handleTitle = (value: string) => {
    if (disabled) return;
    const newVal = value.slice(0, titleMaxLength);
    setSeoTitle(newVal);
    handleChange({ seoTitle: newVal });
  };

  const handleDescription = (value: string) => {
    if (disabled) return;
    const newVal = value.slice(0, descMaxLength);
    setSeoDescription(newVal);
    handleChange({ seoDescription: newVal });
  };

  const defaultLabels = {
    slug: 'URL 名称',
    keywords: 'SEO 核心关键词',
    title: 'SEO 元标题',
    description: 'SEO 元描述',
  };
  const finalLabels = { ...defaultLabels, ...labels };

  return (
    <div className={`space-y-4 ${className}`}>
      {showSlug && (
        <div>
          <label className="block font-medium mb-1 flex items-center gap-2">
            {finalLabels.slug}
            <InfoTooltip hintKey="common.seo.slug" />
          </label>
          <input
            type="text"
            value={slug}
            onChange={e => handleSlugEdit(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder={getFieldPlaceholder('common.seo.slug')}
            disabled={disabled}
          />
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>{slugLength}/{slugMaxLength} 字符</span>
            {autoGenerateFrom && !disabled && !isSlugManual && (
              <span className="text-green-600">正在自动同步（英文保留单词，中文转拼音）</span>
            )}
            {isSlugManual && !disabled && (
              <span className="text-amber-600">已手动编辑</span>
            )}
          </div>
        </div>
      )}

      {showKeywords && (
        <div>
          <label className="block font-medium mb-1 flex items-center gap-2">
            {finalLabels.keywords}
            <InfoTooltip hintKey="common.seo.keywords" />
          </label>
          <input
            type="text"
            value={seoKeywords}
            onChange={e => handleKeywords(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder={getFieldPlaceholder('common.seo.keywords')}
            disabled={disabled}
          />
        </div>
      )}

      {showTitle && (
        <div>
          <label className="block font-medium mb-1 flex items-center gap-2">
            {finalLabels.title}
            <InfoTooltip hintKey="common.seo.title" />
          </label>
          <input
            type="text"
            value={seoTitle}
            onChange={e => handleTitle(e.target.value)}
            className="border rounded p-2 w-full"
            placeholder={getFieldPlaceholder('common.seo.title')}
            disabled={disabled}
          />
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>{titleLength}/{titleMaxLength} 字符</span>
          </div>
        </div>
      )}

      {showDescription && (
        <div>
          <label className="block font-medium mb-1 flex items-center gap-2">
            {finalLabels.description}
            <InfoTooltip hintKey="common.seo.description" />
          </label>
          <textarea
            value={seoDescription}
            onChange={e => handleDescription(e.target.value)}
            rows={3}
            className="border rounded p-2 w-full"
            placeholder={getFieldPlaceholder('common.seo.description')}
            disabled={disabled}
          />
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>{descLength}/{descMaxLength} 字符</span>
          </div>
        </div>
      )}
    </div>
  );
}