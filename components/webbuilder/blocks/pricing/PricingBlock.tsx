'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface PricingCard {
  id: string;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  rightsTitle: string;
  rights: any[];
  price: string;
  priceFontSize: number;
  priceColor: string;
  buttonText: string;
  buttonLink: string;
  buttonVisible: boolean;
  buttonColor: string;
  isRecommended: boolean;
  contactText: string;
  contactLink: string;
}

interface PricingBlockProps {
  bannerType: 'standard' | 'fullwidth';
  backgroundColor: string;
  cardBgColor: string;
  cardBorderColor: string;
  cardHoverBorderColor: string;
  recommendedBorderColor: string;
  recommendedBgColor: string;
  titleColor: string;
  titleFontSize: number;
  descColor: string;
  descFontSize: number;
  rightsTitleColor: string;
  rightsTitleFontSize: number;
  rightsTextColor: string;
  rightsTextFontSize: number;
  checkIconColor: string;
  columns: 2 | 3 | 4;
  cardGap: number;
  headerImageUrl: string;
  headerImageHeight: number;
  headerOverlayColor: string;
  headerTitle: string;
  headerTitleColor: string;
  headerTitleFontSize: number;
  headerSubtitle: string;
  headerSubtitleColor: string;
  headerSubtitleFontSize: number;
  paddingTop: number;
  paddingBottom: number;
  cards: PricingCard[];
  puck?: any;
}

