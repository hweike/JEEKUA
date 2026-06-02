'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { FooterConfig, SocialLink } from '@/lib/SiteHeadersFooters/types';
import ImageUploader from '../common/ImageUploader';
import SliderInput from '../common/SliderInput';
import ToggleSwitch from '../common/ToggleSwitch';
import MenuSelector from '../common/MenuSelector';
import Toast from '@/components/common/Toast';
import { SOCIAL_PLATFORMS, ALIGN_OPTIONS } from '@/lib/SiteHeadersFooters/config';
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaTiktok,
  FaTwitter,
  FaSnapchat,
  FaPinterest,
  FaTumblr,
  FaVimeo,
} from 'react-icons/fa';

// 平台图标映射
const platformIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  twitter: FaTwitter,
  snapchat: FaSnapchat,
  pinterest: FaPinterest,
  tumblr: FaTumblr,
  vimeo: FaVimeo,
};

// 扩展 schema，增加 style 字段
const footerSchema = z.object({
  style: z.enum(['simple', 'classic', 'luxury']), // 新增页脚风格
  emailSubscription: z.object({
    enabled: z.boolean(),
    title: z.string(),
    subtitle: z.string(),
  }),
  brandMenu: z.object({
    brandItem: z.object({
      visible: z.boolean(),
      imageUrl: z.string().optional(),
      imageWidth: z.number().optional(),
      imageAlign: z.enum(['left', 'center', 'right']).optional(),
    }),
    column1: z.object({
      visible: z.boolean(),
      title: z.string(),
      menuId: z.string(),
    }),
    column2: z.object({
      visible: z.boolean(),
      title: z.string(),
      menuId: z.string(),
    }),
    column3: z.object({
      visible: z.boolean(),
      title: z.string(),
      menuId: z.string(),
    }),
  }),
  social: z.object({
    visible: z.boolean(),
    links: z.array(z.object({
      platform: z.enum(['facebook', 'instagram', 'youtube', 'tiktok', 'twitter', 'snapchat', 'pinterest', 'tumblr', 'vimeo']),
      url: z.string(),
    })),
  }),
  utilities: z.object({
    showPolicyLinks: z.boolean(),
    topSpacing: z.number(),
    bottomSpacing: z.number(),
  }),
  textInfo: z.object({
    enabled: z.boolean(),
    title: z.string(),
    content: z.string(),
  }),
});

interface FooterFormProps {
  initialConfig: FooterConfig;
  locale: string;
}

// 默认配置（用于补充缺失字段）
const DEFAULTS = {
  style: 'simple' as const,
};

