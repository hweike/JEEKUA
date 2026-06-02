// modules/discovery/translate/core.ts
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import matter from 'gray-matter';
import { getDb } from '@/lib/db';
import { translateText } from '@/lib/discovery/deepseek';
import translationConfig from '@/data/discovery/translation-config.json';

const SITE_ID = '000001';
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

function upsertPageToDb(pageData: any, locale: string) {
  const db = getDb();
  const contentHash = computeHash({
    title: pageData.title,
    full_content: pageData.content_full || '',
    seo_title: pageData.seo_title || '',
    seo_description: pageData.seo_description || '',
    seo_keywords: pageData.seo_keywords || '',
  });
  db.prepare(`
    INSERT OR REPLACE INTO pages (
      id, site_id, locale, type, title, slug, url, cover_image,
      seo_title, seo_description, seo_keywords, canonical,
      noindex, nofollow, priority, changefreq, content_summary,
      content_hash, last_synced_at, synced_locales, source_hash,
      translated_by_ai, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pageData.id, SITE_ID, locale, pageData.type, pageData.title, pageData.slug || null, pageData.url, pageData.cover_image || null,
    pageData.seo_title || null, pageData.seo_description || null, pageData.seo_keywords || null, pageData.canonical || null,
    pageData.noindex ? 1 : 0, pageData.nofollow ? 1 : 0, pageData.priority ?? 0.5, pageData.changefreq || 'weekly',
    pageData.content_summary || null,
    contentHash,
    null, null, pageData.source_hash || null,
    pageData.translated_by_ai ? 1 : 0,
    pageData.updatedAt
  );
  db.prepare(`
    INSERT OR REPLACE INTO page_contents (page_id, site_id, locale, full_content, content_hash, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(pageData.id, SITE_ID, locale, pageData.content_full || null, contentHash, pageData.updatedAt);
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
  const db = getDb();
  const sourcePage = db.prepare(`
    SELECT p.*, pc.full_content
    FROM pages p
    LEFT JOIN page_contents pc ON p.id = pc.page_id AND p.site_id = pc.site_id AND p.locale = pc.locale
    WHERE p.id = ? AND p.site_id = ? AND p.locale = ?
  `).get(pageId, SITE_ID, sourceLocale) as any;

  if (!sourcePage) {
    return { success: false, message: '源页面不存在' };
  }

  const targetPage = db.prepare(`
    SELECT * FROM pages WHERE id = ? AND site_id = ? AND locale = ?
  `).get(pageId, SITE_ID, targetLocale) as any;

  const sourceHash = sourcePage.content_hash;
  if (targetPage && targetPage.source_hash === sourceHash && targetPage.translated_by_ai === 1) {
    return { success: false, message: '内容未变化，跳过' };
  }

  const fields = getFieldsToTranslate(sourcePage.type);
  if (fields.length === 0) {
    return { success: false, message: '该类型无需翻译字段' };
  }

  const sourceData: any = {
    title: sourcePage.title,
    content: sourcePage.full_content || '',
    seo_title: sourcePage.seo_title,
    seo_description: sourcePage.seo_description,
    seo_keywords: sourcePage.seo_keywords,
    short_description: sourcePage.short_description || '',
    description: sourcePage.description || '',
    excerpt: sourcePage.excerpt || '',
  };

  const translatedData: any = {};
  for (const field of fields) {
    const text = getNestedValue(sourceData, field);
    if (text) {
      translatedData[field] = await translateText(text, targetLocale);
    }
  }

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

  upsertPageToDb(targetPageData, targetLocale);
  await writeTranslatedToFile(targetPageData, targetLocale);

  const synced = sourcePage.synced_locales ? JSON.parse(sourcePage.synced_locales) : [];
  if (!synced.includes(targetLocale)) {
    synced.push(targetLocale);
    db.prepare(`UPDATE pages SET synced_locales = ?, last_synced_at = ? WHERE id = ? AND site_id = ? AND locale = ?`)
      .run(JSON.stringify(synced), new Date().toISOString(), pageId, SITE_ID, sourceLocale);
  }

  db.prepare(`
    INSERT INTO sync_logs (site_id, syncType, source_locale, target_locale, item_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(SITE_ID, 'page', sourceLocale, targetLocale, pageId, 'success', new Date().toISOString());

  return { success: true };
}