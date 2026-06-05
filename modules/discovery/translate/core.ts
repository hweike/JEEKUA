import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { supabase } from '@/lib/supabase/client';
import { translateText } from '@/lib/discovery/deepseek';
import translationConfig from '@/data/discovery/translation-config.json';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const DATA_ROOT = path.join(process.cwd(), 'data');

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

function getFieldsToTranslate(pageType: string): string[] {
  return (translationConfig as any)[pageType]?.fields || [];
}

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((o, key) => o?.[key], obj) || '';
}

function setNestedValue(obj: any, path: string, value: string): void {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, key) => o[key] = o[key] || {}, obj);
  if (last) target[last] = value;
}

async function upsertPageToDb(pageData: any, locale: string) {
  const contentHash = computeHash({
    title: pageData.title,
    full_content: pageData.content_full || '',
    seo_title: pageData.seo_title || '',
    seo_description: pageData.seo_description || '',
    seo_keywords: pageData.seo_keywords || '',
  });

  // Upsert pages
  const { error: pageError } = await supabase
    .from('pages')
    .upsert({
      id: pageData.id,
      site_id: SITE_ID,
      locale: locale,
      type: pageData.type,
      title: pageData.title,
      slug: pageData.slug || null,
      url: pageData.url,
      cover_image: pageData.cover_image || null,
      seo_title: pageData.seo_title || null,
      seo_description: pageData.seo_description || null,
      seo_keywords: pageData.seo_keywords || null,
      canonical: pageData.canonical || null,
      noindex: pageData.noindex ? 1 : 0,
      nofollow: pageData.nofollow ? 1 : 0,
      priority: pageData.priority ?? 0.5,
      changefreq: pageData.changefreq || 'weekly',
      content_summary: pageData.content_summary || null,
      content_hash: contentHash,
      last_synced_at: null,
      synced_locales: null,
      source_hash: pageData.source_hash || null,
      translated_by_ai: pageData.translated_by_ai ? 1 : 0,
      updatedAt: pageData.updatedAt,
    }, {
      onConflict: 'id, site_id, locale',
    });
  if (pageError) {
    console.error('Upsert pages failed:', pageError);
    throw new Error(`Failed to upsert page: ${pageError.message}`);
  }

  // Upsert page_contents
  const { error: contentError } = await supabase
    .from('page_contents')
    .upsert({
      page_id: pageData.id,
      site_id: SITE_ID,
      locale: locale,
      full_content: pageData.content_full || null,
      content_hash: contentHash,
      updatedAt: pageData.updatedAt,
    }, {
      onConflict: 'page_id, site_id, locale',
    });
  if (contentError) {
    console.error('Upsert page_contents failed:', contentError);
    throw new Error(`Failed to upsert page content: ${contentError.message}`);
  }
}

async function writeTranslatedToFile(pageData: any, locale: string) {
  const { type, slug, title, content_full, seo_title, seo_description, seo_keywords } = pageData;
  let filePath = '';

  // 静态页面 (pages.json)
  if (type === 'page') {
    filePath = path.join(DATA_ROOT, 'pages.json');
    if (await fs.access(filePath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(filePath, 'utf-8');
      const pagesData = JSON.parse(content);
      const target = pagesData.find((p: any) => p.slug === slug);
      if (target) {
        if (!target.seo_title) target.seo_title = {};
        if (!target.seo_description) target.seo_description = {};
        if (!target.seo_keywords) target.seo_keywords = {};
        target.title[locale] = title;
        target.content[locale] = content_full;
        target.seo_title[locale] = seo_title;
        target.seo_description[locale] = seo_description;
        target.seo_keywords[locale] = seo_keywords;
        await fs.writeFile(filePath, JSON.stringify(pagesData, null, 2));
      }
    }
  }
  // Markdown 内容类型（产品、文档、博客文章、视频）
  else if (['product', 'doc', 'blogPost', 'video'].includes(type)) {
    const dir = type === 'blogPost' ? 'blogs' : `${type}s`;
    filePath = path.join(DATA_ROOT, dir, locale, `${slug}.md`);
    if (await fs.access(filePath).then(() => true).catch(() => false)) {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      data.title = title;
      data.content = content_full;
      data.seo_title = seo_title;
      data.seo_description = seo_description;
      data.seo_keywords = seo_keywords;
      await fs.writeFile(filePath, matter.stringify(content, data));
    }
  }
  // 产品合集 (productCollection) -> categories.json
  else if (type === 'productCollection') {
    const jsonPath = path.join(DATA_ROOT, 'products', locale, 'categories.json');
    if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      const categories = data.categories || [];
      const parts = slug.split('/');
      if (parts.length === 1) {
        const cat = categories.find((c: any) => c.slug === parts[0]);
        if (cat) {
          cat.name = title;
          cat.description = content_full;
          cat.seoTitle = seo_title;
          cat.seoDescription = seo_description;
          cat.seoKeywords = seo_keywords;
        }
      } else if (parts.length === 2) {
        const cat = categories.find((c: any) => c.slug === parts[0]);
        if (cat && cat.series) {
          const sub = cat.series.find((s: any) => s.slug === parts[1]);
          if (sub) {
            sub.name = title;
            sub.description = content_full;
            if (sub.seo) {
              sub.seo.title = seo_title;
              sub.seo.description = seo_description;
              sub.seo.keywords = seo_keywords;
            }
          }
        }
      }
      await fs.writeFile(jsonPath, JSON.stringify(data, null, 2));
    }
  }
  // 文档库 (docLibrary) -> libs.json
  else if (type === 'docLibrary') {
    const jsonPath = path.join(DATA_ROOT, 'docs', locale, 'libs.json');
    if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const libraries = JSON.parse(content);
      const lib = libraries.find((l: any) => l.slug === slug || l.id === slug);
      if (lib) {
        lib.name = title;
        lib.description = content_full;
        lib.seo_title = seo_title;
        lib.seo_description = seo_description;
        lib.seo_keywords = seo_keywords;
        await fs.writeFile(jsonPath, JSON.stringify(libraries, null, 2));
      }
    }
  }
  // 博客分类 (blogCategory) -> categories.json
  else if (type === 'blogCategory') {
    const jsonPath = path.join(DATA_ROOT, 'blog', locale, 'categories.json');
    if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const categories = JSON.parse(content);
      const cat = categories.find((c: any) => c.slug === slug);
      if (cat) {
        cat.title = title;
        cat.seo_title = seo_title;
        cat.seo_description = seo_description;
        cat.seo_keywords = seo_keywords;
        await fs.writeFile(jsonPath, JSON.stringify(categories, null, 2));
      }
    }
  }
  // 视频分类 (videoCategory) -> videosys/{locale}/categories.json
  else if (type === 'videoCategory') {
    const jsonPath = path.join(DATA_ROOT, 'videosys', locale, 'categories.json');
    if (await fs.access(jsonPath).then(() => true).catch(() => false)) {
      const content = await fs.readFile(jsonPath, 'utf-8');
      const categories = JSON.parse(content);
      const entry = Object.values(categories).find((c: any) => c.slug === slug);
      if (entry) {
        (entry as any).name = title;
        if ((entry as any).seo) {
          (entry as any).seo.title = seo_title;
          (entry as any).seo.description = seo_description;
          (entry as any).seo.keywords = seo_keywords;
        } else {
          (entry as any).seo = { title: seo_title, description: seo_description, keywords: seo_keywords };
        }
        await fs.writeFile(jsonPath, JSON.stringify(categories, null, 2));
      }
    }
  }
  // 其他类型（home, inquiry, policy）的物理文件更新请根据需要补充
}

