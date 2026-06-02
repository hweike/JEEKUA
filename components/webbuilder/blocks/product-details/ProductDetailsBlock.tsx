'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProductDetailsBlock({
  layout = 'left-right',
  imageSize = 'medium',
  __runtime,
  puck,
}: any) {
  const router = useRouter();

  if (!__runtime?.product) {
    return (
      <div
        className="border-2 border-dashed border-gray-300 p-8 text-center text-gray-400"
        ref={puck?.dragRef}
      >
        〖产品详情展示区域〗
      </div>
    );
  }

  const { product, locale, urlPattern } = __runtime;

  // 图片相关状态
  const [currentMainImage, setCurrentMainImage] = useState(
    product.main_image_url || '/placeholder.png'
  );
  const allImages = [
    product.main_image_url,
    ...(product.additional_images || []),
  ].filter(Boolean);
  const thumbnails = allImages;

  const variants = product.variants || [];
  const isVariant = product.isVariant === true;
  const productAttributes = product.attributes || {};
  const hasAttributes = Object.keys(productAttributes).length > 0;

  // 变体折叠状态管理
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const toggleVariant = (variantId: string) => {
    setExpandedVariants(prev => ({ ...prev, [variantId]: !prev[variantId] }));
  };

  // 价格阶梯渲染（淡灰色背景）
  const renderPriceTiers = (tiers: any[], currency: string) => {
    if (!tiers || tiers.length === 0) return <div className="text-gray-500">询价</div>;
    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        {tiers.map((tier, idx) => {
          const { min_qty, max_qty, price } = tier;
          let rangeText = '';
          if (max_qty === null || max_qty === undefined) {
            rangeText = `≥ ${min_qty} pieces`;
          } else {
            rangeText = `${min_qty} - ${max_qty} pieces`;
          }
          return (
            <div key={idx} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{rangeText}</span>
              <span className="text-lg font-semibold text-primary">
                {currency} {price.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const getVariantUrl = (variant: any) => {
    if (urlPattern === 'id-slug') {
      return `/${locale}/product/${variant.id}/${variant.slug}`;
    }
    return `/${locale}/product/${variant.slug}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左侧图片区域 - 粘性固定 */}
        <div className="md:sticky md:top-8 space-y-4 self-start">
          <div className="border rounded-lg overflow-hidden bg-gray-100">
            <img
              src={currentMainImage}
              alt={product.product_name}
              className="w-full h-auto object-cover"
            />
          </div>
          {thumbnails.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {thumbnails.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentMainImage(img)}
                  className={`flex-shrink-0 w-20 h-20 border rounded-md overflow-hidden transition ${
                    currentMainImage === img
                      ? 'ring-2 ring-primary border-transparent'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧内容区域 */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold text-foreground">{product.product_name}</h1>
          {product.brand && <div className="text-muted-foreground">品牌: {product.brand}</div>}
          {product.short_description && <div className="text-foreground">{product.short_description}</div>}

          {product.price_tiers && product.price_tiers.length > 0 && (
            <div>{renderPriceTiers(product.price_tiers, product.currency)}</div>
          )}

          <div className="text-sm text-muted-foreground">
            最小起订量: {product.min_order_quantity} 件
          </div>

          {/* 变体区块 */}
          {!isVariant && variants.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-3">产品变体</h3>
              <div className="space-y-3">
                {variants.map((variant: any) => {
                  const variantAttrs = variant.attributes || {};
                  const hasVariantAttrs = Object.keys(variantAttrs).length > 0;
                  const variantUrl = getVariantUrl(variant);
                  const isExpanded = expandedVariants[variant.id] || false;

                  return (
                    <div
                      key={variant.id}
                      className={`border rounded-lg p-3 bg-card ${
                        hasVariantAttrs ? 'cursor-pointer' : ''
                      }`}
                      onClick={(e) => {
                        // 如果有自定义属性，且点击的目标不是按钮区域，则切换折叠状态
                        if (hasVariantAttrs && !(e.target as HTMLElement).closest('.variant-detail-button')) {
                          toggleVariant(variant.id);
                        }
                      }}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          {hasVariantAttrs && (
                            <span className="text-muted-foreground text-sm">
                              {isExpanded ? '▼' : '▶'}
                            </span>
                          )}
                          <span className="font-semibold text-foreground">{variant.product_name}</span>
                        </div>
                        <button
                          className="variant-detail-button ml-4 text-primary hover:underline text-sm whitespace-nowrap"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(variantUrl);
                          }}
                        >
                          查看详情
                        </button>
                      </div>
                      {hasVariantAttrs && isExpanded && (
                        <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                          {Object.entries(variantAttrs).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value as string}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 商品规格说明 */}
          {product.spec_text && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">商品规格说明</h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap">{product.spec_text}</div>
            </div>
          )}

          <div className="flex gap-4 pt-2">
            <button className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90 transition">
              Send inquiry
            </button>
            <button className="border border-primary text-primary px-6 py-2 rounded-md hover:bg-primary/10 transition">
              Chat now
            </button>
          </div>

          {/* 库存与物流 */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-2">库存与物流</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>库存状态: {product.availability === 'in_stock' ? '现货' : product.availability === 'out_of_stock' ? '缺货' : '预定'}</li>
              <li>运费: {product.shipping_cost === 0 ? '包邮' : `${product.currency} ${product.shipping_cost}`}</li>
              <li>退货天数: {product.return_policy_days} 天</li>
            </ul>
          </div>

          {/* 产品参数 */}
          {hasAttributes && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">产品参数</h3>
              <dl className="grid grid-cols-1 gap-1 text-sm">
                {Object.entries(productAttributes).map(([key, value]) => (
                  <div key={key} className="flex py-1 border-b border-gray-100">
                    <dt className="w-1/3 font-medium text-muted-foreground">{key}:</dt>
                    <dd className="w-2/3 text-foreground">{value as string}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* 商品描述 */}
          {product.description && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-2">商品描述</h3>
              <div
                className="prose max-w-none text-sm"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}