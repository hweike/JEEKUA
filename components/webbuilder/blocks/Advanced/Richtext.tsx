'use client';

import { useState, useEffect, useRef } from 'react';
import { DEFAULT_RICHTEXT } from '@/lib/webbuilder/defaults/Richtext';

// ✅ 入场动画参数（硬编码）
const ANIMATION_DURATION_MS = 700;
const TITLE_DELAY_MS = 0;
const TEXT_DELAY_MS = 100;
const BUTTON_DELAY_MS = 200;

export function Richtext(props: any) {
  const isEditMode = !!props.puck?.isEditing;

  // 合并默认值和传入值，确保所有字段存在
  const mergedBannerType = props.bannerType ?? DEFAULT_RICHTEXT.bannerType;
  const mergedBackgroundColor = props.backgroundColor ?? DEFAULT_RICHTEXT.backgroundColor;
  const mergedTitleGroup = { ...DEFAULT_RICHTEXT.titleGroup, ...props.titleGroup };
  const mergedTextGroup = { ...DEFAULT_RICHTEXT.textGroup, ...props.textGroup };
  const mergedButton1Group = { ...DEFAULT_RICHTEXT.button1Group, ...props.button1Group };
  const mergedButton2Group = { ...DEFAULT_RICHTEXT.button2Group, ...props.button2Group };
  const mergedButtonStyleGroup = { ...DEFAULT_RICHTEXT.buttonStyleGroup, ...props.buttonStyleGroup };
  const mergedLayoutGroup = { ...DEFAULT_RICHTEXT.layoutGroup, ...props.layoutGroup };
  const mergedPaddingGroup = { ...DEFAULT_RICHTEXT.paddingGroup, ...props.paddingGroup };
  const mergedSpacingGroup = { ...DEFAULT_RICHTEXT.spacingGroup, ...props.spacingGroup };

  const {
    title,
    titleFontSize,
    titleColor,
  } = mergedTitleGroup;

  const {
    text,
    textFontSize,
    textColor,
  } = mergedTextGroup;

  const {
    button1Text,
    button1Color,
    button1Link,
    button1FontSize,
  } = mergedButton1Group;

  const {
    button2Text,
    button2Color,
    button2Link,
    button2FontSize,
  } = mergedButton2Group;

  const {
    buttonPaddingX,
    buttonPaddingY,
    buttonBorderRadius,
  } = mergedButtonStyleGroup;

  const {
    contentPosition,
    textAlign,
  } = mergedLayoutGroup;

  const {
    containerPaddingTop,
    containerPaddingBottom,
  } = mergedPaddingGroup;

  const {
    titleMarginBottom,
    textMarginBottom,
    buttonGap,
    mobileScaleFactor,
  } = mergedSpacingGroup;

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

  // 自适应字体
  const titleFontSizeClamp = `clamp(${titleFontSize * mobileScaleFactor}px, 4vw, ${titleFontSize}px)`;
  const textFontSizeClamp = `clamp(${textFontSize * mobileScaleFactor}px, 2.5vw, ${textFontSize}px)`;
  const button1FontSizeClamp = `clamp(${button1FontSize * mobileScaleFactor}px, 2vw, ${button1FontSize}px)`;
  const button2FontSizeClamp = `clamp(${button2FontSize * mobileScaleFactor}px, 2vw, ${button2FontSize}px)`;

  // 统一通栏宽度控制
  const outerStyle: React.CSSProperties = {
    backgroundColor: mergedBackgroundColor,
    ...(mergedBannerType === 'fullwidth'
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
    ...(mergedBannerType === 'standard' ? { marginTop: '10px', marginBottom: '10px' } : {}),
  };

  const outerClasses = 'relative overflow-hidden';

  const contentPaddingStyle: React.CSSProperties = {
    paddingTop: `${containerPaddingTop}px`,
    paddingBottom: `${containerPaddingBottom}px`,
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  const baseButtonStyle = {
    padding: `${buttonPaddingY}px ${buttonPaddingX}px`,
    borderRadius: `${buttonBorderRadius}px`,
    display: 'inline-block',
    transition: 'opacity 0.2s',
    textDecoration: 'none',
    cursor: 'pointer',
    color: '#fff',
    textAlign: textAlign as 'left' | 'center' | 'right',
  };

  // ✅ 通用入场动画样式
  const enterStyle = (delayMs: number): React.CSSProperties => ({
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity ${ANIMATION_DURATION_MS}ms ease-out ${delayMs}ms, transform ${ANIMATION_DURATION_MS}ms ease-out ${delayMs}ms`,
    willChange: 'opacity, transform',
  });

  if (isEditMode && !title && !text && !button1Text && !button2Text) {
    return (
      <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
        <div className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400">
          〖富文本横幅 - 请添加内容〗
        </div>
      </div>
    );
  }

  const renderContent = () => (
    <div style={{ ...contentPaddingStyle, textAlign }}>
      {title && (
        <div
          style={{
            fontSize: titleFontSizeClamp,
            color: titleColor,
            marginBottom: `${titleMarginBottom}px`,
            ...enterStyle(TITLE_DELAY_MS),
          }}
        >
          {title}
        </div>
      )}
      {text && (
        <div
          style={{
            fontSize: textFontSizeClamp,
            color: textColor,
            marginBottom: `${textMarginBottom}px`,
            ...enterStyle(TEXT_DELAY_MS),
          }}
        >
          {text}
        </div>
      )}
      <div
        className="flex flex-wrap"
        style={{
          justifyContent: textAlign === 'center' ? 'center' : textAlign === 'right' ? 'flex-end' : 'flex-start',
          gap: `${buttonGap}px`,
          ...enterStyle(BUTTON_DELAY_MS),
        }}
      >
        {button1Text && (
          button1Link ? (
            <a
              href={button1Link}
              style={{
                ...baseButtonStyle,
                backgroundColor: button1Color,
                fontSize: button1FontSizeClamp,
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {button1Text}
            </a>
          ) : (
            <span
              style={{
                ...baseButtonStyle,
                backgroundColor: button1Color,
                fontSize: button1FontSizeClamp,
                opacity: 0.6,
                cursor: 'default',
              }}
            >
              {button1Text}
            </span>
          )
        )}
        {button2Text && (
          button2Link ? (
            <a
              href={button2Link}
              style={{
                ...baseButtonStyle,
                backgroundColor: button2Color,
                fontSize: button2FontSizeClamp,
              }}
              target="_blank"
              rel="noopener noreferrer"
            >
              {button2Text}
            </a>
          ) : (
            <span
              style={{
                ...baseButtonStyle,
                backgroundColor: button2Color,
                fontSize: button2FontSizeClamp,
                opacity: 0.6,
                cursor: 'default',
              }}
            >
              {button2Text}
            </span>
          )
        )}
      </div>
    </div>
  );

  const contentJustify =
    contentPosition === 'left' ? 'flex-start' : contentPosition === 'right' ? 'flex-end' : 'center';

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full" ref={containerRef}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%' }}>
          <div
            className="flex"
            style={{
              alignItems: 'center',
              minHeight: '200px',
              width: '90%',
              margin: '0 auto',
              justifyContent: contentJustify,
            }}
          >
            <div style={{ maxWidth: '100%' }}>{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}