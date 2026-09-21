'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { parseVideoUrl, getVideoEmbedUrl } from '@/lib/video-utils';
import { DEFAULT_VIDEO } from '@/lib/webbuilder/defaults/Video';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';
import { getImageUrl } from '@/lib/files/url';

// ✅ 入场动画参数（硬编码）
const ANIMATION_DURATION_MS = 800;
const TITLE_DELAY_MS = 0;
const VIDEO_DELAY_MS = 150;

// 兼容旧多语言数据
function getString(field: any): string {
  if (typeof field === 'string') return field;
  if (field && typeof field === 'object') {
    return field.zh || field.en || '';
  }
  return '';
}

// 图片代理
function getDisplayImageUrl(url: string, isEditMode: boolean): string {
  if (!url) return '';
  const fullUrl = getImageUrl(url);
  if (isEditMode) {
    return `/api/proxy-image?url=${encodeURIComponent(fullUrl)}`;
  }
  return fullUrl;
}

export function Video(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // ===== 解构分组 =====
  const {
    bannerType,
    backgroundColor,
    titleGroup: propTitleGroup,
    videoGroup: propVideoGroup,
    paddingGroup: propPaddingGroup,
    title: oldTitle,
    titleFontSize: oldTitleFontSize,
    titleColor: oldTitleColor,
    titleAlign: oldTitleAlign,
    videoUrl: oldVideoUrl,
    videoThumbnail: oldVideoThumbnail,
    loop: oldLoop,
    paddingTop: oldPaddingTop,
    paddingBottom: oldPaddingBottom,
  } = props;

  const titleGroup = propTitleGroup || {};
  const videoGroup = propVideoGroup || {};
  const paddingGroup = propPaddingGroup || {};

  const mobileScaleFactor = DEFAULT_VIDEO.mobileScaleFactor ?? 0.7;

  const title = getString(titleGroup.title ?? oldTitle ?? DEFAULT_VIDEO.titleGroup.title);
  const titleFontSize = titleGroup.titleFontSize ?? oldTitleFontSize ?? DEFAULT_VIDEO.titleGroup.titleFontSize;
  const titleColor = titleGroup.titleColor ?? oldTitleColor ?? DEFAULT_VIDEO.titleGroup.titleColor;
  const titleAlign = titleGroup.titleAlign ?? oldTitleAlign ?? DEFAULT_VIDEO.titleGroup.titleAlign;

  const videoUrl = videoGroup.videoUrl ?? oldVideoUrl ?? DEFAULT_VIDEO.videoGroup.videoUrl;
  const videoThumbnail = videoGroup.videoThumbnail ?? oldVideoThumbnail ?? DEFAULT_VIDEO.videoGroup.videoThumbnail;
  const loop = videoGroup.loop ?? oldLoop ?? DEFAULT_VIDEO.videoGroup.loop;

  const paddingTop = paddingGroup.paddingTop ?? oldPaddingTop ?? DEFAULT_VIDEO.paddingGroup.paddingTop;
  const paddingBottom = paddingGroup.paddingBottom ?? oldPaddingBottom ?? DEFAULT_VIDEO.paddingGroup.paddingBottom;

  // ===== Alt 自动生成 =====
  const __runtime = props.__runtime || {};
  const seoTitle = __runtime.seoTitle || '';
  const locale = __runtime.locale || 'zh';
  const suffix = getAltSuffix('Video', locale);
  const coverAlt = seoTitle ? `${seoTitle} - ${suffix}` : suffix;

  // ===== 视频解析状态 =====
  const [showVideo, setShowVideo] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isParsingFailed, setIsParsingFailed] = useState(false);

  const displayThumbnail = getDisplayImageUrl(videoThumbnail || '', isEditMode);

  // ✅ 入场动画状态
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    if (isEditMode) {
      setHasEntered(true);
      return;
    }

    const el = containerRef.current;
    if (!el) {
      setHasEntered(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasEntered(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isEditMode]);

  // ===== 响应式字体 =====
  const titleSizeStyle = {
    fontSize: `clamp(${titleFontSize * mobileScaleFactor}px, 3vw, ${titleFontSize}px)`,
    color: titleColor,
    textAlign: titleAlign,
    marginBottom: '1rem',
    wordBreak: 'break-word',
  };

  const paddingTopFinal = typeof paddingTop === 'number' ? `clamp(8px, ${paddingTop}px, 120px)` : 0;
  const paddingBottomFinal = typeof paddingBottom === 'number' ? `clamp(8px, ${paddingBottom}px, 120px)` : 0;

  // ===== 视频解析 =====
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient && !isEditMode) return;
    if (!videoUrl) {
      setEmbedUrl('');
      setThumbnailUrl('');
      setIsParsingFailed(false);
      return;
    }
    const videoInfo = parseVideoUrl(videoUrl);
    if (videoInfo) {
      setEmbedUrl(getVideoEmbedUrl(videoInfo, loop));
      setThumbnailUrl(displayThumbnail || videoInfo.thumbnailUrl || '');
      setIsParsingFailed(false);
    } else {
      setEmbedUrl('');
      setThumbnailUrl(displayThumbnail || '');
      setIsParsingFailed(true);
    }
  }, [isClient, isEditMode, videoUrl, loop, displayThumbnail]);

  useEffect(() => {
    if (!isEditMode && videoUrl && embedUrl && !thumbnailUrl && !showVideo) {
      setShowVideo(true);
    }
  }, [isEditMode, videoUrl, embedUrl, thumbnailUrl, showVideo]);

  // ===== 通栏宽度统一 =====
  const isFullwidth = bannerType === 'fullwidth';

  const outerStyle: React.CSSProperties = {
    backgroundColor: backgroundColor || DEFAULT_VIDEO.backgroundColor,
    ...(isFullwidth
      ? {
          position: 'relative',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100vw',
          maxWidth: '100vw',
        }
      : {
          maxWidth: '80rem',
          marginLeft: 'auto',
          marginRight: 'auto',
        }),
    ...(bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };

  const outerClasses = 'relative overflow-hidden';

  const contentStyle: React.CSSProperties = {
    paddingTop: paddingTopFinal,
    paddingBottom: paddingBottomFinal,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  // ===== 渲染视频区域 =====
  const renderVideoArea = () => {
    if (!videoUrl) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50 w-full h-full flex items-center justify-center">
          {isEditMode ? '〖视频组件 - 请添加视频 URL〗' : '暂无视频内容'}
        </div>
      );
    }

    if (!showVideo && thumbnailUrl && !isEditMode) {
      return (
        <div
          className="cursor-pointer relative group w-full h-full"
          onClick={() => setShowVideo(true)}
        >
          <img
            src={thumbnailUrl}
            alt={coverAlt}
            className="w-full h-full object-cover"
            decoding="async"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition group-hover:bg-black/40">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-black ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      );
    }

    if ((showVideo || isEditMode) && embedUrl) {
      return (
        <iframe
          src={embedUrl}
          title="Video player"
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (isParsingFailed) {
      return (
        <div className="flex items-center justify-center h-full text-white bg-black rounded-lg">
          无法解析视频 URL，请检查链接
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg">
        暂无视频内容
      </div>
    );
  };

  // ✅ 标题入场动画
  const titleEnterStyle: React.CSSProperties = {
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity ${ANIMATION_DURATION_MS}ms ease-out ${TITLE_DELAY_MS}ms, transform ${ANIMATION_DURATION_MS}ms ease-out ${TITLE_DELAY_MS}ms`,
    willChange: 'opacity, transform',
  };

  // ✅ 视频区入场动画
  const videoEnterStyle: React.CSSProperties = {
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity ${ANIMATION_DURATION_MS}ms ease-out ${VIDEO_DELAY_MS}ms, transform ${ANIMATION_DURATION_MS}ms ease-out ${VIDEO_DELAY_MS}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full" ref={containerRef}>
        <div style={contentStyle}>
          {title && (
            <div className="max-w-full mx-auto" style={titleEnterStyle}>
              <div style={titleSizeStyle}>{title}</div>
            </div>
          )}
          <div className="max-w-full mx-auto" style={videoEnterStyle}>
            <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
              {renderVideoArea()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}