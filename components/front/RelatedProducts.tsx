'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

interface Product {
  id: string;
  name: string;
  image: string | null;
  slug: string;
  priceDisplay: string;
}

interface RelatedProductsProps {
  resourceType: 'blog' | 'document' | 'video';
  resourceId: string;
  title?: string;
  maxItems?: number;
}

/**
 * 智能处理图片 URL：
 * - 本地图片（以 / 开头或 localhost 域名）直接返回，不代理
 * - 外部 http/https 链接走代理（解决防盗链）
 */
function getProcessedImageUrl(url: string | null): string {
  if (!url) return '';
  // 本地图片：相对路径 /uploads/... 或绝对路径但包含 localhost
  if (url.startsWith('/')) return url;
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    // 如果包含 localhost，尝试转换成相对路径
    try {
      const urlObj = new URL(url);
      return urlObj.pathname;
    } catch {
      return url;
    }
  }
  // 外部链接，走代理
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return `/api/proxy-image?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default function RelatedProducts({
  resourceType,
  resourceId,
  title = '相关产品',
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
        const res = await fetch(`/api/resources/${resourceType}/${resourceId}/products`);
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
    return <div className="mt-8 text-center text-muted-foreground">加载相关产品中...</div>;
  }

  if (error || products.length === 0) {
    return null;
  }

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    const originalUrl = target.getAttribute('data-original-src');
    if (originalUrl && !target.src.includes('/api/proxy-image')) {
      // 如果图片加载失败且尚未尝试代理，尝试走代理（针对外部图片）
      target.src = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
    } else {
      // 加载失败显示占位图
      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%23999"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-border">
      <h2 className="text-2xl font-bold text-foreground mb-6">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => {
          const rawImageUrl = product.image || '';
          const processedUrl = getProcessedImageUrl(rawImageUrl);
          return (
            <Link
              key={product.id}
              href={`/${locale}/products/${product.slug}`}
              className="group block border border-border rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square bg-muted relative overflow-hidden">
                {rawImageUrl ? (
                  <img
                    src={processedUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    data-original-src={rawImageUrl}
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    暂无图片
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                <p className="text-primary font-medium mt-2">{product.priceDisplay || '价格面议'}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}