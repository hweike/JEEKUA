'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { HeaderConfig } from '@/lib/SiteHeadersFooters/types';
import ImageUploader from '../common/ImageUploader';
import SliderInput from '../common/SliderInput';
import ToggleSwitch from '../common/ToggleSwitch';
import MenuSelector from '../common/MenuSelector';
import Toast from '@/components/common/Toast';
import { LOGO_POSITIONS, MOBILE_LOGO_POSITIONS, MENU_TYPES, STICKY_BEHAVIORS } from '@/lib/SiteHeadersFooters/config';
import { Plus, Trash2 } from 'lucide-react';

const headerSchema = z.object({
  style: z.enum(['simple', 'classic', 'luxury']),
  logo: z.object({
    imageUrl: z.string(),
    width: z.number(),
    position: z.enum(['top-center', 'middle-left', 'middle-center']),
    mobilePosition: z.enum(['center', 'left']),
    faviconUrl: z.string(),
  }),
  menu: z.object({
    menuSourceId: z.string(),
    menuType: z.enum(['dropdown', 'mega']),
    stickyBehavior: z.enum(['scroll-up', 'always']),
    showSeparator: z.boolean(),
  }),
  utilities: z.object({
    showLanguageSelector: z.boolean(),
    topSpacing: z.number(),
    bottomSpacing: z.number(),
  }),
  announcements: z.object({
    enabled: z.boolean(),
    items: z.array(z.object({ id: z.string(), text: z.string(), link: z.string().optional() })),
  }),
  search: z.object({
    enabled: z.boolean(),
    placeholder: z.string(),
  }),
});

interface HeaderFormProps {
  initialConfig: HeaderConfig;
  locale: string;
}

const DEFAULTS = {
  style: 'simple' as const,
  search: { enabled: false, placeholder: '搜索...' },
};

export default function HeaderForm({ initialConfig, locale }: HeaderFormProps) {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const mergedConfig = {
    ...initialConfig,
    style: initialConfig.style || DEFAULTS.style,
    search: initialConfig.search || DEFAULTS.search,
  };

  const { register, control, handleSubmit, watch, setValue } = useForm({
    resolver: zodResolver(headerSchema),
    defaultValues: mergedConfig,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'announcements.items',
  });

  const onSubmit = async (data: HeaderConfig) => {
    try {
      const res = await fetch('/api/SiteHeadersFooters/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'header', locale, config: data }),
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

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* ========== 页头风格卡片 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">页头风格</h2>
          <div>
            <label className="block text-sm font-medium mb-2">选择风格</label>
            <select {...register('style')} className="w-full border rounded px-3 py-2">
              <option value="simple">简洁风格</option>
              <option value="classic">经典风格</option>
              <option value="luxury">轻奢展示</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">不同风格影响前台导航栏的布局和视觉效果</p>
          </div>
        </div>

        {/* ========== Logo 设置 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">Logo 设置</h2>
          <ImageUploader
            value={watch('logo.imageUrl')}
            onChange={(url) => setValue('logo.imageUrl', url)}
            label="Logo"
            hint="建议尺寸 250×100px (2.5:1)，优先使用 PNG 格式"
            width={250}
            aspectRatio={2.5}
            buttonText="上传图片"
          />
          <SliderInput
            value={watch('logo.width')}
            onChange={(val) => setValue('logo.width', val)}
            label="宽度"
            min={50}
            max={300}
          />
          <div>
            <label className="block text-sm font-medium">Logo 位置</label>
            <select {...register('logo.position')} className="mt-1 w-full border rounded px-3 py-2">
              {LOGO_POSITIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">移动设备 Logo 位置</label>
            <select {...register('logo.mobilePosition')} className="mt-1 w-full border rounded px-3 py-2">
              {MOBILE_LOGO_POSITIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <ImageUploader
            value={watch('logo.faviconUrl')}
            onChange={(url) => setValue('logo.faviconUrl', url)}
            label="网站图标"
            hint="以 32×32px 显示，格式建议 .ico 或 PNG"
            width={32}
            height={32}
            buttonText="上传图片"
          />
        </div>

        {/* ========== 菜单设置 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">菜单设置</h2>
          <MenuSelector
            value={watch('menu.menuSourceId')}
            onChange={(id) => setValue('menu.menuSourceId', id)}
            label="菜单"
            locale={locale}   // ✅ 关键修改：传递 locale
          />
          <div>
            <label className="block text-sm font-medium">菜单类型</label>
            <select {...register('menu.menuType')} className="mt-1 w-full border rounded px-3 py-2">
              {MENU_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">粘性页头</label>
            <select {...register('menu.stickyBehavior')} className="mt-1 w-full border rounded px-3 py-2">
              {STICKY_BEHAVIORS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <ToggleSwitch
            enabled={watch('menu.showSeparator')}
            onChange={(val) => setValue('menu.showSeparator', val)}
            label="分隔线"
          />
        </div>

        {/* ========== 公共设施 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">公共设施</h2>
          <ToggleSwitch
            enabled={watch('utilities.showLanguageSelector')}
            onChange={(val) => setValue('utilities.showLanguageSelector', val)}
            label="多语言选择器"
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

        {/* ========== 公告栏 ========== */}
        <div className="border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold">公告栏</h2>
          <ToggleSwitch
            enabled={watch('announcements.enabled')}
            onChange={(val) => setValue('announcements.enabled', val)}
            label="是否开启"
          />
          {watch('announcements.enabled') && (
            <div className="space-y-3">
              {fields.map((field, idx) => (
                <div key={field.id} className="bg-gray-50 rounded p-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      {...register(`announcements.items.${idx}.text`)}
                      className="flex-1 border rounded px-3 py-2"
                      placeholder="公告内容"
                    />
                    <button type="button" onClick={() => remove(idx)} className="text-red-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <input
                    {...register(`announcements.items.${idx}.link`)}
                    className="w-full border rounded px-3 py-2"
                    placeholder="链接（可选，例如：https://example.com）"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ id: crypto.randomUUID(), text: '', link: '' })}
                className="text-blue-600 text-sm inline-flex items-center gap-1"
              >
                <Plus size={16} /> 添加公告
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
            保存设置
          </button>
        </div>
      </form>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}