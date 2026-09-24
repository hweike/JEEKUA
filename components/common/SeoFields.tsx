'use client';

import { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { toPinyin } from '@/lib/utils/pinyin';
import { getFieldPlaceholder, InfoTooltip } from '@/config/fieldHints';
import { ensureUniqueSlugAsync } from '@/lib/utils/clientSlug';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export interface SeoData {
  slug: string;
  seoKeywords: string;
  seoTitle: string;
  seoDescription: string;
}

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';

/** slug 自动检查配置 */
export interface SlugCheckConfig {
  /** 是否启用自动检查（默认 false） */
  enabled?: boolean;
  /** API 端点（默认 /api/admin/pages/slugs） */
  endpoint?: string;
  /** 排除的 ID（编辑模式下排除自身） */
  excludeId?: string;
  /** 响应数据字段名（默认 'pages'） */
  dataKey?: string;
  /** 数据项中 ID 字段名（默认 'id'） */
  idKey?: string;
  /** 数据项中 slug 字段名（默认 'slug'） */
  slugKey?: string;
  /** 检查延迟毫秒（默认 500） */
  debounceMs?: number;
  /** 当前语言（检查时需要） */
  locale?: string;
  /** ✅ 新增：检测到冲突时自动应用建议值（默认 false） */
  autoResolveConflict?: boolean;
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

  /** slug 自动检查配置（启用后内部处理检查逻辑） */
  slugCheck?: SlugCheckConfig;

  /** 语言（用于 slug 检查） */
  locale?: string;

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

    if (/[a-zA-Z0-9]/.test(ch)) {
      currentToken += ch;
      continue;
    }

    if (currentToken) {
      parts.push(currentToken.toLowerCase());
      currentToken = '';
    }

    if (/[\u4e00-\u9fa5]/.test(ch)) {
      const pinyin = toPinyin(ch);
      if (pinyin) parts.push(pinyin);
    }
  }

  if (currentToken) {
    parts.push(currentToken.toLowerCase());
  }

  let slug = parts.join('-').replace(/-+/g, '-').replace(/^-|-$/g, '');

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
  slugStatus: externalSlugStatus,
  slugExtra: externalSlugExtra,
  seoTitleHint,
  seoDescriptionHint,
  slugCheck,
  locale: localeProp,
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
  // ========== 本地状态 ==========
  const [slug, setSlug] = useState(externalSlug);
  const [seoKeywords, setSeoKeywords] = useState(externalKeywords);
  const [seoTitle, setSeoTitle] = useState(externalTitle);
  const [seoDescription, setSeoDescription] = useState(externalDescription);

  // 标记 slug 是否被用户手动编辑过
  const [isSlugManual, setIsSlugManual] = useState(!!externalSlug);

  // 长度计数器
  const [slugLength, setSlugLength] = useState(slug.length);
  const [titleLength, setTitleLength] = useState(seoTitle.length);
  const [descLength, setDescLength] = useState(seoDescription.length);

  // ========== ✅ 内部 slug 检查状态 ==========
  const [internalSlugStatus, setInternalSlugStatus] = useState<SlugStatus>('idle');
  const [internalSuggestedSlug, setInternalSuggestedSlug] = useState<string | null>(null);

  // ========== ✅ 定时器 ref 与已检查记录（必须在 checkSlugAvailability 之前声明） ==========
  const slugCheckTimer = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedSlug = useRef<string>('');

  // ========== ✅ 用 ref 保存最新状态，避免闭包过期和依赖循环 ==========
  const slugRef = useRef(slug);
  const seoKeywordsRef = useRef(seoKeywords);
  const seoTitleRef = useRef(seoTitle);
  const seoDescriptionRef = useRef(seoDescription);
  const isSlugManualRef = useRef(isSlugManual);
  const internalSlugStatusRef = useRef(internalSlugStatus);

  // 同步 ref
  useEffect(() => { slugRef.current = slug; }, [slug]);
  useEffect(() => { seoKeywordsRef.current = seoKeywords; }, [seoKeywords]);
  useEffect(() => { seoTitleRef.current = seoTitle; }, [seoTitle]);
  useEffect(() => { seoDescriptionRef.current = seoDescription; }, [seoDescription]);
  useEffect(() => { isSlugManualRef.current = isSlugManual; }, [isSlugManual]);
  useEffect(() => { internalSlugStatusRef.current = internalSlugStatus; }, [internalSlugStatus]);

  // ========== ✅ 用 ref 保存回调，避免依赖变化 ==========
  const onSlugChangeRef = useRef(onSlugChange);
  const onKeywordsChangeRef = useRef(onKeywordsChange);
  const onTitleChangeRef = useRef(onTitleChange);
  const onDescriptionChangeRef = useRef(onDescriptionChange);
  const onChangeRef = useRef(onChange);
  const onSlugBlurRef = useRef(onSlugBlur);

  useEffect(() => { onSlugChangeRef.current = onSlugChange; }, [onSlugChange]);
  useEffect(() => { onKeywordsChangeRef.current = onKeywordsChange; }, [onKeywordsChange]);
  useEffect(() => { onTitleChangeRef.current = onTitleChange; }, [onTitleChange]);
  useEffect(() => { onDescriptionChangeRef.current = onDescriptionChange; }, [onDescriptionChange]);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);
  useEffect(() => { onSlugBlurRef.current = onSlugBlur; }, [onSlugBlur]);

  // ========== ✅ 从 slugCheck 提取原始值，避免对象依赖不稳定 ==========
  const isInternalCheckEnabled = !!slugCheck?.enabled;
  const checkEndpoint = slugCheck?.endpoint;
  const checkExcludeId = slugCheck?.excludeId;
  const checkDataKey = slugCheck?.dataKey;
  const checkIdKey = slugCheck?.idKey;
  const checkSlugKey = slugCheck?.slugKey;
  const checkDebounceMs = slugCheck?.debounceMs ?? 500;
  const checkLocale = slugCheck?.locale || localeProp || 'zh';
  // ✅ 新增：是否自动应用建议值
  const checkAutoResolveConflict = slugCheck?.autoResolveConflict ?? false;

  // ✅ 优先使用外部状态，否则使用内部状态
  const effectiveSlugStatus = externalSlugStatus ?? internalSlugStatus;

  // ========== ✅ 检查函数（使用 ref，依赖稳定） ==========
  const checkSlugAvailability = useCallback(
    async (value: string) => {
      if (!isInternalCheckEnabled) return;

      const trimmed = value.trim();
      if (!trimmed) {
        setInternalSlugStatus('idle');
        setInternalSuggestedSlug(null);
        return;
      }

      // ✅ 使用 ref 读取最新状态，避免依赖 internalSlugStatus
      if (
        lastCheckedSlug.current === trimmed &&
        internalSlugStatusRef.current === 'available'
      ) {
        return;
      }

      setInternalSlugStatus('checking');
      lastCheckedSlug.current = trimmed;

      try {
        const uniqueSlug = await ensureUniqueSlugAsync(trimmed, checkLocale, {
          endpoint: checkEndpoint,
          excludeId: checkExcludeId,
          dataKey: checkDataKey,
          idKey: checkIdKey,
          slugKey: checkSlugKey,
        });

        if (uniqueSlug === trimmed) {
          // ✅ 无冲突
          setInternalSlugStatus('available');
          setInternalSuggestedSlug(null);
        } else {
          // ✅ 有冲突
          if (checkAutoResolveConflict) {
            // ✅ 自动应用建议值
            setSlug(uniqueSlug);
            setIsSlugManual(true);
            handleChange({ slug: uniqueSlug });
            setInternalSlugStatus('available');
            setInternalSuggestedSlug(null);
            lastCheckedSlug.current = uniqueSlug;
          } else {
            // 显示建议值，等用户点击
            setInternalSlugStatus('taken');
            setInternalSuggestedSlug(uniqueSlug);
          }
        }
      } catch (err) {
        console.warn('[SeoFields] slug 检查失败:', err);
        setInternalSlugStatus('error');
        setInternalSuggestedSlug(null);
      }
    },
    // ✅ 依赖原始值（不是对象），稳定
    [
      isInternalCheckEnabled,
      checkEndpoint,
      checkExcludeId,
      checkDataKey,
      checkIdKey,
      checkSlugKey,
      checkLocale,
      checkAutoResolveConflict,  // ✅ 新增依赖
    ]
  );

  // ========== ✅ 用 ref 保存检查函数，避免 useEffect 依赖 ==========
  const checkSlugAvailabilityRef = useRef(checkSlugAvailability);
  useEffect(() => {
    checkSlugAvailabilityRef.current = checkSlugAvailability;
  }, [checkSlugAvailability]);

  // ========== ✅ 统一向外发送变化（使用 ref，依赖稳定） ==========
  const handleChange = useCallback((updates: Partial<SeoData>) => {
    const currentSlug = slugRef.current;
    const currentKeywords = seoKeywordsRef.current;
    const currentTitle = seoTitleRef.current;
    const currentDescription = seoDescriptionRef.current;

    const newData = {
      slug: updates.slug ?? currentSlug,
      seoKeywords: updates.seoKeywords ?? currentKeywords,
      seoTitle: updates.seoTitle ?? currentTitle,
      seoDescription: updates.seoDescription ?? currentDescription,
    };

    if (updates.slug !== undefined && onSlugChangeRef.current) {
      onSlugChangeRef.current(updates.slug);
    }
    if (updates.seoKeywords !== undefined && onKeywordsChangeRef.current) {
      onKeywordsChangeRef.current(updates.seoKeywords);
    }
    if (updates.seoTitle !== undefined && onTitleChangeRef.current) {
      onTitleChangeRef.current(updates.seoTitle);
    }
    if (updates.seoDescription !== undefined && onDescriptionChangeRef.current) {
      onDescriptionChangeRef.current(updates.seoDescription);
    }
    if (onChangeRef.current) {
      onChangeRef.current(newData);
    }
  }, []); // ✅ 空依赖，永不重建

  // ========== ✅ 同步外部变化到内部状态 ==========
  useEffect(() => {
    setSeoKeywords(externalKeywords);
    setSeoTitle(externalTitle);
    setSeoDescription(externalDescription);
  }, [externalKeywords, externalTitle, externalDescription]);

  // ✅ slug 同步（使用 ref 判断，避免依赖 slug）
  useEffect(() => {
    if (!isSlugManualRef.current) {
      setSlug(externalSlug);
    } else {
      if (externalSlug && externalSlug !== slugRef.current) {
        setSlug(externalSlug);
      }
    }
  }, [externalSlug]); // ✅ 只依赖 externalSlug

  // ✅ 长度计数
  useEffect(() => { setSlugLength(slug.length); }, [slug]);
  useEffect(() => { setTitleLength(seoTitle.length); }, [seoTitle]);
  useEffect(() => { setDescLength(seoDescription.length); }, [seoDescription]);

  // ========== ✅ 自动生成 slug（无循环） ==========
  useEffect(() => {
    if (!autoGenerateFrom || disabled || !showSlug) return;
    if (isSlugManualRef.current) return; // ✅ 用 ref 判断

    const generated = generateSlugFromText(autoGenerateFrom);
    if (generated && generated !== slugRef.current) {
      setSlug(generated);
      handleChange({ slug: generated });

      // 如果启用了内部检查，触发检查
      if (isInternalCheckEnabled) {
        if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
        slugCheckTimer.current = setTimeout(() => {
          checkSlugAvailabilityRef.current(generated);
        }, checkDebounceMs);
      }
    }
  }, [
    autoGenerateFrom,
    disabled,
    showSlug,
    isInternalCheckEnabled,
    checkDebounceMs,
    handleChange,
  ]);

  // ========== 事件处理 ==========
  const handleSlugEdit = (value: string) => {
    if (disabled) return;
    setIsSlugManual(true);
    const newSlug = value.slice(0, slugMaxLength);
    setSlug(newSlug);
    handleChange({ slug: newSlug });

    if (isInternalCheckEnabled) {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
      slugCheckTimer.current = setTimeout(() => {
        checkSlugAvailabilityRef.current(newSlug);
      }, checkDebounceMs);
    }
  };

  const handleSlugBlur = () => {
    if (disabled) return;

    if (isInternalCheckEnabled) {
      if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
      checkSlugAvailabilityRef.current(slugRef.current);
    }

    if (onSlugBlurRef.current) {
      onSlugBlurRef.current();
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

  // ========== ✅ 应用建议的 slug ==========
  const applySuggestedSlug = () => {
    if (internalSuggestedSlug) {
      setIsSlugManual(true);
      setSlug(internalSuggestedSlug);
      handleChange({ slug: internalSuggestedSlug });
      setInternalSlugStatus('available');
      setInternalSuggestedSlug(null);
      lastCheckedSlug.current = internalSuggestedSlug;
    }
  };

  // ========== ✅ 渲染 slug 状态提示 ==========
  const renderSlugExtra = () => {
    if (externalSlugExtra) return externalSlugExtra;
    if (!isInternalCheckEnabled) return null;

    return (
      <>
        {internalSlugStatus === 'checking' && (
          <p className="text-gray-500 text-sm flex items-center gap-1">
            <Loader2 size={14} className="animate-spin" /> 正在检查 URL 名称是否可用...
          </p>
        )}
        {internalSlugStatus === 'available' && (
          <p className="text-green-600 text-sm flex items-center gap-1">
            <CheckCircle size={14} /> URL 名称可用
          </p>
        )}
        {internalSlugStatus === 'taken' && (
          <div className="text-red-500 text-sm">
            <p className="flex items-center gap-1">
              <XCircle size={14} /> URL 名称已被占用
            </p>
            {internalSuggestedSlug && (
              <p className="mt-1">
                建议使用：
                <button
                  type="button"
                  onClick={applySuggestedSlug}
                  className="text-blue-600 hover:underline font-medium ml-1"
                >
                  {internalSuggestedSlug}
                </button>
              </p>
            )}
          </div>
        )}
        {internalSlugStatus === 'error' && (
          <p className="text-yellow-600 text-sm">⚠️ 无法检查 URL 名称，保存时请留意</p>
        )}
      </>
    );
  };

  const defaultLabels = {
    slug: 'URL 名称',
    keywords: 'SEO 核心关键词',
    title: 'SEO 元标题',
    description: 'SEO 元描述',
  };
  const finalLabels = { ...defaultLabels, ...labels };

  const slugExtraContent = renderSlugExtra();

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
            className={getSlugInputClass(effectiveSlugStatus)}
            placeholder={getFieldPlaceholder('common.seo.slug')}
            disabled={disabled}
          />

          {slugExtraContent && (
            <div className="mt-1">{slugExtraContent}</div>
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