export default function FooterForm({ initialConfig, locale }: FooterFormProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 确保 initialConfig 中包含 style 字段
  const mergedConfig = {
    ...initialConfig,
    style: initialConfig.style || DEFAULTS.style,
  };

  const { register, control, handleSubmit, watch, setValue } = useForm({
    resolver: zodResolver(footerSchema),
    defaultValues: mergedConfig,
  });

  const onSubmit = async (data: FooterConfig) => {
    try {
      const res = await fetch('/api/SiteHeadersFooters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'footer', locale, config: data }),
      });
      if (res.ok) {
        setToast({ message: '保存成功', type: 'success' });
      } else {
        const err = await res.json();
        setToast({ message: err.error || '保存失败', type: 'error' });
      }
    } catch (error) {
      setToast({ message: '保存失败，请重试', type: 'error' });
    }
  };

  const updateSocialLink = (platform: SocialLink['platform'], url: string) => {
    const currentLinks = watch('social.links') || [];
    const existingIndex = currentLinks.findIndex(link => link.platform === platform);
    let newLinks;
    if (existingIndex >= 0) {
      if (url.trim() === '') {
        newLinks = currentLinks.filter((_, idx) => idx !== existingIndex);
      } else {
        newLinks = [...currentLinks];
        newLinks[existingIndex] = { platform, url };
      }
    } else {
      if (url.trim() !== '') {
        newLinks = [...currentLinks, { platform, url }];
      } else {
        newLinks = currentLinks;
      }
    }
    setValue('social.links', newLinks);
  };

  const getSocialUrl = (platform: SocialLink['platform']) => {
    const link = watch('social.links')?.find(l => l.platform === platform);
    return link?.url || '';
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* ========== 页脚风格卡片 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">页脚风格</h2>
          <div>
            <label className="block text-sm font-medium mb-2">选择风格</label>
            <select {...register('style')} className="w-full border rounded px-3 py-2">
              <option value="simple">简洁风格</option>
              <option value="classic">经典风格</option>
              <option value="luxury">轻奢展示</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">不同风格影响前台页脚的布局和视觉效果</p>
          </div>
        </div>

        {/* ========== 电子邮件注册 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">电子邮件注册</h2>
            <ToggleSwitch
              enabled={watch('emailSubscription.enabled')}
              onChange={(val) => setValue('emailSubscription.enabled', val)}
              label=""
            />
          </div>
          {watch('emailSubscription.enabled') && (
            <div className="mt-4 p-4 bg-gray-50 rounded">
              <input
                {...register('emailSubscription.title')}
                className="w-full border rounded px-3 py-2 mb-3"
                placeholder="标题"
              />
              <input
                {...register('emailSubscription.subtitle')}
                className="w-full border rounded px-3 py-2"
                placeholder="副标题"
              />
            </div>
          )}
        </div>

        {/* ========== 标识与菜单 ========== */}
        <div className="border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-semibold">标识与菜单</h2>
          
          {/* 网站标识 */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="text-md font-medium">网站标识</span>
              <ToggleSwitch
                enabled={watch('brandMenu.brandItem.visible')}
                onChange={(val) => setValue('brandMenu.brandItem.visible', val)}
                label=""
              />
            </div>
            {watch('brandMenu.brandItem.visible') && (
              <div className="mt-4 space-y-4">
                <ImageUploader
                  value={watch('brandMenu.brandItem.imageUrl') || ''}
                  onChange={(url) => setValue('brandMenu.brandItem.imageUrl', url)}
                  label="标识图片"
                  hint="建议尺寸 250×100px (2.5:1)，优先使用 PNG 格式"
                  width={250}
                  aspectRatio={2.5}
                  buttonText="上传图片"
                />
                <SliderInput
                  value={watch('brandMenu.brandItem.imageWidth') || 120}
                  onChange={(val) => setValue('brandMenu.brandItem.imageWidth', val)}
                  label="图片宽度"
                  min={20}
                  max={300}
                />
                <div>
                  <label className="block text-sm font-medium">对齐方式</label>
                  <select
                    {...register('brandMenu.brandItem.imageAlign')}
                    className="mt-1 w-full border rounded px-3 py-2"
                  >
                    {ALIGN_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 菜单-1 */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="text-md font-medium">菜单-1</span>
              <ToggleSwitch
                enabled={watch('brandMenu.column1.visible')}
                onChange={(val) => setValue('brandMenu.column1.visible', val)}
                label=""
              />
            </div>
            {watch('brandMenu.column1.visible') && (
              <div className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <input
                  {...register('brandMenu.column1.title')}
                  className="w-full border rounded px-3 py-2"
                  placeholder="菜单名称"
                />
                <MenuSelector
                  value={watch('brandMenu.column1.menuId')}
                  onChange={(id) => setValue('brandMenu.column1.menuId', id)}
                  locale={locale}
                  label="菜单"
                />
              </div>
            )}
          </div>

          {/* 菜单-2 */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="text-md font-medium">菜单-2</span>
              <ToggleSwitch
                enabled={watch('brandMenu.column2.visible')}
                onChange={(val) => setValue('brandMenu.column2.visible', val)}
                label=""
              />
            </div>
            {watch('brandMenu.column2.visible') && (
              <div className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <input
                  {...register('brandMenu.column2.title')}
                  className="w-full border rounded px-3 py-2"
                  placeholder="菜单名称"
                />
                <MenuSelector
                  value={watch('brandMenu.column2.menuId')}
                  onChange={(id) => setValue('brandMenu.column2.menuId', id)}
                  locale={locale}
                  label="菜单"
                />
              </div>
            )}
          </div>

          {/* 菜单-3 */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="text-md font-medium">菜单-3</span>
              <ToggleSwitch
                enabled={watch('brandMenu.column3.visible')}
                onChange={(val) => setValue('brandMenu.column3.visible', val)}
                label=""
              />
            </div>
            {watch('brandMenu.column3.visible') && (
              <div className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <input
                  {...register('brandMenu.column3.title')}
                  className="w-full border rounded px-3 py-2"
                  placeholder="菜单名称"
                />
                <MenuSelector
                  value={watch('brandMenu.column3.menuId')}
                  onChange={(id) => setValue('brandMenu.column3.menuId', id)}
                  locale={locale}
                  label="菜单"
                />
              </div>
            )}
          </div>

          {/* 文本信息 */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center">
              <span className="text-md font-medium">文本信息</span>
              <ToggleSwitch
                enabled={watch('textInfo.enabled')}
                onChange={(val) => setValue('textInfo.enabled', val)}
                label=""
              />
            </div>
            {watch('textInfo.enabled') && (
              <div className="mt-4 p-4 bg-gray-50 rounded space-y-4">
                <input
                  {...register('textInfo.title')}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例如：联系我们"
                />
                <textarea
                  {...register('textInfo.content')}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="可以输入每天服务时间，联系邮件等信息"
                />
              </div>
            )}
          </div>
        </div>

        {/* ========== 社交媒体 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">社交媒体</h2>
          <ToggleSwitch
            enabled={watch('social.visible')}
            onChange={(val) => setValue('social.visible', val)}
            label="是否显示社交媒体区块"
          />
          {watch('social.visible') && (
            <div className="grid grid-cols-2 gap-4">
              {SOCIAL_PLATFORMS.map(platform => {
                const IconComponent = platformIcons[platform.value];
                return (
                  <div key={platform.value} className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
                      {IconComponent && <IconComponent className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium">{platform.label}</label>
                      <input
                        type="url"
                        value={getSocialUrl(platform.value)}
                        onChange={(e) => updateSocialLink(platform.value, e.target.value)}
                        className="mt-1 w-full border rounded px-3 py-2"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========== 公共设施 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">公共设施</h2>
          <ToggleSwitch
            enabled={watch('utilities.showPolicyLinks')}
            onChange={(val) => setValue('utilities.showPolicyLinks', val)}
            label="管理政策"
          />
          <SliderInput
            value={watch('utilities.topSpacing')}
            onChange={(val) => setValue('utilities.topSpacing', val)}
            label="顶部间隔"
            max={100}
          />
          <SliderInput
            value={watch('utilities.bottomSpacing')}
            onChange={(val) => setValue('utilities.bottomSpacing', val)}
            label="底部间隔"
            max={100}
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            保存所有设置
          </button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}