export async function translatePage(
  sourceLocale: string,
  targetLocale: string,
  pageId: string
): Promise<{ success: boolean; message?: string }> {
  // 查询源页面（包含 page_contents）
  const { data: sourcePage, error: sourceError } = await supabase
    .from('pages')
    .select(`
      *,
      page_contents!left (full_content)
    `)
    .eq('id', pageId)
    .eq('site_id', SITE_ID)
    .eq('locale', sourceLocale)
    .maybeSingle();

  if (sourceError || !sourcePage) {
    console.error('查询源页面失败:', sourceError);
    return { success: false, message: '源页面不存在' };
  }

  // 查询目标页面（判断是否需要翻译）
  const { data: targetPage, error: targetError } = await supabase
    .from('pages')
    .select('*')
    .eq('id', pageId)
    .eq('site_id', SITE_ID)
    .eq('locale', targetLocale)
    .maybeSingle();

  const sourceHash = sourcePage.content_hash;
  if (targetPage && targetPage.source_hash === sourceHash && targetPage.translated_by_ai === 1) {
    return { success: false, message: '内容未变化，跳过' };
  }

  const fields = getFieldsToTranslate(sourcePage.type);
  if (fields.length === 0) {
    return { success: false, message: '该类型无需翻译字段' };
  }

  // 提取需要翻译的源数据
  const sourceData: any = {
    title: sourcePage.title,
    content: sourcePage.page_contents?.full_content || '',
    seo_title: sourcePage.seo_title,
    seo_description: sourcePage.seo_description,
    seo_keywords: sourcePage.seo_keywords,
    short_description: sourcePage.short_description || '',
    description: sourcePage.description || '',
    excerpt: sourcePage.excerpt || '',
  };

  // 调用翻译接口
  const translatedData: any = {};
  for (const field of fields) {
    const text = getNestedValue(sourceData, field);
    if (text) {
      translatedData[field] = await translateText(text, targetLocale);
    }
  }

  // 准备目标页面数据
  const targetPageData = {
    id: pageId,
    type: sourcePage.type,
    title: translatedData.title || sourcePage.title,
    slug: sourcePage.slug,
    url: sourcePage.url,
    cover_image: sourcePage.cover_image,
    seo_title: translatedData.seo_title,
    seo_description: translatedData.seo_description,
    seo_keywords: translatedData.seo_keywords,
    content_summary: (translatedData.content || '').slice(0, 5000),
    content_full: translatedData.content || '',
    updatedAt: new Date().toISOString(),
    translated_by_ai: 1,
    source_hash: sourceHash,
    noindex: sourcePage.noindex,
    nofollow: sourcePage.nofollow,
    priority: sourcePage.priority,
    changefreq: sourcePage.changefreq,
    canonical: sourcePage.canonical,
  };

  // 写入数据库
  await upsertPageToDb(targetPageData, targetLocale);

  // 写入物理文件
  await writeTranslatedToFile(targetPageData, targetLocale);

  // 更新源页面的 synced_locales 字段
  let synced = sourcePage.synced_locales ? JSON.parse(sourcePage.synced_locales) : [];
  if (!synced.includes(targetLocale)) {
    synced.push(targetLocale);
    const { error: updateError } = await supabase
      .from('pages')
      .update({
        synced_locales: JSON.stringify(synced),
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .eq('site_id', SITE_ID)
      .eq('locale', sourceLocale);
    if (updateError) {
      console.error('更新 synced_locales 失败:', updateError);
    }
  }

  // 记录同步日志
  const { error: logError } = await supabase
    .from('sync_logs')
    .insert({
      site_id: SITE_ID,
      syncType: 'page',
      source_locale: sourceLocale,
      target_locale: targetLocale,
      item_id: pageId,
      status: 'success',
      created_at: new Date().toISOString(),
    });
  if (logError) {
    console.error('记录同步日志失败:', logError);
  }

  return { success: true };
}