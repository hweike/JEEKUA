'use client';

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getImageUrl } from '@/lib/files/url';
import { InquiryBlock } from '@/components/webbuilder/blocks/inquiry/InquiryBlock';

// ---------- 辅助函数 ----------
const getImageUrlCached = (url: string) => (url ? getImageUrl(url) : '');
const isThirdPartyVideo = (url: string) => /youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(url);
const hasVisibleContent = (html: string) => {
  if (!html) return false;
  const text = html.replace(/<[^>]*>/g, '').trim();
  return text.length > 0;
};

interface MediaItem {
  type: 'video' | 'image';
  url: string;
  thumbnail?: string;
  title?: string;
}

interface ProductDetailsBlockProps {
  layout?: string;
  imageSize?: string;
  __runtime?: any;
  puck?: any;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;

// ✅ 媒体切换动画时长（硬编码）
const MEDIA_TRANSITION_MS = 300;

export const ProductDetailsBlock = memo(function ProductDetailsBlock({
  layout = 'left-right',
  imageSize = 'medium',
  __runtime,
  puck,
}: ProductDetailsBlockProps) {
  const t = useTranslations('Components.ProductDetails');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showInquiryModal, setShowInquiryModal] = useState(false);

  // ============================================================
  // ✅ 产品详情页专属 CSS 变量（带最终 fallback）
  // ============================================================
  // ---- 容器 ----
  const containerBg = 'var(--product-details-bg, var(--background, #ffffff))';
  const containerText = 'var(--product-details-text, var(--foreground, #0f172a))';

  // ---- 媒体区域 ----
  const mediaBorder = 'var(--product-details-media-border, var(--border, #e2e8f0))';
  const mediaBg = 'var(--product-details-media-bg, var(--muted, #f1f5f9))';
  const thumbnailBorder = 'var(--product-details-thumbnail-border, var(--border, #e2e8f0))';
  const thumbnailActiveBorder = 'var(--product-details-thumbnail-active-border, var(--primary, #1e293b))';

  // ---- 标题与品牌 ----
  const titleColor = 'var(--product-details-title-color, var(--foreground, #0f172a))';
  const brandColor = 'var(--product-details-brand-color, var(--muted-foreground, #64748b))';

  // ---- 价格 ----
  const priceColor = 'var(--product-details-price-color, var(--primary, #1e293b))';
  const priceRangeColor = 'var(--product-details-price-range-color, var(--muted-foreground, #64748b))';

  // ---- 变体 ----
  const variantBorder = 'var(--product-details-variant-border, var(--border, #e2e8f0))';
  const variantBg = 'var(--product-details-variant-bg, var(--card, #ffffff))';
  const variantText = 'var(--product-details-variant-text, var(--foreground, #0f172a))';

  // ---- 参数表格 ----
  const paramsBorder = 'var(--product-details-params-border, var(--border, #e2e8f0))';
  const paramsLabelColor = 'var(--product-details-params-label-color, var(--muted-foreground, #64748b))';
  const paramsValueColor = 'var(--product-details-params-value-color, var(--foreground, #0f172a))';

  // ---- 描述与规格 ----
  const descriptionText = 'var(--product-details-description-text, var(--foreground, #0f172a))';
  const specTextColor = 'var(--product-details-spec-text, var(--muted-foreground, #64748b))';

  // ---- 按钮 ----
  const inquiryBg = 'var(--product-details-inquiry-bg, #FF6A00)';
  const inquiryText = 'var(--product-details-inquiry-text, #ffffff)';
  const inquiryHoverBg = 'var(--product-details-inquiry-hover-bg, #e85e00)';
  const chatBg = 'var(--product-details-chat-bg, #25D366)';
  const chatText = 'var(--product-details-chat-text, #ffffff)';
  const chatHoverBg = 'var(--product-details-chat-hover-bg, #1da851)';
  const storeBorder = 'var(--product-details-store-border, var(--border, #e2e8f0))';
  const storeText = 'var(--product-details-store-text, var(--foreground, #0f172a))';
  const storeHoverBg = 'var(--product-details-store-hover-bg, var(--muted, #f1f5f9))';

  // ---- 库存物流 ----
  const stockText = 'var(--product-details-stock-text, var(--muted-foreground, #64748b))';

  // ---- 弹窗 ----
  const modalOverlay = 'var(--product-details-modal-overlay, rgba(0,0,0,0.5))';
  const modalBg = 'var(--product-details-modal-bg, #ffffff)';
  const modalCloseColor = 'var(--product-details-modal-close-color, var(--foreground, #0f172a))';

  // ============================================================
  // ✅ 新增：媒体切换过渡动画状态
  // ============================================================
  const [displayMedia, setDisplayMedia] = useState<MediaItem | null>(null);
  const [prevMedia, setPrevMedia] = useState<MediaItem | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // ---------- 早退：无产品数据 ----------
  if (!__runtime?.product) {
    return (
      <div
        className="border-2 border-dashed text-center"
        ref={puck?.dragRef}
        style={{
          padding: 'var(--spacing-8, 2rem)',
          borderColor: 'var(--border, #e2e8f0)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        {t('placeholder')}
      </div>
    );
  }

  const product = __runtime.product;
  const locale = __runtime.locale || 'zh';
  const urlPattern = __runtime.urlPattern || '';
  const storeLinks = __runtime.storeLinks || [];

  // ---------- 变体选择 ----------
  const variantId = searchParams?.get('variant');
  const selectedVariant = useMemo(() => {
    if (!variantId) return null;
    return (product.variants || []).find((v: any) => v.id === variantId);
  }, [variantId, product.variants]);

  // ---------- 显示数据（变体优先） ----------
  const displayProduct = useMemo(() => {
    if (!selectedVariant) return product;
    return {
      ...product,
      product_name: selectedVariant.product_name || product.product_name,
      brand: selectedVariant.brand || product.brand,
      main_image_url: selectedVariant.main_image_url || product.main_image_url,
      additional_images: selectedVariant.additional_images || product.additional_images || [],
      short_description: selectedVariant.short_description || product.short_description,
      description: selectedVariant.description || product.description,
      attributes: selectedVariant.attributes || product.attributes,
      price_tiers: selectedVariant.price_tiers || product.price_tiers,
      currency: selectedVariant.currency || product.currency,
      slug: selectedVariant.slug || product.slug,
      isVariantMode: true,
    };
  }, [product, selectedVariant]);

  // ---------- 图片列表 ----------
  const allImages = useMemo(() => {
    const images = [
      displayProduct.main_image_url,
      ...(displayProduct.additional_images || []),
    ].filter(Boolean);
    return images.map(getImageUrlCached);
  }, [displayProduct.main_image_url, displayProduct.additional_images]);

  // ---------- 获取视频资源 ----------
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const mediaList = useMemo(() => {
    const list: MediaItem[] = [];
    videos.forEach((v) => {
      if (v.url && v.url.trim() !== '') {
        list.push(v);
      }
    });
    allImages.forEach((imgUrl) => {
      list.push({ type: 'image', url: imgUrl });
    });
    return list;
  }, [videos, allImages]);

  const currentMedia = mediaList[currentMediaIndex] || null;

  // ============================================================
  // ✅ 新增：媒体切换过渡动画逻辑
  // ============================================================
  useEffect(() => {
    if (!currentMedia) {
      setDisplayMedia(null);
      setPrevMedia(null);
      return;
    }

    // 首次加载：直接显示，无动画
    if (!displayMedia) {
      setDisplayMedia(currentMedia);
      return;
    }

    // 相同 URL：不切换
    if (displayMedia.url === currentMedia.url) {
      return;
    }

    // 切换：旧 → prev，新 → display，触发淡入淡出
    setPrevMedia(displayMedia);
    setDisplayMedia(currentMedia);
    setIsTransitioning(true);

    const timer = setTimeout(() => {
      setIsTransitioning(false);
      setPrevMedia(null);
    }, MEDIA_TRANSITION_MS + 50);   // 略大于 CSS transition 时长

    return () => clearTimeout(timer);
  }, [currentMedia, displayMedia]);

  // ✅ 预加载下一张图片（提升切换流畅度）
  useEffect(() => {
    if (mediaList.length <= 1) return;
    const nextIndex = (currentMediaIndex + 1) % mediaList.length;
    const nextMedia = mediaList[nextIndex];
    if (nextMedia?.type === 'image' && nextMedia.url) {
      const img = new Image();
      img.src = nextMedia.url;
    }
  }, [currentMediaIndex, mediaList]);

  // ✅ 产品变化时重置媒体状态
  useEffect(() => {
    setDisplayMedia(null);
    setPrevMedia(null);
    setIsTransitioning(false);
  }, [product?.id]);

  // ============================================================
  // 以下保持原有业务逻辑不变
  // ============================================================

  useEffect(() => {
    if (!product?.id || !locale) {
      if (allImages.length > 0) {
        setCurrentMediaIndex(0);
      }
      return;
    }
    setLoadingVideo(true);
    fetch(`/api/front/products/${product.id}/related-resources?locale=${locale}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch resources');
        return res.json();
      })
      .then((data) => {
        const videoItems = data.videos || [];
        const parsedVideos: MediaItem[] = videoItems
          .filter((v: any) => v.url && v.url.trim() !== '')
          .map((v: any) => ({
            type: 'video',
            url: v.url,
            thumbnail: v.thumbnail || '',
            title: v.title || '',
          }));
        setVideos(parsedVideos);
        setCurrentMediaIndex(0);
      })
      .catch((err) => {
        console.error('[ProductDetails] 获取视频失败:', err);
        setVideos([]);
        setCurrentMediaIndex(0);
      })
      .finally(() => setLoadingVideo(false));
  }, [product?.id, locale, allImages]);

  useEffect(() => {
    if (mediaList.length > 0 && currentMediaIndex >= mediaList.length) {
      setCurrentMediaIndex(0);
    }
  }, [mediaList, currentMediaIndex]);

  const goPrev = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentMediaIndex((prev) => (prev === 0 ? mediaList.length - 1 : prev - 1));
  }, [mediaList.length]);

  const goNext = useCallback(() => {
    if (mediaList.length === 0) return;
    setCurrentMediaIndex((prev) => (prev === mediaList.length - 1 ? 0 : prev + 1));
  }, [mediaList.length]);

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentMediaIndex(index);
  }, []);

  const getVariantUrl = useCallback(
    (variant: any) => {
      const baseUrl = urlPattern === 'id-slug'
        ? `/${locale}/product/${product.id}/${product.slug}`
        : `/${locale}/product/${product.slug}`;
      return `${baseUrl}?variant=${variant.id}`;
    },
    [locale, urlPattern, product.id, product.slug]
  );

  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>(() => {
    if (variantId) return { [variantId]: true };
    return {};
  });

  const toggleVariant = useCallback((variantId: string) => {
    setExpandedVariants((prev) => ({ ...prev, [variantId]: !prev[variantId] }));
  }, []);

  const renderPriceTiers = useCallback(
    (tiers: any[], currency: string) => {
      if (!tiers || tiers.length === 0) {
        return (
          <div style={{ color: 'var(--muted-foreground, #64748b)' }}>
            {t('inquiry')}
          </div>
        );
      }
      return (
        <div
          className="flex flex-wrap"
          style={{
            columnGap: 'var(--spacing-6, 1.5rem)',
            rowGap: 'var(--spacing-3, 0.75rem)',
          }}
        >
          {tiers.map((tier, idx) => {
            const { min_qty, max_qty, price } = tier;
            let rangeText = '';
            if (max_qty === null || max_qty === undefined) {
              rangeText = t('priceTiers.min', { min: min_qty });
            } else {
              rangeText = t('priceTiers.range', { min: min_qty, max: max_qty });
            }
            return (
              <div key={idx} className="price-item">
                <div
                  className="flex flex-col font-bold"
                  style={{
                    fontSize: '26px',
                    color: priceColor,
                  }}
                >
                  <span>
                    {currency} {price.toFixed(2)}
                  </span>
                </div>
                <div
                  className="whitespace-nowrap"
                  style={{
                    marginTop: 'var(--spacing-1, 0.25rem)',
                    marginBottom: 0,
                    fontSize: 'var(--font-size-sm, 0.875rem)',
                    color: priceRangeColor,
                  }}
                >
                  {rangeText}
                </div>
              </div>
            );
          })}
        </div>
      );
    },
    [t, priceColor, priceRangeColor]
  );

  const renderAttributeValue = useCallback((value: any) => {
    const str = String(value);
    const urlMatch = str.match(/(https?:\/\/[^\s]+)/);
    if (urlMatch) {
      return (
        <a
          href={urlMatch[0]}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--primary, #1e293b)',
            textDecoration: 'underline',
            transition: COLOR_TRANSITION,
          }}
        >
          查看
        </a>
      );
    }
    return str;
  }, []);

  const openChat = useCallback(() => {
    const chatBtn = document.getElementById('chat-toggle-btn') as HTMLButtonElement;
    if (chatBtn) {
      chatBtn.click();
      return;
    }
    const chatBtn2 = document.querySelector('button[aria-label="打开聊天"]') as HTMLButtonElement;
    if (chatBtn2) {
      chatBtn2.click();
      return;
    }
    const chatBtn3 = document.querySelector('.fixed.bottom-6.right-6') as HTMLButtonElement;
    if (chatBtn3) {
      chatBtn3.click();
      return;
    }
    window.dispatchEvent(new CustomEvent('openChat'));
  }, []);

  const productForInquiry = useMemo(
    () => ({
      name: displayProduct.product_name || '',
      imageUrl: displayProduct.main_image_url || '',
      brand: displayProduct.brand || '',
      slug: displayProduct.slug,
      locale: displayProduct.locale || locale,
    }),
    [displayProduct, locale]
  );

  const variants = product.variants || [];
  const isVariant = product.isVariant === true;
  const productAttributes = displayProduct.attributes || {};
  const hasAttributes = Object.keys(productAttributes).length > 0;
  const shortDescription = displayProduct.short_description || displayProduct.shortDescription || displayProduct.summary || '';
  const description = displayProduct.description || displayProduct.desc || displayProduct.longDescription || '';

  return (
    <div
      className="mx-auto"
      style={{
        backgroundColor: containerBg,
        color: containerText,
        paddingLeft: 'var(--spacing-4, 1rem)',
        paddingRight: 'var(--spacing-4, 1rem)',
        paddingTop: 'var(--spacing-8, 2rem)',
        paddingBottom: 'var(--spacing-8, 2rem)',
        maxWidth: '80rem',
      }}
    >
      <div
        className="grid grid-cols-1 md:grid-cols-2"
        style={{ gap: 'var(--spacing-8, 2rem)' }}
      >
        {/* 左侧媒体区域 */}
        <div
          className="md:sticky md:top-8 self-start"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-4, 1rem)',
          }}
        >
          <div
            className="relative overflow-hidden aspect-square"
            style={{
              borderRadius: 'var(--radius-lg, 0.75rem)',
              border: `1px solid ${mediaBorder}`,
              backgroundColor: mediaBg,
            }}
          >
            {loadingVideo ? (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ color: 'var(--muted-foreground, #64748b)' }}
              >
                {t('loading')}
              </div>
            ) : displayMedia && displayMedia.url ? (
              <>
                {/* ✅ 上一层媒体（淡出） */}
                {prevMedia && prevMedia.url && (
                  <div
                    className="absolute inset-0"
                    style={{
                      opacity: isTransitioning ? 0 : 1,
                      transition: `opacity ${MEDIA_TRANSITION_MS}ms ease-out`,
                      pointerEvents: 'none',
                      zIndex: 1,
                    }}
                  >
                    {prevMedia.type === 'video' ? (
                      isThirdPartyVideo(prevMedia.url) ? (
                        <iframe
                          src={prevMedia.url}
                          className="w-full h-full object-cover"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        />
                      ) : (
                        <video
                          src={prevMedia.url}
                          className="w-full h-full object-cover"
                          poster={prevMedia.thumbnail || ''}
                          preload="metadata"
                        />
                      )
                    ) : (
                      <img
                        src={prevMedia.url}
                        alt=""
                        className="w-full h-full object-cover"
                        decoding="async"
                      />
                    )}
                  </div>
                )}

                {/* ✅ 当前媒体（淡入 + 轻微放大） */}
                <div
                  className="absolute inset-0"
                  style={{
                    opacity: isTransitioning ? 0 : 1,
                    transform: isTransitioning ? 'scale(1.02)' : 'scale(1)',
                    transition: `opacity ${MEDIA_TRANSITION_MS}ms ease-out, transform ${MEDIA_TRANSITION_MS}ms ease-out`,
                    zIndex: 2,
                  }}
                >
                  {displayMedia.type === 'video' ? (
                    isThirdPartyVideo(displayMedia.url) ? (
                      <iframe
                        src={displayMedia.url}
                        className="w-full h-full object-cover"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <video
                        src={displayMedia.url}
                        controls
                        preload="metadata"
                        className="w-full h-full object-cover"
                        poster={displayMedia.thumbnail || ''}
                      />
                    )
                  ) : (
                    <img
                      src={displayMedia.url}
                      alt={displayProduct.product_name}
                      className="w-full h-full object-cover"
                      decoding="async"
                    />
                  )}
                </div>

                {/* 箭头 + 圆点 */}
                {mediaList.length > 1 && (
                  <>
                    <button
                      onClick={goPrev}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 text-3xl transition"
                      style={{ zIndex: 10 }}
                      aria-label={t('prev')}
                    >
                      ‹
                    </button>
                    <button
                      onClick={goNext}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 text-3xl transition"
                      style={{ zIndex: 10 }}
                      aria-label={t('next')}
                    >
                      ›
                    </button>
                    <div
                      className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1"
                      style={{ zIndex: 10 }}
                    >
                      {mediaList.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-2 h-2 rounded-full transition ${
                            idx === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <img
                src={allImages[0] || '/placeholder.png'}
                alt={displayProduct.product_name}
                className="w-full h-full object-cover"
                decoding="async"
              />
            )}
          </div>

          {mediaList.length > 1 && (
            <div
              className="flex overflow-x-auto"
              style={{
                gap: 'var(--spacing-2, 0.5rem)',
                paddingBottom: 'var(--spacing-2, 0.5rem)',
              }}
            >
              {mediaList.map((media, idx) => {
                const isActive = idx === currentMediaIndex;
                const thumbnailUrl = media.type === 'video'
                  ? (media.thumbnail || '/video-placeholder.png')
                  : media.url;
                return (
                  <button
                    key={idx}
                    onClick={() => handleThumbnailClick(idx)}
                    className="flex-shrink-0 w-20 h-20 border-2 overflow-hidden"
                    style={{
                      borderRadius: 'var(--radius-md, 0.625rem)',
                      borderColor: isActive ? thumbnailActiveBorder : thumbnailBorder,
                      transition: `border-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`,
                    }}
                  >
                    <img
                      src={thumbnailUrl}
                      alt={media.title || ''}
                      className="w-full h-full object-cover"
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      onLoad={() => {
                        // ✅ 缩略图加载后预加载原图（仅图片类型，避免重复加载）
                        if (
                          media.type === 'image' &&
                          media.url &&
                          media.url !== thumbnailUrl
                        ) {
                          const img = new Image();
                          img.src = media.url;
                        }
                      }}
                    />
                    {media.type === 'video' && (
                      <div className="relative w-full h-full flex items-center justify-center -mt-full">
                        <span className="text-white bg-black/50 rounded-full p-1 text-sm">▶</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 右侧内容 */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-6, 1.5rem)',
          }}
        >
          <h1
            style={{
              fontSize: 'var(--font-size-3xl, 1.875rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: titleColor,
            }}
          >
            {displayProduct.product_name}
          </h1>
          {displayProduct.brand && (
            <div style={{ color: brandColor }}>
              {t('brand')}: {displayProduct.brand}
            </div>
          )}

          {displayProduct.price_tiers && displayProduct.price_tiers.length > 0 && (
            <div>{renderPriceTiers(displayProduct.price_tiers, displayProduct.currency)}</div>
          )}

          {shortDescription && shortDescription.trim() && (
            <div style={{ color: containerText }}>{shortDescription}</div>
          )}

          {/* 变体区块 */}
          {!selectedVariant && !isVariant && variants.length > 0 && (
            <div style={{ paddingTop: 'var(--spacing-4, 1rem)' }}>
              <h3
                style={{
                  fontSize: 'var(--font-size-lg, 1.125rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  marginBottom: 'var(--spacing-3, 0.75rem)',
                  color: titleColor,
                }}
              >
                {t('variants')}
              </h3>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-3, 0.75rem)',
                }}
              >
                {variants.map((variant: any) => {
                  const variantAttrs = variant.attributes || {};
                  const hasVariantAttrs = Object.keys(variantAttrs).length > 0;
                  const variantUrl = getVariantUrl(variant);
                  const isExpanded = expandedVariants[variant.id] || false;

                  return (
                    <div
                      key={variant.id}
                      className={hasVariantAttrs ? 'cursor-pointer' : ''}
                      style={{
                        border: `1px solid ${variantBorder}`,
                        backgroundColor: variantBg,
                        borderRadius: 'var(--radius-lg, 0.75rem)',
                        padding: 'var(--spacing-3, 0.75rem)',
                      }}
                      onClick={(e) => {
                        if (hasVariantAttrs && !(e.target as HTMLElement).closest('.variant-detail-button')) {
                          toggleVariant(variant.id);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div
                          className="flex items-center"
                          style={{ gap: 'var(--spacing-2, 0.5rem)' }}
                        >
                          {hasVariantAttrs && (
                            <span
                              style={{
                                color: 'var(--muted-foreground, #64748b)',
                                fontSize: 'var(--font-size-sm, 0.875rem)',
                              }}
                            >
                              {isExpanded ? t('variantAttributes.expand') : t('variantAttributes.collapse')}
                            </span>
                          )}
                          <span
                            className="font-semibold"
                            style={{ color: variantText }}
                          >
                            {variant.product_name}
                          </span>
                        </div>
                        <button
                          className="variant-detail-button whitespace-nowrap"
                          style={{
                            marginLeft: 'var(--spacing-4, 1rem)',
                            color: 'var(--primary, #1e293b)',
                            textDecoration: 'underline',
                            fontSize: 'var(--font-size-sm, 0.875rem)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            transition: COLOR_TRANSITION,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(variantUrl, '_blank');
                          }}
                        >
                          {t('variantDetail')}
                        </button>
                      </div>
                      {hasVariantAttrs && isExpanded && (
                        <div
                          style={{
                            marginTop: 'var(--spacing-2, 0.5rem)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--spacing-1, 0.25rem)',
                            fontSize: 'var(--font-size-sm, 0.875rem)',
                            color: 'var(--muted-foreground, #64748b)',
                          }}
                        >
                          {Object.entries(variantAttrs).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              {renderAttributeValue(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 规格说明 */}
          {product.spec_text && product.spec_text.trim() && (
            <div style={{ paddingTop: 'var(--spacing-4, 1rem)' }}>
              <h3
                style={{
                  fontSize: 'var(--font-size-lg, 1.125rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  marginBottom: 'var(--spacing-2, 0.5rem)',
                  color: titleColor,
                }}
              >
                {t('specTitle')}
              </h3>
              <div
                className="whitespace-pre-wrap"
                style={{
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  color: specTextColor,
                }}
              >
                {product.spec_text}
              </div>
            </div>
          )}

          {/* 按钮 */}
          <div
            className="flex flex-wrap"
            style={{
              gap: 'var(--spacing-4, 1rem)',
              paddingTop: 'var(--spacing-2, 0.5rem)',
            }}
          >
            <button
              onClick={() => setShowInquiryModal(true)}
              style={{
                paddingLeft: 'var(--spacing-6, 1.5rem)',
                paddingRight: 'var(--spacing-6, 1.5rem)',
                paddingTop: 'var(--spacing-2, 0.5rem)',
                paddingBottom: 'var(--spacing-2, 0.5rem)',
                borderRadius: 'var(--radius-md, 0.625rem)',
                backgroundColor: inquiryBg,
                color: inquiryText,
                border: 'none',
                cursor: 'pointer',
                transition: BG_COLOR_TRANSITION,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = inquiryHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = inquiryBg;
              }}
            >
              {t('inquiry')}
            </button>
            <button
              onClick={openChat}
              style={{
                paddingLeft: 'var(--spacing-6, 1.5rem)',
                paddingRight: 'var(--spacing-6, 1.5rem)',
                paddingTop: 'var(--spacing-2, 0.5rem)',
                paddingBottom: 'var(--spacing-2, 0.5rem)',
                borderRadius: 'var(--radius-md, 0.625rem)',
                backgroundColor: chatBg,
                color: chatText,
                border: 'none',
                cursor: 'pointer',
                transition: BG_COLOR_TRANSITION,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = chatHoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = chatBg;
              }}
            >
              {t('chat')}
            </button>
            {storeLinks.map((link: any, idx: number) => {
              if (!link.url || !link.name) return null;
              return (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    paddingLeft: 'var(--spacing-6, 1.5rem)',
                    paddingRight: 'var(--spacing-6, 1.5rem)',
                    paddingTop: 'var(--spacing-2, 0.5rem)',
                    paddingBottom: 'var(--spacing-2, 0.5rem)',
                    borderRadius: 'var(--radius-md, 0.625rem)',
                    border: `1px solid ${storeBorder}`,
                    color: storeText,
                    textDecoration: 'none',
                    transition: BG_COLOR_TRANSITION,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = storeHoverBg;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          {/* 库存物流 */}
          <div style={{ paddingTop: 'var(--spacing-4, 1rem)' }}>
            <h3
              style={{
                fontSize: 'var(--font-size-lg, 1.125rem)',
                fontWeight: 'var(--font-weight-semibold, 600)',
                marginBottom: 'var(--spacing-2, 0.5rem)',
                color: titleColor,
              }}
            >
              {t('stockLogistics')}
            </h3>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-1, 0.25rem)',
                fontSize: 'var(--font-size-sm, 0.875rem)',
                color: stockText,
                listStyle: 'none',
                paddingLeft: 0,
              }}
            >
              <li>
                {t('stockStatus')}: {product.availability === 'in_stock' ? t('inStock') :
                  product.availability === 'out_of_stock' ? t('outOfStock') : t('preOrder')}
              </li>
              <li>
                {t('shipping')}: {product.shipping_cost === 0 ? t('freeShipping') : `${product.currency} ${product.shipping_cost}`}
              </li>
              <li>
                {t('returnDays')}: {product.return_policy_days} {t('days')}
              </li>
            </ul>
          </div>

          {/* 参数 */}
          {hasAttributes && (
            <div style={{ paddingTop: 'var(--spacing-4, 1rem)' }}>
              <h3
                style={{
                  fontSize: 'var(--font-size-lg, 1.125rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  marginBottom: 'var(--spacing-2, 0.5rem)',
                  color: titleColor,
                }}
              >
                {t('params')}
              </h3>
              <dl
                className="grid grid-cols-1"
                style={{
                  gap: 'var(--spacing-1, 0.25rem)',
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                }}
              >
                {Object.entries(productAttributes).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex"
                    style={{
                      paddingTop: 'var(--spacing-1, 0.25rem)',
                      paddingBottom: 'var(--spacing-1, 0.25rem)',
                      borderBottom: `1px solid ${paramsBorder}`,
                    }}
                  >
                    <dt
                      className="font-medium"
                      style={{
                        width: '33.333%',
                        color: paramsLabelColor,
                      }}
                    >
                      {key}:
                    </dt>
                    <dd
                      style={{
                        width: '66.667%',
                        color: paramsValueColor,
                      }}
                    >
                      {renderAttributeValue(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* 描述 */}
          {hasVisibleContent(description) && (
            <div style={{ paddingTop: 'var(--spacing-4, 1rem)' }}>
              <h3
                style={{
                  fontSize: 'var(--font-size-lg, 1.125rem)',
                  fontWeight: 'var(--font-weight-semibold, 600)',
                  marginBottom: 'var(--spacing-2, 0.5rem)',
                  color: titleColor,
                }}
              >
                {t('description')}
              </h3>
              <div
                className="prose max-w-none"
                style={{
                  color: descriptionText,
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                }}
                dangerouslySetInnerHTML={{ __html: description }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 询盘弹窗 */}
      {showInquiryModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: modalOverlay,
            padding: 'var(--spacing-4, 1rem)',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowInquiryModal(false); }}
        >
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto relative"
            style={{
              backgroundColor: modalBg,
              borderRadius: 'var(--radius-lg, 0.75rem)',
              boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1))',
            }}
          >
            <button
              onClick={() => setShowInquiryModal(false)}
              className="absolute flex items-center justify-center hover:bg-gray-100 rounded-full z-10"
              style={{
                top: 'var(--spacing-2, 0.5rem)',
                right: 'var(--spacing-2, 0.5rem)',
                width: '2.5rem',
                height: '2.5rem',
                fontSize: '1.5rem',
                color: modalCloseColor,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label={t('close')}
            >
              ×
            </button>
            <div style={{ padding: 'var(--spacing-6, 1.5rem)' }}>
              <InquiryBlock __runtime={{ product: productForInquiry }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
});