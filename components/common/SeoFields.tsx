'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toPinyin } from '@/lib/utils/pinyin';
import { getFieldHint, getFieldPlaceholder, HINT_PATHS, InfoTooltip } from '@/config/fieldHints';

export interface SeoData {
  slug: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
}

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

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

  /** slug 输入框失焦回调 */
  onSlugBlur?: () => void;

  /** slug 检查状态（可选，用于显示边框颜色） */
  slugStatus?: SlugStatus;

  /** slug 输入框下方的额外内容（如状态提示、建议值） */
  slugExtra?: ReactNode;

  /** 元标题下方的提示文案（非错误，仅建议） */
  seoTitleHint?: string;

  /** 元描述下方的提示文案（非错误，仅建议） */
  seoDescriptionHint?: string;

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
  let currentToken = '';

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

/**
 * 根据 slugStatus 返回输入框的边框样式
 */
function getSlugInputClass(status?: SlugStatus): string {
  const base = 'border rounded p-2 w-full transition-colors';
  switch (status) {
    case 'taken':
      return `${base} border-red-500 focus:ring-red-500 focus:border-red-500`;
    case 'available':
      return `${base} border-green-500 focus:ring-green-500 focus:border-green-500`;
    case 'checking':
      return `${base} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
    case 'error':
      return `${base} border-yellow-500 focus:ring-yellow-500 focus:border-yellow-500`;
    default:
      return `${base} border-gray-300 focus:ring-blue-500 focus:border-blue-500`;
  }
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
  onSlugBlur,
  slugStatus,
  slugExtra,
  seoTitleHint,
  seoDescriptionHint,
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
  const [isSlugManual, setIsSlugManual] = useState(!!externalSlug);

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

  // 同步外部变化到内部状态
  useEffect(() => {
    setSeoKeywords(externalKeywords);
    setSeoTitle(externalTitle);
    setSeoDescription(externalDescription);
  }, [externalKeywords, externalTitle, externalDescription]);

  useEffect(() => {
    if (!isSlugManualRef.current) {
      setSlug(externalSlug);
    } else {
      if (externalSlug && externalSlug !== slug) {
        setSlug(externalSlug);
      }
    }
  }, [externalSlug, slug]);

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

  // 自动生成 slug（仅在非手动模式且 autoGenerateFrom 触发时）
  useEffect(() => {
    if (!autoGenerateFrom || disabled || !showSlug) return;
    if (!isSlugManual) {
      const generated = generateSlugFromText(autoGenerateFrom);
      if (generated && generated !== slug) {
        setSlug(generated);
        handleChange({ slug: generated });
      }
    }
  }, [autoGenerateFrom, isSlugManual, slug, showSlug, disabled, handleChange]);

  const handleSlugEdit = (value: string) => {
    if (disabled) return;
    setIsSlugManual(true);
    const newSlug = value.slice(0, slugMaxLength);
    setSlug(newSlug);
    handleChange({ slug: newSlug });
  };

  const handleSlugBlur = () => {
    if (disabled) return;
    if (onSlugBlur) {
      onSlugBlur();
    }
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
            onBlur={handleSlugBlur}
            className={getSlugInputClass(slugStatus)}
            placeholder={getFieldPlaceholder('common.seo.slug')}
            disabled={disabled}
          />

          {/* slug 输入框下方的额外内容（如状态提示、建议值） */}
          {slugExtra && (
            <div className="mt-1">
              {slugExtra}
            </div>
          )}

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
          {/* ✅ 元标题提示（非错误） */}
          {seoTitleHint && (
            <p className="text-xs text-amber-600 mt-1">{seoTitleHint}</p>
          )}
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
          {/* ✅ 元描述提示（非错误） */}
          {seoDescriptionHint && (
            <p className="text-xs text-amber-600 mt-1">{seoDescriptionHint}</p>
          )}
          <div className="text-xs text-gray-500 mt-1 flex justify-between">
            <span>{descLength}/{descMaxLength} 字符</span>
          </div>
        </div>
      )}
    </div>
  );
}