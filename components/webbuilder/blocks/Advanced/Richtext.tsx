'use client';

import { useState, useEffect } from 'react';
import { DEFAULT_RICHTEXT } from '@/lib/webbuilder/defaults/Richtext';

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

  // 自适应字体：与 PicwithText 统一，使用 mobileScaleFactor 作为最小值基数
  const titleFontSizeClamp = `clamp(${titleFontSize * mobileScaleFactor}px, 4vw, ${titleFontSize}px)`;
  const textFontSizeClamp = `clamp(${textFontSize * mobileScaleFactor}px, 2.5vw, ${textFontSize}px)`;
  const button1FontSizeClamp = `clamp(${button1FontSize * mobileScaleFactor}px, 2vw, ${button1FontSize}px)`;
  const button2FontSizeClamp = `clamp(${button2FontSize * mobileScaleFactor}px, 2vw, ${button2FontSize}px)`;

  // 统一通栏宽度控制：与 PicwithText 完全一致
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

  // 内容内边距：与 PicwithText 统一（clamp 自适应）
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

  const contentJustify = contentPosition === 'left' ? 'flex-start' : contentPosition === 'right' ? 'flex-end' : 'center';

  return (
    <div ref={props.puck?.dragRef} className={outerClasses} style={outerStyle}>
      <div className="relative w-full">
        <div style={{ maxWidth: '80rem', margin: '0 auto', width: '100%' }}>
          <div
            className="flex"
            style={{
              alignItems: 'center',
              minHeight: '200px',
              width: '90%',
              margin: '0 auto',          // ✅ 添加这一行
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