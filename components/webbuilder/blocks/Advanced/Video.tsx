'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { parseVideoUrl, getVideoEmbedUrl } from '@/lib/video-utils';

export function Video(props: any) {
  // 智能提取视频 URL：顶层 > videoSettings > videoGroup
  const finalVideoUrl =
    props.videoUrl ??
    props.videoSettings?.videoUrl ??
    props.videoGroup?.videoUrl ??
    '';

  const finalLoop =
    props.loop ??
    props.videoSettings?.loop ??
    props.videoGroup?.loop ??
    false;

  const finalThumbnail =
    props.videoThumbnail ??
    props.videoSettings?.videoThumbnail ??
    props.videoGroup?.videoThumbnail ??
    '';

  // 调试输出（可删除）
  console.log('[Video] finalVideoUrl:', finalVideoUrl);

  const [showVideo, setShowVideo] = useState(false);
  const [embedUrl, setEmbedUrl] = useState<string>('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [isClient, setIsClient] = useState(false);
  const [isParsingFailed, setIsParsingFailed] = useState(false); // 标记解析失败

  const isEditMode = !!props.puck?.isEditing;
  const pageLocale = useLocale();

  const [editLocale, setEditLocale] = useState<string>(() => {
    if (typeof window !== 'undefined' && isEditMode) {
      const stored = localStorage.getItem('webbuilder_edit_locale');
      if (stored && (stored === 'zh' || stored === 'en')) return stored;
    }
    return pageLocale;
  });

  useEffect(() => {
    if (!isEditMode) return;
    const handler = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale') {
        const newLocale = e.newValue;
        if (newLocale && (newLocale === 'zh' || newLocale === 'en')) setEditLocale(newLocale);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) setEditLocale(pageLocale);
  }, [isEditMode, pageLocale]);

  const displayLocale = isEditMode ? editLocale : pageLocale;

  const getText = (field: any) => {
    if (typeof field === 'string') return field;
    if (!field || typeof field !== 'object') return '';
    if (props.__runtime?.texts && field.textId && props.__runtime.texts[field.textId])
      return props.__runtime.texts[field.textId];
    if (field[displayLocale]) return field[displayLocale];
    if (field.en) return field.en;
    if (field.zh) return field.zh;
    return '';
  };

  const titleText = getText(props.title);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 解析视频（仅在客户端或编辑模式执行）
  useEffect(() => {
    if (!isClient && !isEditMode) return;
    if (!finalVideoUrl) {
      setEmbedUrl('');
      setThumbnailUrl('');
      setIsParsingFailed(false);
      return;
    }
    const videoInfo = parseVideoUrl(finalVideoUrl);
    if (videoInfo) {
      setEmbedUrl(getVideoEmbedUrl(videoInfo, finalLoop));
      setThumbnailUrl(finalThumbnail || videoInfo.thumbnailUrl || '');
      setIsParsingFailed(false);
    } else {
      setEmbedUrl('');
      setThumbnailUrl(finalThumbnail || '');
      setIsParsingFailed(true);
    }
  }, [isClient, isEditMode, finalVideoUrl, finalLoop, finalThumbnail]);

  // 如果没有封面且不是编辑模式，直接显示视频（避免点击）
  useEffect(() => {
    if (!isEditMode && finalVideoUrl && embedUrl && !thumbnailUrl && !showVideo) {
      setShowVideo(true);
    }
  }, [isEditMode, finalVideoUrl, embedUrl, thumbnailUrl, showVideo]);

  const outerClasses = `relative overflow-hidden ${
    props.bannerType === 'fullwidth'
      ? 'w-screen left-1/2 right-1/2 -ml-[50vw] mr-[50vw]'
      : 'max-w-7xl mx-auto'
  }`;
  const outerMargin = props.bannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {};

  const outerStyle: React.CSSProperties = {
    backgroundColor: props.backgroundColor,
    ...outerMargin,
  };

  const contentStyle: React.CSSProperties = {
    paddingTop: `${props.paddingTop ?? 0}px`,
    paddingBottom: `${props.paddingBottom ?? 0}px`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: `${props.titleFontSize ?? 32}px`,
    color: props.titleColor ?? '#000000',
    textAlign: props.titleAlign ?? 'left',
    marginBottom: '1rem',
  };

  const centerContainerClass = 'max-w-7xl mx-auto w-full';

  if (isEditMode && !finalVideoUrl) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖视频组件 - 请添加视频 URL〗
        </div>
      </div>
    );
  }

  if (!isClient && !isEditMode) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="relative w-full">
          <div style={contentStyle}>
            <div className={centerContainerClass}>
              {titleText && <div style={titleStyle}>{titleText}</div>}
            </div>
            <div className={centerContainerClass}>
              <div className="aspect-video bg-black rounded-lg flex items-center justify-center text-white">
                加载中...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={contentStyle}>
          <div className={centerContainerClass}>
            {titleText && <div style={titleStyle}>{titleText}</div>}
          </div>
          <div className={centerContainerClass}>
            <div className="aspect-video relative bg-black rounded-lg overflow-hidden">
              {/* 有封面且未播放时显示封面 */}
              {!showVideo && thumbnailUrl && !isEditMode ? (
                <div
                  className="cursor-pointer relative group w-full h-full"
                  onClick={() => setShowVideo(true)}
                >
                  <img
                    src={thumbnailUrl}
                    alt="视频封面"
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
              ) : (showVideo || isEditMode) && embedUrl ? (
                <iframe
                  src={embedUrl}
                  title="Video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="flex items-center justify-center h-full text-white">
                  {isParsingFailed && finalVideoUrl ? '无法解析视频 URL，请检查链接' : '暂无视频内容'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}