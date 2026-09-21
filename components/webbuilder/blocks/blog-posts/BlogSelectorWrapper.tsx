'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import BlogSelectorDialog from './BlogSelectorDialog';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  categoryId: string;
  author: string;
  updatedAt: string;
}

interface BlogSelectorWrapperProps {
  onConfirm: (posts: BlogPost[], locale: string) => void;
  onCancel?: () => void;
  initialSelectedPosts?: BlogPost[];
  defaultLocale?: string;
}

export default function BlogSelectorWrapper({
  onConfirm,
  onCancel,
  initialSelectedPosts = [],
  defaultLocale = 'zh',
}: BlogSelectorWrapperProps) {
  const [step, setStep] = useState<'locale' | 'posts'>('locale');
  const [locale, setLocale] = useState(defaultLocale);
  const [postsForStep, setPostsForStep] = useState<BlogPost[]>(initialSelectedPosts);

  const handleClose = () => {
    if (onCancel) onCancel();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLocaleSelect = (newLocale: string) => {
    setLocale(newLocale);
    // 语言切换时清空已选（和 ProductSelectorWrapper 一致）
    if (newLocale === defaultLocale) {
      setPostsForStep(initialSelectedPosts);
    } else {
      setPostsForStep([]);
    }
    setStep('posts');
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
            className="absolute top-3 right-3 p-1 rounded hover:bg-gray-100"
            aria-label="关闭"
          >
            <X size={20} />
          </button>

          <h3 className="text-lg font-semibold mb-4">选择文章语言</h3>
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
    <BlogSelectorDialog
      open={true}
      onClose={() => setStep('locale')}
      onConfirm={(posts) => onConfirm(posts, locale)}
      maxSelection={20}
      initialSelectedPosts={postsForStep}
      locale={locale}
    />
  );
}