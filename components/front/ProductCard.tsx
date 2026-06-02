'use client';

import Link from 'next/link';
import Image from 'next/image';

/**
 * 获取产品的价格范围（最小单价 ~ 最大单价）
 * 从 price_tiers 数组中提取所有 price 字段，取最小值和最大值
 * 示例：$12.00 - $30.70
 */
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
}

// 辅助函数：将完整 URL 转换为相对路径（避免 next/image 域名校验）
function getLocalImageUrl(url: string): string {
  if (!url) return '';
  // 如果是本地上传的图片，去掉协议、域名和端口部分
  if (url.startsWith('http://localhost:3000')) {
    return new URL(url).pathname; // 返回 /uploads/xxx.jpeg
  }
  // 可以扩展其他环境变量，如生产域名
  // if (process.env.NEXT_PUBLIC_BASE_URL && url.startsWith(process.env.NEXT_PUBLIC_BASE_URL)) {
  //   return new URL(url).pathname;
  // }
  return url;
}

export default function ProductCard({ product, locale, urlPattern }: ProductCardProps) {
  // 根据 urlPattern 生成详情页链接
  const href = urlPattern === 'id-slug'
    ? `/${locale}/product/${product.productId}/${product.slug}`
    : `/${locale}/product/${product.slug}`;

  // 使用辅助函数处理图片 URL，转换成本地相对路径
  const imageUrl = getLocalImageUrl(product.main_image_url);

  return (
    <Link href={href} className="block group">
      <div className="border border-border rounded-lg overflow-hidden bg-card hover:shadow-md transition-shadow duration-300">
        {/* 图片区域 - 1:1 比例 */}
        <div className="relative aspect-square w-full bg-muted">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={product.product_name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              暂无图片
            </div>
          )}
        </div>

        {/* 信息区域 */}
        <div className="p-4">
          {/* 标题 */}
          <h2 className="text-base font-semibold text-card-foreground line-clamp-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.product_name}
          </h2>

          {/* 价格 */}
          <div className="mt-2 text-lg font-bold text-primary">
            {getPriceRange(product)}
          </div>

          {/* 起订量 */}
          <div className="mt-1 text-xs text-muted-foreground">
            最小起订量: {product.min_order_quantity ?? 1} 件
          </div>
        </div>
      </div>
    </Link>
  );
}