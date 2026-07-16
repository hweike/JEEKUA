'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { parseVideoUrl, getVideoEmbedUrl } from '@/lib/video-utils';
import { DEFAULT_VIDEO } from '@/lib/webbuilder/defaults/Video';
import { getAltSuffix } from '@/lib/webbuilder/alt-suffix-config';
import { getImageUrl } from '@/lib/files/url';

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
    // 顶层扁平字段（兼容旧数据）
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

  // 获取 mobileScaleFactor
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

  // ===== 响应式字体（引入 mobileScaleFactor） =====
  const titleSizeStyle = {
    fontSize: `clamp(${titleFontSize * mobileScaleFactor}px, 3vw, ${titleFontSize}px)`,
    color: titleColor,
    textAlign: titleAlign,
    marginBottom: '1rem',
    wordBreak: 'break-word',
  };

  // 填充：使用 clamp 以用户设置值为首选
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

  // 无封面自动播放
  useEffect(() => {
    if (!isEditMode && videoUrl && embedUrl && !thumbnailUrl && !showVideo) {
      setShowVideo(true);
    }
  }, [isEditMode, videoUrl, embedUrl, thumbnailUrl, showVideo]);

  // ===== 通栏宽度统一（参考 PicwithText） =====
  const isFullwidth = bannerType === 'fullwidth';

  // 外层容器样式：标准模式限制宽度，全屏模式全屏背景
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

  // 内容包装器：统一左右内边距，与 PicwithText 一致
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
    // 1. 无视频 URL：显示灰色占位
    if (!videoUrl) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50 w-full h-full flex items-center justify-center">
          {isEditMode ? '〖视频组件 - 请添加视频 URL〗' : '暂无视频内容'}
        </div>
      );
    }

    // 2. 有封面且未播放（非编辑模式）
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

    // 3. 播放中或编辑模式：显示 iframe
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

    // 4. 视频解析失败
    if (isParsingFailed) {
      return (
        <div className="flex items-center justify-center h-full text-white bg-black rounded-lg">
          无法解析视频 URL，请检查链接
        </div>
      );
    }

    // 5. 其他情况
    return (
      <div className="flex items-center justify-center h-full text-gray-400 bg-gray-50 rounded-lg">
        暂无视频内容
      </div>
    );
  };

  // ===== 渲染主体 =====
  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          {title && (
            <div className="max-w-full mx-auto">
              <div style={titleSizeStyle}>{title}</div>
            </div>
          )}
          <div className="max-w-full mx-auto">
            <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
              {renderVideoArea()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}