'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { FooterConfig, SocialLink } from '@/lib/SiteHeadersFooters/types';
import ImageUpload from '@/components/ImageUpload';
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

const footerSchema = z.object({
  style: z.enum(['simple', 'classic', 'luxury']),
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
  onSave?: (success: boolean, message?: string) => void;
}

// 构建完整默认值的函数（确保所有字段存在）
function buildDefaultValues(config: FooterConfig): FooterConfig {
  console.log('[FooterForm] 原始 config:', config);
  const result = {
    style: config.style || 'simple',
    emailSubscription: {
      enabled: config.emailSubscription?.enabled ?? false,
      title: config.emailSubscription?.title || '',
      subtitle: config.emailSubscription?.subtitle || '',
    },
    brandMenu: {
      brandItem: {
        visible: config.brandMenu?.brandItem?.visible ?? false,
        imageUrl: config.brandMenu?.brandItem?.imageUrl || '',
        imageWidth: config.brandMenu?.brandItem?.imageWidth ?? 120,
        imageAlign: config.brandMenu?.brandItem?.imageAlign || 'left',
      },
      column1: {
        visible: config.brandMenu?.column1?.visible ?? false,
        title: config.brandMenu?.column1?.title || '',
        menuId: config.brandMenu?.column1?.menuId || '',
      },
      column2: {
        visible: config.brandMenu?.column2?.visible ?? false,
        title: config.brandMenu?.column2?.title || '',
        menuId: config.brandMenu?.column2?.menuId || '',
      },
      column3: {
        visible: config.brandMenu?.column3?.visible ?? false,
        title: config.brandMenu?.column3?.title || '',
        menuId: config.brandMenu?.column3?.menuId || '',
      },
    },
    social: {
      visible: config.social?.visible ?? false,
      links: config.social?.links || [],
    },
    utilities: {
      showPolicyLinks: config.utilities?.showPolicyLinks ?? false,
      topSpacing: config.utilities?.topSpacing ?? 0,
      bottomSpacing: config.utilities?.bottomSpacing ?? 0,
    },
    textInfo: {
      enabled: config.textInfo?.enabled ?? false,
      title: config.textInfo?.title || '',
      content: config.textInfo?.content || '',
    },
  };
  console.log('[FooterForm] 构建的默认值:', result);
  return result;
}

export default function FooterForm({ initialConfig, locale, onSave }: FooterFormProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // 生成默认值（仅在 initialConfig 变化时重新生成）
  const [defaultValues] = useState(() => buildDefaultValues(initialConfig));

  const { register, control, handleSubmit, watch, setValue } = useForm({
    resolver: zodResolver(footerSchema),
    defaultValues,
    shouldUnregister: false, // 保持字段注册，避免丢失
  });

  // 调试：打印当前表单值变化（可选）
  useEffect(() => {
    const subscription = watch((value) => {
      console.log('[FooterForm] 表单值变化:', value);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: FooterConfig) => {
    console.log('[FooterForm] 提交数据:', data);
    try {
      const res = await fetch('/api/SiteHeadersFooters/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'footer', locale, config: data }),
      });
      console.log('[FooterForm] 响应状态:', res.status);
      if (res.ok) {
        const msg = '保存成功';
        setToast({ message: msg, type: 'success' });
        if (onSave) onSave(true, msg);
      } else {
        const err = await res.json();
        const msg = err.error || '保存失败';
        setToast({ message: msg, type: 'error' });
        if (onSave) onSave(false, msg);
      }
    } catch (error) {
      console.error('[FooterForm] 保存异常:', error);
      const msg = '保存失败，请重试';
      setToast({ message: msg, type: 'error' });
      if (onSave) onSave(false, msg);
    }
  };

  const onError = (errors: any) => {
    console.error('[FooterForm] 表单验证错误:', errors);
    setToast({ message: '表单数据有误，请检查红色字段', type: 'error' });
  };

  // 社交链接更新（保持不变）
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
      <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
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
                <ImageUpload
                  value={watch('brandMenu.brandItem.imageUrl') || ''}
                  onChange={(url) => setValue('brandMenu.brandItem.imageUrl', Array.isArray(url) ? url[0] : url)}
                  maxCount={1}
                  label="标识图片"
                  hint="建议尺寸 250×100px (2.5:1)，优先使用 PNG 格式"
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