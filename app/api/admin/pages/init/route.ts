// app/api/admin/pages/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';
import { supabase } from '@/lib/supabase/client';
import matter from 'gray-matter';
import { PageData } from '@/types/page';

const SITE_ID = '000001';
const STORAGE_PREFIX = 'data/pages';

// ========== 中文版预设页面 ==========
const PRESET_PAGES_ZH: PageData[] = [
  {
    id: '10000001',
    title: '主页',
    type: 'home',
    preset: true,
    visible: 'visible',
    template: 'default_homepage_published',
    slug: 'home',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-06-02T14:39:27.317Z',
  },
  {
    id: '10000002',
    title: '退货和退款政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: 'default_page_published',
    slug: 'tui-huo-he-tui-kuan-zheng-ce',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T04:19:06.604Z',
  },
  {
    id: '10000003',
    title: '隐私政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    slug: 'yin-si-zheng-ce',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T02:50:38.750Z',
  },
  {
    id: '10000004',
    title: '服务条款',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    slug: 'fu-wu-tiao-kuan',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T02:50:38.750Z',
  },
  {
    id: '10000005',
    title: '物流政策',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    slug: 'wu-liu-zheng-ce',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T02:50:38.750Z',
  },
  {
    id: '10000006',
    title: '联系方式',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    slug: 'lian-xi-fang-shi',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T02:50:38.750Z',
  },
  {
    id: '10000007',
    title: '法律声明',
    type: 'policy',
    preset: true,
    visible: 'visible',
    template: '',
    slug: 'fa-lv-sheng-ming',
    seo_keywords: '',
    seo_title: '',
    seo_description: '',
    content: '',
    createdAt: '2026-05-15T02:50:38.750Z',
    updatedAt: '2026-05-15T02:50:38.750Z',
  },
];

// ========== 英文版预设页面 ==========
const PRESET_PAGES_EN: PageData[] = PRESET_PAGES_ZH.map(p => ({
  ...p,
  title: {
    '10000001': 'Home',
    '10000002': 'Return and Refund Policy',
    '10000003': 'Privacy Policy',
    '10000004': 'Terms of Service',
    '10000005': 'Shipping Policy',
    '10000006': 'Contact Us',
    '10000007': 'Legal Notice',
  }[p.id] || p.title,
  slug: {
    '10000001': 'home',
    '10000002': 'return-and-refund-policy',
    '10000003': 'privacy-policy',
    '10000004': 'terms-of-service',
    '10000005': 'shipping-policy',
    '10000006': 'contact-us',
    '10000007': 'legal-notice',
  }[p.id] || p.slug,
}));

async function writePageFile(locale: string, page: PageData): Promise<void> {
  const storage = getPrivateStorage();
  const key = `${STORAGE_PREFIX}/${locale}/${page.id}.md`;
  const frontMatter: any = {
    id: page.id,
    title: page.title,
    type: page.type,
    preset: page.preset,
    visible: page.visible,
    template: page.template,
    slug: page.slug,
    seo_keywords: page.seo_keywords,
    seo_title: page.seo_title,
    seo_description: page.seo_description,
    createdAt: page.createdAt,
    updatedAt: page.updatedAt,
    templateData: page.templateData || null,
  };
  Object.keys(frontMatter).forEach(k => frontMatter[k] === undefined && delete frontMatter[k]);
  const content = page.content || '';
  const fileContent = matter.stringify(content, frontMatter);
  await storage.write(key, fileContent, { contentType: 'text/markdown' });
}

async function upsertPageMeta(page: PageData, locale: string): Promise<void> {
  const record = {
    site_id: SITE_ID,
    id: page.id,
    locale: locale,
    title: page.title,
    type: page.type,
    preset: page.preset || false,
    visible: page.visible || 'visible',
    template: page.template || '',
    slug: page.slug,
    seo_keywords: page.seo_keywords || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    updated_at: page.updatedAt,
  };

  const { error } = await supabase
    .from('site_pages')
    .upsert(record, { onConflict: 'site_id,id,locale' });

  if (error) {
    throw error;
  }
}

async function pageFileExists(locale: string, pageId: string): Promise<boolean> {
  const storage = getPrivateStorage();
  const key = `${STORAGE_PREFIX}/${locale}/${pageId}.md`;
  try {
    await storage.read(key, 'utf8');
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');

  if (!locale) {
    return NextResponse.json({ error: '缺少 locale 参数' }, { status: 400 });
  }

  const presets = locale === 'zh' ? PRESET_PAGES_ZH : PRESET_PAGES_EN;
  const results: { locale: string; id: string; status: 'success' | 'skipped' | 'error'; error?: string }[] = [];

  for (const preset of presets) {
    const exists = await pageFileExists(locale, preset.id);
    if (exists) {
      results.push({ locale, id: preset.id, status: 'skipped' });
      continue;
    }

    try {
      await writePageFile(locale, preset);
    } catch (err) {
      results.push({ locale, id: preset.id, status: 'error', error: String(err) });
      continue;
    }

    try {
      await upsertPageMeta(preset, locale);
      results.push({ locale, id: preset.id, status: 'success' });
    } catch (err) {
      results.push({ locale, id: preset.id, status: 'error', error: String(err) });
    }
  }

  const total = presets.length;
  const successCount = results.filter(r => r.status === 'success').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    locale,
    total,
    successCount,
    skippedCount,
    errorCount,
    results,
  });
}