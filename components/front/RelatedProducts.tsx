'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { getImageUrl } from '@/lib/files/url';

interface Product {
  id: string;
  name: string;
  image: string | null;
  slug: string;
  sku?: string;
  priceDisplay?: string;
}

interface RelatedProductsProps {
  resourceType: 'blog' | 'document' | 'video';
  resourceId: string;
  maxItems?: number;
}

// ============================================================
// 公共样式常量
// ============================================================
const COLOR_TRANSITION = `color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const BG_COLOR_TRANSITION = `background-color var(--transition-duration-150, 150ms) var(--transition-timing-ease, ease)`;
const COLOR_BG_TRANSITION = `${COLOR_TRANSITION}, ${BG_COLOR_TRANSITION}`;

export default function RelatedProducts({
  resourceType,
  resourceId,
  maxItems,
}: RelatedProductsProps) {
  const locale = useLocale();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resourceId) return;
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/resources/${resourceType}/${resourceId}/products?locale=${locale}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        let items = data.items || [];
        if (maxItems && items.length > maxItems) {
          items = items.slice(0, maxItems);
        }
        setProducts(items);
      } catch (err) {
        console.error(err);
        setError('加载相关产品失败');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [resourceType, resourceId, maxItems]);

  if (loading) {
    return (
      <div
        className="text-center"
        style={{
          marginTop: 'var(--spacing-4, 1rem)',
          color: 'var(--muted-foreground, #64748b)',
        }}
      >
        加载中...
      </div>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-3, 0.75rem)',
      }}
    >
      {products.map((product) => {
        const imageUrl = getImageUrl(product.image);
        return (
          <Link
            key={product.id}
            href={`/${locale}/product/${product.slug}`}
            className="flex items-start no-underline"
            style={{
              gap: 'var(--spacing-3, 0.75rem)',
              padding: 'var(--spacing-4, 1rem)',
              borderRadius: 'var(--radius-lg, 0.75rem)',
              backgroundColor: 'var(--muted, #f1f5f9)',
              transition: BG_COLOR_TRANSITION,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'color-mix(in srgb, var(--muted, #f1f5f9) 80%, transparent)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--muted, #f1f5f9)';
            }}
          >
            {/* 图片区域 */}
            <div
              className="flex-shrink-0 overflow-hidden"
              style={{
                width: '100px',
                height: '100px',
                backgroundColor: 'color-mix(in srgb, var(--muted, #f1f5f9) 50%, transparent)',
                borderRadius: 'var(--radius-md, 0.625rem)',
              }}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={handleImageError}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    color: 'var(--muted-foreground, #64748b)',
                    fontSize: 'var(--font-size-xs, 0.75rem)',
                  }}
                >
                  无图
                </div>
              )}
            </div>
            {/* 文字信息 */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                className="line-clamp-2 break-words"
                style={{
                  fontWeight: 'var(--font-weight-medium, 500)',
                  fontSize: 'var(--font-size-sm, 0.875rem)',
                  color: 'var(--foreground, #0f172a)',
                  transition: COLOR_TRANSITION,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--primary, #1e293b)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--foreground, #0f172a)';
                }}
              >
                {product.name}
              </div>
              {product.sku && (
                <div
                  style={{
                    fontSize: 'var(--font-size-xs, 0.75rem)',
                    color: 'var(--muted-foreground, #64748b)',
                    marginTop: 'var(--spacing-1, 0.25rem)',
                  }}
                >
                  SKU: {product.sku}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}