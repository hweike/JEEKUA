'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import CategorySelectorDialog from './CategorySelectorDialog';

interface CategorySelectorWrapperProps {
  onConfirm: (categoryIds: string[], locale: string) => void;
  onCancel?: () => void;
  initialSelectedIds?: string[];
  defaultLocale?: string;
}

export default function CategorySelectorWrapper({
  onConfirm,
  onCancel,
  initialSelectedIds = [],
  defaultLocale = 'zh',
}: CategorySelectorWrapperProps) {
  const [step, setStep] = useState<'locale' | 'categories'>('locale');
  const [locale, setLocale] = useState(defaultLocale);

  const handleClose = () => {
    if (onCancel) {
      onCancel();
    }
  };

  // ESC 关闭
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
            className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          <h3 className="text-lg font-semibold mb-4">选择分类语言</h3>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                setLocale('zh');
                setStep('categories');
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              中文
            </button>
            <button
              type="button"
              onClick={() => {
                setLocale('en');
                setStep('categories');
              }}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              English
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CategorySelectorDialog
      open={true}
      onClose={() => setStep('locale')}
      onConfirm={(ids) => onConfirm(ids, locale)}
      maxSelection={20}
      initialSelectedIds={initialSelectedIds}
      locale={locale}
    />
  );
}