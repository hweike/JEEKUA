'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getImageUrl } from '@/lib/files/url';

// ✅ 入场动画参数（硬编码）
const ENTER_ANIMATION_DURATION_MS = 700;
const ENTER_TAB_DELAY_MS = 0;
const ENTER_CONTENT_DELAY_MS = 150;
const ENTER_IMAGE_DELAY_MS = 200;

interface TabContentItem {
  id: string;
  title: string;
  description: string;
  tag: string;
  tagColor: string;
}

interface TabItem {
  id: string;
  label: string;
  items: TabContentItem[];
  primaryButtonText: string;
  primaryButtonLink: string;
  outlineButtonText: string;
  outlineButtonLink: string;
  imageUrl: string;
  floatingIcons: any[];
}

interface TabbedContentBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  tabGroup: {
    tabTextColor: string;
    tabActiveColor: string;
    tabActiveBorderColor: string;
    tabFontSize: number;
    tabAlign: 'left' | 'center' | 'right';
    tabBgColor: string;
    tabActiveBgColor: string;
    tabBorderColor: string;
    tabActiveBorderColorValue: string;
    tabShowBorder: boolean;
    tabBorderRadius: number;
    tabPaddingX: number;
    tabPaddingY: number;
  };
  contentGroup: {
    itemTitleColor: string;
    itemTitleFontSize: number;
    itemDescColor: string;
    itemDescFontSize: number;
    itemGap: number;
  };
  buttonGroup: {
    primaryButtonColor: string;
    primaryButtonTextColor: string;
    outlineButtonColor: string;
    buttonFontSize: number;
    buttonPaddingX: number;
    buttonPaddingY: number;
    buttonBorderRadius: number;
  };
  imageGroup: {
    imageWidth: 'small' | 'medium' | 'large';
    imageRadius: number;
    showFloatingIcons: boolean;
    floatingIconWidth: number;
    imageHoverZoom: boolean;
  };
  layoutGroup: {
    contentPosition: 'left' | 'right';
    verticalAlign: 'top' | 'center' | 'bottom';
  };
  paddingGroup: {
    paddingTop: number;
    paddingBottom: number;
  };
  spacingGroup: {
    mobileScaleFactor: number;
  };
  tabs: TabItem[];
  puck?: any;
}

const IMAGE_WIDTH_MAP: Record<string, string> = {
  small: 'w-full md:w-2/5',
  medium: 'w-full md:w-1/2',
  large: 'w-full md:w-3/5',
};

