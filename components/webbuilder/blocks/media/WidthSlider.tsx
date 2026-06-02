'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocale } from 'next-intl';

export function WidthSlider({ height, autoplay, images, puck, __runtime }: any) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isEditMode = !!puck?.isEditing;
  const slideCount = images?.length || 0;
  const pageLocale = useLocale();

  // 编辑器内预览语言（从 localStorage 同步）
  const [editLocale, setEditLocale] = useState<string>(() => {
    if (typeof window !== 'undefined' && isEditMode) {
      const stored = localStorage.getItem('webbuilder_edit_locale');
      if (stored && (stored === 'zh' || stored === 'en')) return stored;
    }
    return pageLocale;
  });

  useEffect(() => {
    if (!isEditMode) return;
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'webbuilder_edit_locale') {
        const newLocale = e.newValue;
        if (newLocale && (newLocale === 'zh' || newLocale === 'en')) {
          setEditLocale(newLocale);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isEditMode]);

  useEffect(() => {
    if (!isEditMode) return;
    const stored = localStorage.getItem('webbuilder_edit_locale');
    if (!stored) setEditLocale(pageLocale);
  }, [pageLocale, isEditMode]);

  const displayLocale = isEditMode ? editLocale : pageLocale;

  useEffect(() => {
    if (isEditMode || autoplay === 'none' || slideCount <= 1) return;
    const interval = autoplay === '5s' ? 5000 : 10000;
    timerRef.current = setInterval(() => {
      setTransitioning(true);
      setCurrentSlide((prev) => (prev + 1) % slideCount);
      setTimeout(() => setTransitioning(false), 500);
    }, interval);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isEditMode, autoplay, slideCount]);

  const goToPrev = () => {
    if (transitioning) return;
    setTransitioning(true);
    setCurrentSlide((prev) => (prev === 0 ? slideCount - 1 : prev - 1));
    setTimeout(() => setTransitioning(false), 500);
  };
  const goToNext = () => {
    if (transitioning) return;
    setTransitioning(true);
    setCurrentSlide((prev) => (prev + 1) % slideCount);
    setTimeout(() => setTransitioning(false), 500);
  };

  if (slideCount === 0 && isEditMode) {
    return (
      <div
        ref={puck?.dragRef}
        style={{ height: `${height}px`, width: '100%' }}
        className="bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed"
      >
        〖宽度限定的幻灯片 - 请添加图片〗
      </div>
    );
  }
  if (slideCount === 0) return null;

  const currentImage = images[currentSlide];
  const hasValidImage = currentImage.imageUrl?.trim();

  // 增强的文本获取：带降级策略（完全参照 FullwidthSlider）
  const getText = (field: 'title' | 'subtitle' | 'buttonText') => {
    const fieldObj = currentImage[field];
    if (!fieldObj) return '';
    // 1. 当前显示语言
    if (fieldObj[displayLocale]) return fieldObj[displayLocale];
    // 2. 降级到英文
    if (fieldObj.en) return fieldObj.en;
    // 3. 降级到中文
    if (fieldObj.zh) return fieldObj.zh;
    // 4. 返回空
    return '';
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '80rem',
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '0.5rem',
  };

  const slideStyle: React.CSSProperties = {
    height: `${height}px`,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  };

  const contentContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    position: 'relative',
  };

  const getContentPositionStyle = (pos: string): React.CSSProperties => {
    const [vertical, horizontal] = pos.split('-');
    const style: React.CSSProperties = {
      position: 'absolute',
      padding: '2rem',
      boxSizing: 'border-box',
      zIndex: 10,
    };
    if (vertical === 'top') style.top = '10%';
    else if (vertical === 'center') style.top = '50%';
    else style.bottom = '10%';

    if (horizontal === 'left') style.left = '5%';
    else if (horizontal === 'center') {
      style.left = '50%';
      style.transform = 'translateX(-50%)';
    } else style.right = '5%';

    if (vertical === 'center' && horizontal !== 'center') {
      style.transform = `translateY(-50%) ${style.transform || ''}`;
    }
    if (vertical === 'center' && horizontal === 'center') {
      style.transform = 'translate(-50%, -50%)';
    }
    return style;
  };

  const getTextAlignStyle = (align: string): React.CSSProperties => ({
    textAlign: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left',
  });

  return (
    <div ref={puck?.dragRef} className="py-4">
      <div style={containerStyle}>
        <div style={slideStyle}>
          <div
            className="absolute inset-0 transition-opacity duration-500"
            style={{ opacity: transitioning ? 0 : 1 }}
          >
            {hasValidImage ? (
              <img src={currentImage.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                暂无图片
              </div>
            )}
          </div>

          <div style={contentContainerStyle}>
            <div style={getContentPositionStyle(currentImage.contentPosition)}>
              <div style={getTextAlignStyle(currentImage.desktopAlign)} className="text-white">
                {getText('title') && (
                  <h2
                    style={{
                      fontSize: `${currentImage.titleFontSize}px`,
                      color: currentImage.titleColor,
                      marginBottom: '0.25rem',
                    }}
                  >
                    {getText('title')}
                  </h2>
                )}
                {getText('subtitle') && (
                  <p
                    style={{
                      fontSize: `${currentImage.subtitleFontSize}px`,
                      color: currentImage.subtitleColor,
                      marginBottom: '0.5rem',
                    }}
                  >
                    {getText('subtitle')}
                  </p>
                )}
                {/* 修复按钮显示：只要有按钮文字就显示，无链接时置灰 */}
                {getText('buttonText') && (
                  currentImage.buttonLink ? (
                    <a
                      href={currentImage.buttonLink}
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {getText('buttonText')}
                    </a>
                  ) : (
                    <span className="inline-block bg-gray-400 text-white px-6 py-2 rounded-md cursor-default">
                      {getText('buttonText')}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>

          {(slideCount > 1 || isEditMode) && (
            <>
              <button
                onClick={goToPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
              >
                <ChevronLeft size={24} />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition"
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}
          {slideCount > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    setTransitioning(true);
                    setCurrentSlide(idx);
                    setTimeout(() => setTransitioning(false), 500);
                  }}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    idx === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}