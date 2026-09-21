'use client';

import React from 'react';
import { useLocale } from 'next-intl';
import InquiryForm from '@/components/InquiryForm';

export function InquiryBlock({ puck, __runtime }: any) {
  const isEditMode = !!puck?.isEditing;
  const locale = useLocale();
  const product = __runtime?.product;

  // ============================================================
  // ✅ 询盘表单专属 CSS 变量（带最终 fallback）
  // ============================================================
  const containerBg = 'var(--inquiry-bg, var(--muted, #f1f5f9))';
  const containerText = 'var(--inquiry-text, var(--foreground, #0f172a))';
  const paddingTop = 'var(--inquiry-padding-top, 2.5rem)';
  const paddingBottom = 'var(--inquiry-padding-bottom, 2.5rem)';
  const marginBottom = 'var(--inquiry-margin-bottom, var(--section-gap, 100px))'; // ✅ 使用全局主题变量 section-gap

  if (isEditMode) {
    return (
      <div
        ref={puck?.dragRef}
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-400 bg-gray-50"
      >
        <div className="text-lg font-medium">📋 询盘表单</div>
        <div className="text-sm mt-1">在预览或发布时将显示询盘表单</div>
      </div>
    );
  }

  // 如果未传入 product，从 URL 获取参数（兼容现有用法）
  let productUrl: string | undefined;
  let productNameFromUrl: string | undefined;
  if (!product && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    productUrl = params.get('product') || undefined;
    productNameFromUrl = params.get('productName') || undefined;
  }

  return (
    <div
      style={{
        backgroundColor: containerBg,
        color: containerText,
        paddingTop: paddingTop,
        paddingBottom: paddingBottom,
        marginBottom: marginBottom,
      }}
    >
      <div
        className="mx-auto"
        style={{
          maxWidth: '48rem',
          paddingLeft: 'var(--spacing-4, 1rem)',
          paddingRight: 'var(--spacing-4, 1rem)',
        }}
      >
        <InquiryForm
          locale={locale}
          product={product}
          defaultProductUrl={productUrl}
          defaultProductName={productNameFromUrl}
        />
      </div>
    </div>
  );
}