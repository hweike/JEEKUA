import { writePage } from '../lib/pages/storage';
import { PageData } from '../types/page';

// 预设页面数据模板（基础信息，语言无关）
const PRESET_PAGES: Omit<PageData, 'slug' | 'createdAt' | 'updatedAt' | 'content'>[] = [
  {
    id: '10000001',
    title: '主页',
    type: 'home',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000002',
    title: '退货和退款政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000003',
    title: '隐私政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000004',
    title: '服务条款',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000005',
    title: '物流政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000006',
    title: '联系方式',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
  {
    id: '10000007',
    title: '法律声明',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
  },
];

// 各语言下 slug 映射（中文拼音 vs 英文翻译）
const SLUG_MAP: Record<string, Record<string, string>> = {
  zh: {
    主页: 'zhu-ye',
    '退货和退款政策': 'tui-huo-he-tui-kuan-zheng-ce',
    隐私政策: 'yin-si-zheng-ce',
    服务条款: 'fu-wu-tiao-kuan',
    物流政策: 'wu-liu-zheng-ce',
    联系方式: 'lian-xi-fang-shi',
    法律声明: 'fa-lv-sheng-ming',
  },
  en: {
    主页: 'home',
    '退货和退款政策': 'refund-policy',
    隐私政策: 'privacy-policy',
    服务条款: 'terms-of-service',
    物流政策: 'shipping-policy',
    联系方式: 'contact',
    法律声明: 'legal-notice',
  },
};

async function initPresetPages() {
  const locales = ['zh', 'en'];
  const now = new Date().toISOString();

  for (const locale of locales) {
    for (const preset of PRESET_PAGES) {
      // 获取该语言下的 slug（如果未定义则使用拼音生成降级）
      let slug = SLUG_MAP[locale]?.[preset.title];
      if (!slug) {
        // 降级：从标题生成拼音（仅用于未定义的标题，实际不会发生）
        const { generateSlugFromTitle } = await import('../lib/pages/pageService');
        slug = generateSlugFromTitle(preset.title);
      }

      const page: PageData = {
        ...preset,
        slug,
        content: '', // 内容为空
        createdAt: now,
        updatedAt: now,
      };

      await writePage(locale, page);
      console.log(`✅ Created ${preset.title} (${locale}) -> ${slug}`);
    }
  }

  console.log('🎉 Preset pages initialization complete.');
}

initPresetPages().catch(console.error);