export function TabbedContentBlock(props: TabbedContentBlockProps) {
  const {
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    tabGroup = {
      tabTextColor: '#666666',
      tabActiveColor: '#000000',
      tabActiveBorderColor: '#3b82f6',
      tabFontSize: 18,
      tabAlign: 'center',
      tabBgColor: '#f3f4f6',
      tabActiveBgColor: '#3b82f6',
      tabBorderColor: '#e5e7eb',
      tabActiveBorderColorValue: '#3b82f6',
      tabShowBorder: false,
      tabBorderRadius: 8,
      tabPaddingX: 24,
      tabPaddingY: 10,
    },
    contentGroup = {
      itemTitleColor: '#000000',
      itemTitleFontSize: 24,
      itemDescColor: '#666666',
      itemDescFontSize: 16,
      itemGap: 24,
    },
    buttonGroup = {
      primaryButtonColor: '#3b82f6',
      primaryButtonTextColor: '#ffffff',
      outlineButtonColor: '#3b82f6',
      buttonFontSize: 16,
      buttonPaddingX: 32,
      buttonPaddingY: 12,
      buttonBorderRadius: 8,
    },
    imageGroup = {
      imageWidth: 'medium',
      imageRadius: 12,
      showFloatingIcons: true,
      floatingIconWidth: 64,
      imageHoverZoom: true,
    },
    layoutGroup = {
      contentPosition: 'left',
      verticalAlign: 'center',
    },
    paddingGroup = { paddingTop: 48, paddingBottom: 48 },
    spacingGroup = { mobileScaleFactor: 0.8 },
    tabs = [],
    puck,
  } = props;

  // 规范化 tabGroup
  const safeTabGroup = {
    tabTextColor: tabGroup?.tabTextColor ?? '#666666',
    tabActiveColor: tabGroup?.tabActiveColor ?? '#ffffff',
    tabActiveBorderColor: tabGroup?.tabActiveBorderColor ?? '#3b82f6',
    tabFontSize: tabGroup?.tabFontSize ?? 16,
    tabAlign: tabGroup?.tabAlign ?? 'center',
    tabBgColor: tabGroup?.tabBgColor ?? '#f3f4f6',
    tabActiveBgColor: tabGroup?.tabActiveBgColor ?? '#3b82f6',
    tabBorderColor: tabGroup?.tabBorderColor ?? '#e5e7eb',
    tabActiveBorderColorValue:
      tabGroup?.tabActiveBorderColorValue ?? tabGroup?.tabActiveBorderColor ?? '#3b82f6',
    tabShowBorder: tabGroup?.tabShowBorder ?? false,
    tabBorderRadius: tabGroup?.tabBorderRadius ?? 8,
    tabPaddingX: tabGroup?.tabPaddingX ?? 24,
    tabPaddingY: tabGroup?.tabPaddingY ?? 10,
  };

  // 规范化 imageGroup
  const safeImageGroup = {
    imageWidth: imageGroup?.imageWidth ?? 'medium',
    imageRadius: imageGroup?.imageRadius ?? 12,
    showFloatingIcons: imageGroup?.showFloatingIcons ?? true,
    floatingIconWidth:
      typeof imageGroup?.floatingIconWidth === 'number' && imageGroup.floatingIconWidth > 0
        ? imageGroup.floatingIconWidth
        : 64,
    imageHoverZoom: imageGroup?.imageHoverZoom !== false,
  };

  const isEditMode = !!puck?.isEditing;
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevTabsRef = useRef<any[]>(tabs);

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

  // 编辑联动
  useEffect(() => {
    if (!isEditMode || tabs.length === 0) return;

    const prev = prevTabsRef.current;
    let changedIndex = -1;

    for (let i = 0; i < Math.min(prev.length, tabs.length); i++) {
      if (JSON.stringify(prev[i]) !== JSON.stringify(tabs[i])) {
        changedIndex = i;
        break;
      }
    }

    if (changedIndex === -1 && prev.length !== tabs.length) {
      changedIndex = tabs.length - 1;
    }

    if (changedIndex !== -1 && changedIndex !== activeTabIndex) {
      setActiveTabIndex(changedIndex);
    }

    prevTabsRef.current = tabs;
  }, [isEditMode, tabs, activeTabIndex]);

  useEffect(() => {
    if (activeTabIndex >= tabs.length) {
      setActiveTabIndex(0);
    }
  }, [tabs.length, activeTabIndex]);

  if (!tabs || tabs.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖标签图文切换 - 请添加标签〗
      </div>
    );
  }

  const isFullwidth = bannerType === 'fullwidth';
  const outerStyle: React.CSSProperties = {
    backgroundColor,
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

  const innerStyle: React.CSSProperties = {
    paddingTop: `${paddingGroup.paddingTop}px`,
    paddingBottom: `${paddingGroup.paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  const activeTab = tabs[activeTabIndex] || tabs[0];

  const handleTabChange = (index: number) => {
    if (index === activeTabIndex) return;
    setIsAnimating(true);
    setTimeout(() => {
      setActiveTabIndex(index);
      setTimeout(() => setIsAnimating(false), 50);
    }, 200);
  };

  const verticalAlignClass =
    layoutGroup.verticalAlign === 'top'
      ? 'items-start'
      : layoutGroup.verticalAlign === 'bottom'
      ? 'items-end'
      : 'items-center';

  const isContentLeft = layoutGroup.contentPosition === 'left';
  const contentOrderClass = isContentLeft ? 'md:order-1' : 'md:order-2';
  const imageOrderClass = isContentLeft ? 'md:order-2' : 'md:order-1';

  const tabAlignClass =
    safeTabGroup.tabAlign === 'left'
      ? 'justify-start'
      : safeTabGroup.tabAlign === 'right'
      ? 'justify-end'
      : 'justify-center';

  // ✅ 入场动画样式
  const tabBarEnterStyle: React.CSSProperties = {
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_TAB_DELAY_MS}ms, transform ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_TAB_DELAY_MS}ms`,
    willChange: 'opacity, transform',
  };

  const contentEnterStyle: React.CSSProperties = {
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_CONTENT_DELAY_MS}ms, transform ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_CONTENT_DELAY_MS}ms`,
    willChange: 'opacity, transform',
  };

  const imageEnterStyle: React.CSSProperties = {
    opacity: hasEntered ? 1 : 0,
    transform: hasEntered ? 'translateY(0)' : 'translateY(32px)',
    transition: `opacity ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_IMAGE_DELAY_MS}ms, transform ${ENTER_ANIMATION_DURATION_MS}ms ease-out ${ENTER_IMAGE_DELAY_MS}ms`,
    willChange: 'opacity, transform',
  };

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      <div ref={containerRef} style={innerStyle}>
        {/* ✅ 标签栏（延迟 0ms） */}
        <div
          className={`flex flex-wrap ${tabAlignClass} gap-3 md:gap-4 mb-10`}
          style={tabBarEnterStyle}
        >
          {tabs.map((tab, idx) => {
            const isActive = idx === activeTabIndex;
            return (
              <button
                key={`tab-${idx}-${tab.id || ''}`}
                onClick={() => handleTabChange(idx)}
                className="transition-all duration-200"
                style={{
                  fontSize: `${safeTabGroup.tabFontSize}px`,
                  color: isActive ? safeTabGroup.tabActiveColor : safeTabGroup.tabTextColor,
                  backgroundColor: isActive
                    ? safeTabGroup.tabActiveBgColor
                    : safeTabGroup.tabBgColor,
                  border: safeTabGroup.tabShowBorder
                    ? `1px solid ${
                        isActive
                          ? safeTabGroup.tabActiveBorderColorValue
                          : safeTabGroup.tabBorderColor
                      }`
                    : 'none',
                  borderRadius: `${safeTabGroup.tabBorderRadius}px`,
                  padding: `${safeTabGroup.tabPaddingY}px ${safeTabGroup.tabPaddingX}px`,
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = safeTabGroup.tabActiveBgColor;
                    e.currentTarget.style.color = safeTabGroup.tabActiveColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = safeTabGroup.tabBgColor;
                    e.currentTarget.style.color = safeTabGroup.tabTextColor;
                  }
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ✅ 内容区：外层做入场动画，内层做切换动画 */}
        <div style={contentEnterStyle}>
          <div
            className={`flex flex-col ${isContentLeft ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 ${verticalAlignClass}`}
            style={{
              opacity: isAnimating ? 0 : 1,
              transform: isAnimating ? 'translateY(8px)' : 'translateY(0)',
              transition: 'opacity 0.25s ease-in-out, transform 0.25s ease-in-out',
            }}
          >
            {/* ✅ 左侧文字内容（移动端 order-2，图片在下） */}
            <div className={`flex-1 order-2 ${contentOrderClass}`}>
              <div className="flex flex-col" style={{ gap: `${contentGroup.itemGap}px` }}>
                {(activeTab.items || []).map((item, idx) => (
                  <div key={`item-${idx}-${item.id || ''}`}>
                    <h3
                      className="font-bold mb-2 flex flex-wrap items-center gap-2"
                      style={{
                        fontSize: `${contentGroup.itemTitleFontSize}px`,
                        color: contentGroup.itemTitleColor,
                      }}
                    >
                      <span>{item.title}</span>
                      {item.tag && (
                        <span
                          className="text-sm font-normal"
                          style={{ color: item.tagColor || '#3b82f6' }}
                        >
                          {item.tag}
                        </span>
                      )}
                    </h3>
                    <p
                      style={{
                        fontSize: `${contentGroup.itemDescFontSize}px`,
                        color: contentGroup.itemDescColor,
                        lineHeight: 1.7,
                      }}
                    >
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* 按钮组 */}
              {(activeTab.primaryButtonText || activeTab.outlineButtonText) && (
                <div className="flex flex-wrap gap-4 mt-8">
                  {activeTab.primaryButtonText &&
                    (activeTab.primaryButtonLink ? (
                      <a
                        href={activeTab.primaryButtonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block transition hover:opacity-90"
                        style={{
                          backgroundColor: buttonGroup.primaryButtonColor,
                          color: buttonGroup.primaryButtonTextColor,
                          fontSize: `${buttonGroup.buttonFontSize}px`,
                          padding: `${buttonGroup.buttonPaddingY}px ${buttonGroup.buttonPaddingX}px`,
                          borderRadius: `${buttonGroup.buttonBorderRadius}px`,
                        }}
                      >
                        {activeTab.primaryButtonText}
                      </a>
                    ) : (
                      <span
                        className="inline-block opacity-60 cursor-default"
                        style={{
                          backgroundColor: buttonGroup.primaryButtonColor,
                          color: buttonGroup.primaryButtonTextColor,
                          fontSize: `${buttonGroup.buttonFontSize}px`,
                          padding: `${buttonGroup.buttonPaddingY}px ${buttonGroup.buttonPaddingX}px`,
                          borderRadius: `${buttonGroup.buttonBorderRadius}px`,
                        }}
                      >
                        {activeTab.primaryButtonText}
                      </span>
                    ))}
                  {activeTab.outlineButtonText &&
                    (activeTab.outlineButtonLink ? (
                      <a
                        href={activeTab.outlineButtonLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block border transition hover:bg-gray-50"
                        style={{
                          borderColor: buttonGroup.outlineButtonColor,
                          color: buttonGroup.outlineButtonColor,
                          fontSize: `${buttonGroup.buttonFontSize}px`,
                          padding: `${buttonGroup.buttonPaddingY}px ${buttonGroup.buttonPaddingX}px`,
                          borderRadius: `${buttonGroup.buttonBorderRadius}px`,
                        }}
                      >
                        {activeTab.outlineButtonText}
                      </a>
                    ) : (
                      <span
                        className="inline-block border opacity-60 cursor-default"
                        style={{
                          borderColor: buttonGroup.outlineButtonColor,
                          color: buttonGroup.outlineButtonColor,
                          fontSize: `${buttonGroup.buttonFontSize}px`,
                          padding: `${buttonGroup.buttonPaddingY}px ${buttonGroup.buttonPaddingX}px`,
                          borderRadius: `${buttonGroup.buttonBorderRadius}px`,
                        }}
                      >
                        {activeTab.outlineButtonText}
                      </span>
                    ))}
                </div>
              )}
            </div>

            {/* ✅ 右侧图片区（移动端 order-1，图片在上） */}
            <div
              className={`${IMAGE_WIDTH_MAP[safeImageGroup.imageWidth]} order-1 ${imageOrderClass} flex-shrink-0`}
              style={imageEnterStyle}
            >
              <div className="relative group">
                {activeTab.imageUrl ? (
                  <img
                    src={getImageUrl(activeTab.imageUrl)}
                    alt={activeTab.label}
                    className={`w-full h-auto transition-transform duration-500 ${
                      safeImageGroup.imageHoverZoom ? 'group-hover:scale-105' : ''
                    }`}
                    style={{ borderRadius: `${safeImageGroup.imageRadius}px` }}
                    decoding="async"
                  />
                ) : (
                  <div
                    className="w-full aspect-video bg-gray-100 flex items-center justify-center text-gray-400"
                    style={{ borderRadius: `${safeImageGroup.imageRadius}px` }}
                  >
                    暂无图片
                  </div>
                )}

                {/* 悬浮图标 */}
                {safeImageGroup.showFloatingIcons &&
                  activeTab.floatingIcons &&
                  activeTab.floatingIcons.filter(Boolean).map((icon: any, idx: number) => {
                    const iconUrl =
                      typeof icon === 'string'
                        ? icon
                        : icon?.iconUrl ?? icon?.url ?? icon?.src ?? '';
                    if (!iconUrl) return null;

                    const positions = [
                      { top: '10%', right: '-5%' },
                      { bottom: '15%', left: '-5%' },
                      { top: '50%', right: '-8%' },
                    ];
                    const pos = positions[idx] || positions[0];
                    return (
                      <img
                        key={`icon-${idx}`}
                        src={getImageUrl(iconUrl)}
                        alt="icon"
                        className="absolute h-auto object-contain transition-transform duration-300 hover:scale-110"
                        style={{
                          width: `${safeImageGroup.floatingIconWidth}px`,
                          ...pos,
                        }}
                      />
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}