export function PricingBlock(props: PricingBlockProps) {
  const {
    bannerType = 'standard',
    backgroundColor = '#ffffff',
    cardBgColor = '#ffffff',
    cardBorderColor = '#e5e7eb',
    cardHoverBorderColor = '#3b82f6',
    recommendedBorderColor = '#3b82f6',
    recommendedBgColor = '#f0f9ff',
    titleColor = '#000000',
    titleFontSize = 32,
    descColor = '#666666',
    descFontSize = 16,
    rightsTitleColor = '#000000',
    rightsTitleFontSize = 18,
    rightsTextColor = '#666666',
    rightsTextFontSize = 14,
    checkIconColor = '#22c55e',
    columns = 3,
    cardGap = 20,
    headerImageUrl = '',
    headerImageHeight = 200,
    headerOverlayColor = 'rgba(0,0,0,0.5)',
    headerTitle = '',
    headerTitleColor = '#ffffff',
    headerTitleFontSize = 40,
    headerSubtitle = '',
    headerSubtitleColor = '#ffffff',
    headerSubtitleFontSize = 20,
    paddingTop = 48,
    paddingBottom = 48,
    cards = [],
    puck,
  } = props;

  const isEditMode = !!puck?.isEditing;

  if (!cards || cards.length === 0) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
      >
        〖卡片价格组件 - 请添加价格方案〗
      </div>
    );
  }

  // 通栏样式
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
    paddingTop: `${paddingTop}px`,
    paddingBottom: `${paddingBottom}px`,
    maxWidth: '80rem',
    margin: '0 auto',
    width: '100%',
    paddingLeft: 'clamp(1rem, 2vw, 2rem)',
    paddingRight: 'clamp(1rem, 2vw, 2rem)',
  };

  // 网格列数
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-4',
  }[columns] || 'grid-cols-1 md:grid-cols-3';

  return (
    <div ref={puck?.dragRef} style={outerStyle}>
      {/* 头部背景图 */}
      {headerImageUrl && (
        <div
          className="relative w-full flex items-center justify-center"
          style={{
            backgroundImage: `url(${headerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: `${headerImageHeight}px`,
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: headerOverlayColor }}
          />
          <div className="relative z-10 text-center px-4">
            {headerTitle && (
              <h1
                style={{
                  fontSize: `${headerTitleFontSize}px`,
                  color: headerTitleColor,
                  fontWeight: 'bold',
                  marginBottom: '0.5rem',
                }}
              >
                {headerTitle}
              </h1>
            )}
            {headerSubtitle && (
              <p
                style={{
                  fontSize: `${headerSubtitleFontSize}px`,
                  color: headerSubtitleColor,
                }}
              >
                {headerSubtitle}
              </p>
            )}
          </div>
        </div>
      )}

      <div style={innerStyle}>
        <div
          className={`grid ${gridCols}`}
          style={{ gap: `${cardGap}px` }}
        >
          {cards.map((card, cardIdx) => (
            <div
              key={card.id || `card-${cardIdx}`}
              className="relative rounded-lg border-2 p-6 transition-shadow hover:shadow-lg flex flex-col"
              style={{
                backgroundColor: card.isRecommended ? recommendedBgColor : cardBgColor,
                borderColor: card.isRecommended ? recommendedBorderColor : cardBorderColor,
              }}
            >
              {/* 推荐徽标 */}
              {card.badge && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: card.badgeColor || '#3b82f6' }}
                >
                  {card.badge}
                </div>
              )}

              {/* 标题 */}
              <h2
                className="font-bold mb-2"
                style={{
                  fontSize: `${titleFontSize}px`,
                  color: titleColor,
                }}
              >
                {card.title}
              </h2>

              {/* 描述 */}
              <p
                className="mb-6"
                style={{
                  fontSize: `${descFontSize}px`,
                  color: descColor,
                  lineHeight: 1.6,
                }}
              >
                {card.description}
              </p>

              {/* 核心权益 */}
              {card.rights && card.rights.length > 0 && (
                <div className="mb-6 flex-1">
                  {card.rightsTitle && (
                    <h3
                      className="font-semibold mb-3"
                      style={{
                        fontSize: `${rightsTitleFontSize}px`,
                        color: rightsTitleColor,
                      }}
                    >
                      {card.rightsTitle}
                    </h3>
                  )}
                  <ul className="space-y-2">
                    {(card.rights || []).filter(Boolean).map((right: any, idx: number) => {
                      // ✅ 兼容对象和字符串
                      const rightText =
                        right === null || right === undefined
                          ? ''
                          : typeof right === 'object'
                          ? right.text ?? right.title ?? right.label ?? ''
                          : String(right);
                      return (
                        <li
                          key={`right-${cardIdx}-${idx}`}
                          className="flex items-start gap-2"
                        >
                          <Check
                            size={16}
                            className="flex-shrink-0 mt-1"
                            style={{ color: checkIconColor }}
                          />
                          <span
                            style={{
                              fontSize: `${rightsTextFontSize}px`,
                              color: rightsTextColor,
                              lineHeight: 1.6,
                            }}
                          >
                            {rightText}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* 价格 */}
              {card.price && (
                <div
                  className="mb-4 text-center"
                  style={{
                    fontSize: `${card.priceFontSize}px`,
                    color: card.priceColor,
                    fontWeight: 'bold',
                  }}
                >
                  {card.price}
                </div>
              )}

              {/* 按钮 */}
              {card.buttonVisible && card.buttonText && (
                <div>
                  {card.buttonLink ? (
                    <a
                      href={card.buttonLink}
                      className="block w-full text-center px-6 py-3 rounded-md text-white font-medium transition hover:opacity-90"
                      style={{ backgroundColor: card.buttonColor || '#3b82f6' }}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {card.buttonText}
                    </a>
                  ) : (
                    <span
                      className="block w-full text-center px-6 py-3 rounded-md text-white font-medium opacity-60 cursor-default"
                      style={{ backgroundColor: card.buttonColor || '#3b82f6' }}
                    >
                      {card.buttonText}
                    </span>
                  )}
                </div>
              )}

              {/* 底部联系 */}
              {card.contactText && (
                <p className="text-center mt-4">
                  {card.contactLink ? (
                    <a
                      href={card.contactLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline"
                      style={{ color: card.buttonColor || '#3b82f6' }}
                    >
                      {card.contactText}
                    </a>
                  ) : (
                    <span className="text-sm" style={{ color: descColor }}>
                      {card.contactText}
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}