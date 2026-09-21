'use client';

import Link from 'next/link';
import { getImageUrl } from '@/lib/files/url';

function getPriceRange(product: any): string {
  if (!product.price_tiers || product.price_tiers.length === 0) {
    return '询价';
  }
  const prices = product.price_tiers.map((tier: any) => tier.price).filter((p: number) => typeof p === 'number');
  if (prices.length === 0) return '询价';
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const currency = product.currency || '$';
  if (min === max) {
    return `${currency}${min.toFixed(2)}`;
  }
  return `${currency}${min.toFixed(2)} - ${currency}${max.toFixed(2)}`;
}

interface ProductCardProps {
  product: any;
  locale: string;
  urlPattern: string;
  /** 是否在新标签页打开链接，默认 false */
  openInNewTab?: boolean;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-200, 200ms) var(--transition-timing-ease, ease)`;
const CARD_TRANSITION = `box-shadow var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease), transform var(--transition-duration-300, 300ms) var(--transition-timing-ease, ease)`;

export default function ProductCard({ product, locale, urlPattern, openInNewTab = false }: ProductCardProps) {
  const href = urlPattern === 'id-slug'
    ? `/${locale}/product/${product.productId}/${product.slug}`
    : `/${locale}/product/${product.slug}`;

  const imageUrl = getImageUrl(product.main_image_url);

  // ============================================================
  // ✅ 产品卡片专属 CSS 变量（带最终 fallback）
  // ============================================================
  const cardStyles: React.CSSProperties = {
    backgroundColor: 'var(--product-card-bg, var(--card, #ffffff))',
    borderColor: 'var(--product-card-border, var(--border, #e2e8f0))',
    borderRadius: 'var(--product-card-radius, var(--radius, 0.625rem))',
    boxShadow: 'var(--product-card-shadow, var(--shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1)))',
    transition: CARD_TRANSITION,
  };

  const cardHoverStyles: React.CSSProperties = {
    boxShadow: 'var(--product-card-hover-shadow, var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1)))',
    transform: 'translateY(-2px)',
  };

  // 标题颜色使用 product-card-title 或回退到 card-foreground
  const titleColor = 'var(--product-card-title-color, var(--card-foreground, #0f172a))';
  const titleHoverColor = 'var(--product-card-title-hover, var(--primary, #1e293b))';

  // 价格颜色
  const priceColor = 'var(--product-price-color, var(--primary, #1e293b))';

  // 图片占位背景
  const placeholderBg = 'var(--product-card-placeholder-bg, var(--muted, #f1f5f9))';

  return (
    <Link
      href={href}
      className="block group"
      target={openInNewTab ? '_blank' : undefined}
      rel={openInNewTab ? 'noopener noreferrer' : undefined}
    >
      <div
        className="border overflow-hidden"
        style={cardStyles}
        onMouseEnter={(e) => {
          const target = e.currentTarget;
          target.style.boxShadow = cardHoverStyles.boxShadow as string;
          target.style.transform = cardHoverStyles.transform as string;
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget;
          target.style.boxShadow = cardStyles.boxShadow as string;
          target.style.transform = 'none';
        }}
      >
        {/* 图片区域 */}
        <div className="relative aspect-square w-full" style={{ backgroundColor: placeholderBg }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.product_name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="flex items-center justify-center h-full"
              style={{
                color: 'var(--muted-foreground, #64748b)',
                fontSize: 'var(--font-size-sm, 0.875rem)',
              }}
            >
              暂无图片
            </div>
          )}
        </div>

        {/* 内容区域 */}
        <div style={{ padding: 'var(--spacing-4, 1rem)' }}>
          <h2
            className="line-clamp-2"
            style={{
              fontSize: 'var(--font-size-base, 1rem)',
              fontWeight: 'var(--font-weight-semibold, 600)',
              minHeight: '2.5rem',
              color: titleColor,
              transition: COLOR_TRANSITION,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = titleHoverColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = titleColor;
            }}
          >
            {product.product_name}
          </h2>
          <div
            style={{
              marginTop: 'var(--spacing-2, 0.5rem)',
              fontSize: 'var(--font-size-lg, 1.125rem)',
              fontWeight: 'var(--font-weight-bold, 700)',
              color: priceColor,
            }}
          >
            {getPriceRange(product)}
          </div>
          <div
            style={{
              marginTop: 'var(--spacing-1, 0.25rem)',
              fontSize: 'var(--font-size-xs, 0.75rem)',
              color: 'var(--muted-foreground, #64748b)',
            }}
          >
            最小起订量: {product.min_order_quantity ?? 1} 件
          </div>
        </div>
      </div>
    </Link>
  );
}