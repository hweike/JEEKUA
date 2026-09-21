'use client';

import React from 'react';
import { getImageUrl } from '@/lib/files/url';

export interface ShowcaseProduct {
  productId: string;
  productName: string;
  sku: string;
  mainImage: string;
  price?: number;
  slug?: string;   // ✅ 新增
}

export interface ProductCardNameGroup {
  nameColor: string;
  nameFontSize: number;
  nameAlign: 'left' | 'center';
}

export interface ProductCardSkuGroup {
  skuColor: string;
  skuFontSize: number;
  skuVisible: boolean;
}

export interface ProductCardImageGroup {
  aspectRatio: '1:1' | '4:3' | '16:9';
  objectFit: 'cover' | 'contain';
  hoverZoom: boolean;
}

export interface ProductCardLayoutGroup {
  cardRadius: number;
  cardBgColor: string;
  cardBorderColor: string;
  cardHoverShadow: boolean;
  cardHoverLift?: boolean;
  cardLayout?: 'vertical' | 'horizontal';
  imageWidth?: number;
}

const ASPECT_MAP: Record<string, string> = {
  '1:1': '100%',
  '4:3': '75%',
  '16:9': '56.25%',
};

const CSS_ASPECT_MAP: Record<string, string> = {
  '1:1': '1 / 1',
  '4:3': '4 / 3',
  '16:9': '16 / 9',
};

interface ProductCardProps {
  product: ShowcaseProduct;
  layoutGroup: ProductCardLayoutGroup;
  nameGroup: ProductCardNameGroup;
  skuGroup: ProductCardSkuGroup;
  imageGroup: ProductCardImageGroup;
  href?: string;
  /** ✅ 新增：是否新标签页打开 */
  openInNewTab?: boolean;
  prefix?: React.ReactNode;
  className?: string;
}

export function ProductCard({
  product,
  layoutGroup,
  nameGroup,
  skuGroup,
  imageGroup,
  href,
  openInNewTab = false,
  prefix,
  className = '',
}: ProductCardProps) {
  const safeLayout = {
    cardRadius: layoutGroup?.cardRadius ?? 12,
    cardBgColor: layoutGroup?.cardBgColor ?? '#ffffff',
    cardBorderColor: layoutGroup?.cardBorderColor ?? '#e5e7eb',
    cardHoverShadow: layoutGroup?.cardHoverShadow !== false,
    cardHoverLift: layoutGroup?.cardHoverLift === true,
    cardLayout: layoutGroup?.cardLayout ?? 'vertical',
    imageWidth: layoutGroup?.imageWidth ?? 120,
  };

  const safeName = {
    nameColor: nameGroup?.nameColor ?? '#000000',
    nameFontSize: nameGroup?.nameFontSize ?? 16,
    nameAlign: nameGroup?.nameAlign ?? 'left',
  };

  const safeSku = {
    skuColor: skuGroup?.skuColor ?? '#999999',
    skuFontSize: skuGroup?.skuFontSize ?? 12,
    skuVisible: skuGroup?.skuVisible !== false,
  };

  const safeImage = {
    aspectRatio: imageGroup?.aspectRatio ?? '1:1',
    objectFit: imageGroup?.objectFit ?? 'cover',
    hoverZoom: imageGroup?.hoverZoom !== false,
  };

  const isHorizontal = safeLayout.cardLayout === 'horizontal';

  const imageContainer = (
    <div
      className={`relative overflow-hidden group ${isHorizontal ? 'flex-shrink-0' : 'w-full'}`}
      style={
        isHorizontal
          ? {
              width: `${safeLayout.imageWidth}px`,
              aspectRatio: CSS_ASPECT_MAP[safeImage.aspectRatio] || '1 / 1',
              alignSelf: 'center',
              margin: '12px',
              borderRadius: `${Math.max(0, safeLayout.cardRadius - 4)}px`,
            }
          : { paddingBottom: ASPECT_MAP[safeImage.aspectRatio] || '100%' }
      }
    >
      {prefix}

      {product.mainImage ? (
        <img
          src={getImageUrl(product.mainImage)}
          alt={product.productName}
          className={`${
            isHorizontal ? 'w-full h-full' : 'absolute inset-0 w-full h-full'
          } transition-transform duration-500 ${
            safeImage.hoverZoom ? 'group-hover:scale-105' : ''
          }`}
          style={{
            objectFit: safeImage.objectFit,
            borderRadius: isHorizontal ? 'inherit' : undefined,
          }}
        />
      ) : (
        <div
          className={`${
            isHorizontal ? 'w-full h-full' : 'absolute inset-0'
          } bg-gray-100 flex items-center justify-center text-gray-400 text-sm`}
          style={{ borderRadius: isHorizontal ? 'inherit' : undefined }}
        >
          暂无图片
        </div>
      )}
    </div>
  );

  const textContainer = (
  <div className={`p-4 ${isHorizontal ? 'flex-1 min-w-0 flex flex-col justify-center' : ''}`}>
    {/* ✅ 标题：固定 2 行 */}
    <h3
      className="line-clamp-2"
      style={{
        fontSize: `${safeName.nameFontSize}px`,
        color: safeName.nameColor,
        textAlign: safeName.nameAlign,
        fontWeight: 500,
        lineHeight: 1.4,
        minHeight: `${safeName.nameFontSize * 1.4 * 2}px`,   // 固定 2 行高度
      }}
    >
      {product.productName}
    </h3>

    {/* ✅ SKU：固定 1 行（即使为空也占位） */}
    <p
      className="mt-1"
      style={{
        fontSize: `${safeSku.skuFontSize}px`,
        color: safeSku.skuColor,
        textAlign: safeName.nameAlign,
        lineHeight: 1.5,
        minHeight: `${safeSku.skuFontSize * 1.5}px`,          // 固定 1 行高度
      }}
    >
      {safeSku.skuVisible && product.sku ? `SKU: ${product.sku}` : ''}
    </p>
  </div>
);

  const cardContent = (
    <div
      className={`overflow-hidden transition-all ${
        safeLayout.cardHoverShadow ? 'hover:shadow-lg' : ''
      } ${safeLayout.cardHoverLift ? 'hover:-translate-y-1' : ''} ${
        isHorizontal ? 'flex items-center' : ''
      } ${className}`}
      style={{
        backgroundColor: safeLayout.cardBgColor,
        border: `1px solid ${safeLayout.cardBorderColor}`,
        borderRadius: `${safeLayout.cardRadius}px`,
        transition: 'box-shadow 0.3s ease, transform 0.3s ease',
      }}
    >
      {imageContainer}
      {textContainer}
    </div>
  );

  // ✅ 有链接时用 <a>
  if (href) {
    return (
      <a
        href={href}
        target={openInNewTab ? '_blank' : undefined}
        rel={openInNewTab ? 'noopener noreferrer' : undefined}
        className="block"
      >
        {cardContent}
      </a>
    );
  }

  return cardContent;
}