'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import ProductSelectorDialog from '@/components/admin/products/ProductSelectorDialog';

interface Product {
  productId: string;
  productName: string;
  sku: string;
  mainImage?: string;
  price?: number;
}

interface ProductSelectorWrapperProps {
  onConfirm: (products: Product[], locale: string) => void;
  onCancel?: () => void;
  initialSelectedProducts?: Product[];
  defaultLocale?: string;
}

export default function ProductSelectorWrapper({
  onConfirm,
  onCancel,
  initialSelectedProducts = [],
  defaultLocale = 'zh',
}: ProductSelectorWrapperProps) {
  const [step, setStep] = useState<'locale' | 'products'>('locale');
  const [locale, setLocale] = useState(defaultLocale);

  // ✅ 关键：进入产品选择步骤时，传递给 Dialog 的初始产品
  //    - 语言和 defaultLocale 一致 → 保留 initialSelectedProducts（用户看到的还是原来的）
  //    - 语言切换了 → 清空（强制用户重新选）
  const [productsForStep, setProductsForStep] = useState<Product[]>(initialSelectedProducts);

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // ESC 键关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 语言选择逻辑：判断是否切换了语言
  const handleLocaleSelect = (newLocale: string) => {
    setLocale(newLocale);

    if (newLocale === defaultLocale) {
      // 语言未变 → 保留原已选产品
      setProductsForStep(initialSelectedProducts);
    } else {
      // 语言变了 → 清空已选，强制用户重新选
      setProductsForStep([]);
    }

    setStep('products');
  };

  if (step === 'locale') {
    return (
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
        onClick={handleClose}
      >
        <div
          className="bg-white rounded-lg shadow-xl p-6 w-80 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100 transition"
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          <h3 className="text-lg font-semibold mb-4">选择产品语言</h3>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => handleLocaleSelect('zh')}
              className={`px-4 py-2 border rounded hover:bg-gray-50 ${
                defaultLocale === 'zh' ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => handleLocaleSelect('en')}
              className={`px-4 py-2 border rounded hover:bg-gray-50 ${
                defaultLocale === 'en' ? 'border-blue-500 bg-blue-50' : ''
              }`}
            >
              English
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ProductSelectorDialog
      open={true}
      onClose={() => setStep('locale')}
      onConfirm={(products) => onConfirm(products, locale)}
      maxSelection={20}
      initialSelectedProducts={productsForStep}   // ✅ 用动态值
      locale={locale}
    />
  );
}