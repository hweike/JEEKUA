'use client';

import { useState, useEffect } from 'react';
import { pinyin } from 'pinyin-pro';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string, category: any) => Promise<void>;
  initialKey?: string | null;
  initialData?: { key: string; name: string; slug: string; coreKeyword?: string; seo?: any };
  locale: string;
}

export default function CategoryModal({
  isOpen,
  onClose,
  onSave,
  initialKey,
  initialData,
  locale,
}: Props) {
  // 自动生成 8 位随机数字 key（仅在新建时生成一次）
  const [key] = useState(() => {
    if (initialKey) return initialKey;
    return Math.floor(10000000 + Math.random() * 90000000).toString();
  });

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [coreKeyword, setCoreKeyword] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // 校验错误信息
  const [errors, setErrors] = useState<{
    coreKeyword?: string;
    metaTitle?: string;
    metaDescription?: string;
  }>({});

  // 根据名称自动生成 slug
  const generateSlugFromName = (inputName: string): string => {
    if (!inputName.trim()) return '';
    // 将中文字符转为拼音（带连字符）
    const pinyinResult = pinyin(inputName, { toneType: 'none', type: 'array' });
    let slugPart = pinyinResult.join('-');
    // 将非中文、非字母数字、非空格的字符替换为空，空格转成 -
    slugPart = slugPart
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    return slugPart;
  };

  // 当分类名称变化时，自动更新 slug
  useEffect(() => {
    if (name) {
      setSlug(generateSlugFromName(name));
    } else {
      setSlug('');
    }
  }, [name]);

  // 编辑时回填数据
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '');
      setSlug(initialData.slug || '');
      setCoreKeyword(initialData.coreKeyword || '');
      setMetaTitle(initialData.seo?.metaTitle || '');
      setMetaDescription(initialData.seo?.metaDescription || '');
    } else {
      // 新建时清空
      setName('');
      setSlug('');
      setCoreKeyword('');
      setMetaTitle('');
      setMetaDescription('');
    }
    setErrors({});
  }, [initialData, isOpen]);

  // 实时校验
  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!coreKeyword.trim()) {
      newErrors.coreKeyword = '核心关键词不能为空';
    }

    if (metaTitle.trim()) {
      if (!metaTitle.startsWith(coreKeyword)) {
        newErrors.metaTitle = `元标题必须以“${coreKeyword}”开头`;
      }
      if (metaTitle.length > 60) {
        newErrors.metaTitle = '元标题不能超过60个字符';
      }
    } else {
      // 元标题可选，但如果填写则需校验
    }

    if (metaDescription.trim()) {
      if (!metaDescription.includes(coreKeyword)) {
        newErrors.metaDescription = `元描述必须包含核心关键词“${coreKeyword}”`;
      }
      if (metaDescription.length > 160) {
        newErrors.metaDescription = '元描述不能超过160个字符';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('请填写分类名称');
      return;
    }
    if (!validate()) return;

    const category = {
      name: name.trim(),
      slug: slug.trim(),
      coreKeyword: coreKeyword.trim(),
      seo: {
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        keywords: coreKeyword.trim(), // 兼容旧字段
      },
    };
    await onSave(key, category);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">
          {initialData ? '编辑分类' : '新建分类'} ({locale})
        </h2>
        <form onSubmit={handleSubmit}>
          {/* 分类名称 */}
          <div className="mb-3">
            <label className="block text-sm font-medium">分类名称 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border p-2 rounded"
              required
              autoFocus
            />
          </div>

          {/* Slug（只读，自动生成） */}
          <div className="mb-3">
            <label className="block text-sm font-medium">URL Slug *</label>
            <input
              type="text"
              value={slug}
              readOnly
              className="w-full border p-2 rounded bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">根据分类名称自动生成</p>
          </div>

          <hr className="my-3" />
          <h3 className="text-md font-semibold mb-2">SEO设置</h3>

          {/* 核心关键词 */}
          <div className="mb-3">
            <label className="block text-sm font-medium">核心关键词 *</label>
            <input
              type="text"
              value={coreKeyword}
              onChange={(e) => setCoreKeyword(e.target.value)}
              className="w-full border p-2 rounded"
              required
            />
            {errors.coreKeyword && <p className="text-red-500 text-xs mt-1">{errors.coreKeyword}</p>}
          </div>

          {/* 元标题 */}
          <div className="mb-3">
            <label className="block text-sm font-medium">元标题</label>
            <input
              type="text"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
              className="w-full border p-2 rounded"
              maxLength={60}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">必须以核心关键词开头</span>
              <span className={metaTitle.length > 60 ? 'text-red-500' : 'text-gray-400'}>
                {metaTitle.length}/60
              </span>
            </div>
            {errors.metaTitle && <p className="text-red-500 text-xs mt-1">{errors.metaTitle}</p>}
          </div>

          {/* 元描述 */}
          <div className="mb-3">
            <label className="block text-sm font-medium">元描述</label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              className="w-full border p-2 rounded"
              rows={3}
              maxLength={160}
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-500">必须包含核心关键词</span>
              <span className={metaDescription.length > 160 ? 'text-red-500' : 'text-gray-400'}>
                {metaDescription.length}/160
              </span>
            </div>
            {errors.metaDescription && <p className="text-red-500 text-xs mt-1">{errors.metaDescription}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              取消
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}