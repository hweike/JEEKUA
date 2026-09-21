// app/api/admin/pages/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PageData } from '@/types/page';
import { createPage, readPage, updatePage } from '@/lib/pages/pageService';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin-client';

function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// ========== 预设页面配置 ==========
type PresetPage = Omit<PageData, 'templateHash' | 'templateData' | 'createdAt' | 'updatedAt' | 'locale'>;

const PRESET_PAGES_ZH: PresetPage[] = [
  { id: '10000001', title: '主页', type: 'home', preset: true, visible: 'visible', template: 'default_homepage_published', slug: 'home', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000002', title: '退货和退款政策', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'tui-huo-he-tui-kuan-zheng-ce', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000003', title: '隐私政策', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'yin-si-zheng-ce', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000004', title: '服务条款', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'fu-wu-tiao-kuan', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000005', title: '物流政策', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'wu-liu-zheng-ce', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000006', title: '联系方式', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'lian-xi-fang-shi', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000007', title: '保修政策', type: 'policy', preset: true, visible: 'visible', template: 'default_page_published', slug: 'bao-xiu-zheng-ce', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
  { id: '10000010', title: '询盘', type: 'Inquiry', preset: true, visible: 'visible', template: 'default_inquiry_published', slug: 'inquiry', seo_keywords: '', seo_title: '', seo_description: '', content: '' },
];

const PRESET_PAGES_EN: PresetPage[] = PRESET_PAGES_ZH.map(p => ({
  ...p,
  title: {
    '10000001': 'Home', '10000002': 'Return and Refund Policy', '10000003': 'Privacy Policy',
    '10000004': 'Terms of Service', '10000005': 'Shipping Policy', '10000006': 'Contact Us',
    '10000007': 'Warranty Policy', '10000010': 'Inquiry',
  }[p.id] || p.title,
  slug: {
    '10000001': 'home', '10000002': 'return-and-refund-policy', '10000003': 'privacy-policy',
    '10000004': 'terms-of-service', '10000005': 'shipping-policy', '10000006': 'contact-us',
    '10000007': 'warranty-policy', '10000010': 'inquiry',
  }[p.id] || p.slug,
}));

// ========== 批量查询模板数据（一次读取，避免重复） ==========
async function fetchAllTemplates(templateIds: string[]): Promise<Map<string, { data: any; hash: string }>> {
  const map = new Map();
  const uniqueIds = [...new Set(templateIds.filter(Boolean))];

  // 串行读取（避免并发导致云存储限流），但每个模板只读一次
  for (const id of uniqueIds) {
    try {
      const template = await getTemplateById(id);
      if (template && template.data) {
        map.set(id, {
          data: template.data,
          hash: computeTemplateHash(template.data),
        });
      }
    } catch (err) {
      console.warn(`[init] 读取模板 ${id} 失败:`, err);
    }
  }
  return map;
}

// ========== POST 处理（优化：批量查询 + 批量写入） ==========
export async function POST(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');

  if (!locale) {
    return NextResponse.json({ error: '缺少 locale 参数' }, { status: 400 });
  }

  const presets = locale === 'zh' ? PRESET_PAGES_ZH : PRESET_PAGES_EN;
  const startTime = Date.now();

  // ========== 1. 一次性查询所有已存在页面的元数据 ==========
  const presetIds = presets.map(p => p.id);
  const { data: existingPages } = await supabaseAdmin
    .from('site_pages')
    .select('id, template, template_hash, template_data')
    .eq('site_id', '000001')
    .eq('locale', locale)
    .in('id', presetIds);

  const existingMap = new Map(
    (existingPages || []).map(p => [p.id, p])
  );

  // ========== 2. 一次性查询所有需要的模板数据 ==========
  const templateIds = presets.map(p => p.template).filter(Boolean);
  const templateMap = await fetchAllTemplates(templateIds);

  // ========== 3. 批量处理（统一构建 upsert 数据） ==========
  const toUpsert: any[] = [];
  const toCreate: PresetPage[] = [];
  const results: { locale: string; id: string; status: 'created' | 'updated' | 'skipped' | 'error'; error?: string }[] = [];

  for (const preset of presets) {
    try {
      const existing = existingMap.get(preset.id);

      if (existing) {
        // 页面已存在 → 检查是否需要补全 template_data
        const template = preset.template ? templateMap.get(preset.template) : null;

        const isTemplateDataEmpty =
          !existing.template_data ||
          (typeof existing.template_data === 'object' &&
           !Array.isArray(existing.template_data) &&
           Object.keys(existing.template_data).length === 0);

        const needsTemplateUpdate =
          template &&
          (isTemplateDataEmpty || existing.template !== preset.template);

        if (needsTemplateUpdate) {
          const now = new Date().toISOString();
          toUpsert.push({
            site_id: '000001',
            id: preset.id,
            locale,
            title: preset.title,
            type: preset.type || 'custom',
            preset: true,
            visible: preset.visible,
            template: preset.template || '',
            template_hash: template.hash,
            slug: preset.slug,
            seo_keywords: preset.seo_keywords || '',
            seo_title: preset.seo_title || '',
            seo_description: preset.seo_description || '',
            content: preset.content || '',
            template_data: template.data,
            updated_at: now,
          });
          results.push({ locale, id: preset.id, status: 'updated' });
        } else {
          results.push({ locale, id: preset.id, status: 'skipped' });
        }
      } else {
        // 页面不存在 → 需要创建
        toCreate.push(preset);
      }
    } catch (err: any) {
      results.push({ locale, id: preset.id, status: 'error', error: err.message });
    }
  }

  // ========== 4. 批量 upsert 已存在页面（一次请求） ==========
  if (toUpsert.length > 0) {
    const { error } = await supabaseAdmin
      .from('site_pages')
      .upsert(toUpsert, { onConflict: 'site_id,id,locale' });

    if (error) {
      console.error('[init] 批量 upsert 失败:', error);
      // 将失败信息记录
      for (const row of toUpsert) {
        const idx = results.findIndex(r => r.id === row.id && r.locale === row.locale);
        if (idx >= 0 && results[idx].status === 'updated') {
          results[idx] = { ...results[idx], status: 'error', error: error.message };
        }
      }
    }
  }

  // ========== 5. 批量创建不存在的页面（串行，每个独立 createPage） ==========
  for (const preset of toCreate) {
    try {
      await createPage(
        locale,
        {
          title: preset.title,
          content: preset.content || '',
          visible: preset.visible as 'visible' | 'hidden',
          template: preset.template || '',
          slug: preset.slug,
          seo_keywords: preset.seo_keywords || '',
          seo_title: preset.seo_title || '',
          seo_description: preset.seo_description || '',
          type: preset.type,
          preset: true,
        },
        preset.id
      );
      results.push({ locale, id: preset.id, status: 'created' });
    } catch (err: any) {
      results.push({ locale, id: preset.id, status: 'error', error: err.message });
    }
  }

  const createdCount = results.filter(r => r.status === 'created').length;
  const updatedCount = results.filter(r => r.status === 'updated').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return NextResponse.json({
    success: true,
    locale,
    total: presets.length,
    createdCount,
    updatedCount,
    skippedCount,
    errorCount,
    duration: Date.now() - startTime,
    results,
  });
}