'use client';

import React, { useState } from 'react';

interface Product {
  model: string;
  productId: string;
  parent_product_id?: string;
  main_image_url?: string;
  [key: string]: any;
}

interface ProductTableProps {
  products: Product[];
  view: string;
  category: string;
  series: string;
  locale: string;
}

export default function ProductTableWithCustomAttrs({ products, view, category, series, locale }: ProductTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [hoverImage, setHoverImage] = useState<{ src: string; x: number; y: number } | null>(null);

  const customAttrNames = Array.from(
    new Set(products.flatMap(p => Object.keys(p).filter(key => key.startsWith('custom_'))))
  );

  const parentProducts = products.filter(p => !p.parent_product_id);
  const childrenMap = new Map<string, Product[]>();
  products.forEach(p => {
    if (p.parent_product_id) {
      const key = p.parent_product_id;
      if (!childrenMap.has(key)) childrenMap.set(key, []);
      childrenMap.get(key)!.push(p);
    }
  });

  const toggleRow = (productId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  const getProductUrl = (product: Product) => {
    const identifier = product.model && product.model.trim() !== '' ? product.model : product.productId;
    return `/${locale}/products/${view}/${category}/${series}/${identifier}`;
  };

  const handleProductClick = (product: Product) => {
    if (product.parent_product_id) {
      window.open(getProductUrl(product), '_blank');
    } else {
      const hasChildren = childrenMap.has(product.model);
      if (hasChildren) {
        toggleRow(product.model);
      } else {
        window.open(getProductUrl(product), '_blank');
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent, imageUrl?: string) => {
    if (!imageUrl) return;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const tooltipWidth = 200;
    const tooltipHeight = 200;
    let left = e.clientX - tooltipWidth;
    let top = e.clientY - tooltipHeight;

    if (left < 0) left = 5;
    if (top < 0) top = 5;
    if (left + tooltipWidth > windowWidth) left = windowWidth - tooltipWidth - 5;
    if (top + tooltipHeight > windowHeight) top = windowHeight - tooltipHeight - 5;

    setHoverImage({ src: imageUrl, x: left, y: top });
  };

  const handleMouseLeave = () => {
    setHoverImage(null);
  };

  const hasCustomAttrs = customAttrNames.length > 0;

  return (
    <div className="overflow-x-auto relative">
      {hoverImage && (
        <div
          className="fixed z-50 bg-popover shadow-lg border border-border rounded p-1"
          style={{ left: hoverImage.x, top: hoverImage.y, width: '200px', height: '200px' }}
        >
          <img
            src={hoverImage.src}
            alt="产品主图"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
            onError={(e) => {
              console.error('图片加载失败:', hoverImage.src);
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">图片加载失败</div>';
              }
            }}
          />
        </div>
      )}

      <table className="min-w-full border-collapse border border-border">
        <thead>
          <tr className="bg-muted">
            <th className="p-2 border border-border text-foreground">型号</th>
            {hasCustomAttrs &&
              customAttrNames.map(attr => (
                <th key={attr} className="p-2 border border-border text-foreground">
                  {attr.replace('custom_', '')}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {parentProducts.length === 0 ? (
            <tr>
              <td colSpan={hasCustomAttrs ? customAttrNames.length + 1 : 1} className="p-4 text-center text-muted-foreground">
                暂无产品数据
              </td>
            </tr>
          ) : (
            parentProducts.map(parent => {
              const hasChildren = childrenMap.has(parent.model);
              const isExpanded = expandedRows.has(parent.model);
              const childRows = hasChildren && isExpanded
                ? childrenMap.get(parent.model)!.map(child => (
                    <tr
                      key={child.model}
                      className="bg-muted/50"
                      onMouseMove={(e) => handleMouseMove(e, child.main_image_url)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <td className="p-2 border border-border pl-8">
                        <span
                          className="cursor-pointer text-primary hover:underline"
                          onClick={() => handleProductClick(child)}
                        >
                          {child.model || '-'}
                        </span>
                      </td>
                      {hasCustomAttrs &&
                        customAttrNames.map(attr => (
                          <td key={attr} className="p-2 border border-border text-foreground">
                            {child[attr] || '-'}
                          </td>
                        ))}
                    </tr>
                  ))
                : null;

              return (
                <React.Fragment key={parent.model}>
                  <tr
                    className="hover:bg-accent"
                    onMouseMove={(e) => handleMouseMove(e, parent.main_image_url)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <td className="p-2 border border-border">
                      <div className="flex items-center gap-2">
                        {hasChildren && (
                          <button
                            onClick={() => toggleRow(parent.model)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            {isExpanded ? '▼' : '▶'}
                          </button>
                        )}
                        <span
                          className={`${hasChildren ? 'cursor-pointer' : 'cursor-pointer text-primary hover:underline'}`}
                          onClick={() => handleProductClick(parent)}
                        >
                          {parent.model || '-'}
                        </span>
                      </div>
                    </td>
                    {hasCustomAttrs &&
                      customAttrNames.map(attr => (
                        <td key={attr} className="p-2 border border-border text-foreground">
                          {parent[attr] || '-'}
                        </td>
                      ))}
                  </tr>
                  {childRows}
                </React.Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}