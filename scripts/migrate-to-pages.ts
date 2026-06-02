// scripts/migrate-to-pages.ts
import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import crypto from 'crypto';
import { getDb } from '../lib/db';

const db = getDb();
const DATA_ROOT = path.join(process.cwd(), 'data');
const SITE_ID = '000001';

function computeHash(data: any): string {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('md5').update(str).digest('hex');
}

function upsertPage(page: any, locale: string) {
  const contentHash = computeHash({
    title: page.title,
    full_content: page.content_full || '',
    seo_title: page.seo_title || '',
    seo_description: page.seo_description || '',
    seo_keywords: page.seo_keywords || '',
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
    page.id, SITE_ID, locale, page.type, page.title, page.slug || null, page.url, page.cover_image || null,
    page.seo_title || null, page.seo_description || null, page.seo_keywords || null, page.canonical || null,
    page.noindex ? 1 : 0, page.nofollow ? 1 : 0, page.priority ?? 0.5, page.changefreq || 'weekly',
    page.content_summary || null,
    contentHash,
    null, null, null,
    page.translated_by_ai ? 1 : 0,
    page.updatedAt || new Date().toISOString()
  );

  db.prepare(`
    INSERT OR REPLACE INTO page_contents (page_id, site_id, locale, full_content, content_hash, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    page.id, SITE_ID, locale, page.content_full || null, contentHash, page.updatedAt || new Date().toISOString()
  );
}

// ==================== 通用 Markdown 扫描 ====================
async function scanMarkdown(type: string, dir: string, urlPrefix: string, locale: string) {
  const sourceDir = path.join(DATA_ROOT, dir, locale);
  const files = await fs.readdir(sourceDir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const fullPath = path.join(sourceDir, file);
    const stat = await fs.stat(fullPath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const { data, content } = matter(fileContent);
    const slug = data.slug || file.replace(/\.md$/, '');
    const title = data.title?.[locale] || data.title || slug;
    const url = `${urlPrefix}/${slug}`;
    upsertPage({
      id: `${type}:${slug}`,
      type,
      title,
      slug,
      url,
      cover_image: data.cover_image || null,
      seo_title: data.seo_title?.[locale] || data.seo_title || null,
      seo_description: data.seo_description?.[locale] || data.seo_description || null,
      seo_keywords: data.seo_keywords?.[locale] || data.seo_keywords || null,
      canonical: data.canonical_url || null,
      noindex: data.noindex || false,
      nofollow: data.nofollow || false,
      priority: data.priority ?? 0.5,
      changefreq: data.changefreq || 'weekly',
      content_summary: content.slice(0, 5000),
      content_full: content,
      updatedAt: data.updatedAt || stat.mtime.toISOString(),
      translated_by_ai: false,
    }, locale);
  }
}

// ==================== 产品线落地页 ====================
async function scanProductLines(locale: string) {
  const jsonPath = path.join(DATA_ROOT, 'products', locale, 'categories.json');
  const content = await fs.readFile(jsonPath, 'utf-8').catch(() => '{}');
  const data = JSON.parse(content);
  const productLines = data.productLines || [];
  for (const line of productLines) {
    const id = line.id;
    if (!id) continue;
    const slug = line.slug || id;
    upsertPage({
      id: `productLine:${id}`,
      type: 'productLine',
      title: line.name,
      slug,
      url: `/products/${slug}`,
      cover_image: null,
      seo_title: line.seoTitle || null,
      seo_description: line.seoDescription || null,
      seo_keywords: line.seoKeywords || null,
      content_summary: '',
      content_full: '',
      updatedAt: new Date().toISOString(),
    }, locale);
  }
}

// ==================== 产品详情页（含变体） ====================
async function scanProducts(locale: string) {
  const productsDir = path.join(DATA_ROOT, 'products', locale, 'products');
  const files = await fs.readdir(productsDir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const fullPath = path.join(productsDir, file);
    const stat = await fs.stat(fullPath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const { data, content } = matter(fileContent);
    const variants = data.variants || [];

    // 使用产品唯一 ID（frontmatter 中的 id 字段）
    const productId = data.id;
    if (!productId) {
      console.warn(`产品文件 ${file} 缺少 id 字段，将使用文件名作为 ID（不推荐）`);
    }
    const mainId = productId ? `product:${productId}` : `product:${file.replace(/\.md$/, '')}`;
    const mainSlug = data.slug || file.replace(/\.md$/, '');
    const mainTitle = data.product_name || data.title || mainSlug;
    const mainUrl = `/product/${mainSlug}`;
    const fullContent = data.description || content || '';
    const shortDesc = data.short_description || '';

    // 主产品
    upsertPage({
      id: mainId,
      type: 'product',
      title: mainTitle,
      slug: mainSlug,
      url: mainUrl,
      cover_image: data.main_image_url || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      seo_keywords: data.seo_keywords || null,
      content_summary: shortDesc.slice(0, 5000) || fullContent.slice(0, 5000),
      content_full: fullContent,
      updatedAt: data.updatedAt || stat.mtime.toISOString(),
    }, locale);

    // 变体（变体也有自己的 id）
    for (const variant of variants) {
      const varId = variant.id;
      if (!varId) {
        console.warn(`产品 ${productId} 的变体缺少 id，将使用组合 ID`);
      }
      const varSlug = variant.slug || `${mainSlug}-${varId || variant.id}`;
      const varTitle = variant.product_name || `${mainTitle} (${variant.sku || '变体'})`;
      const varUrl = `/product/${varSlug}`;
      const varShortDesc = variant.short_description || shortDesc;
      upsertPage({
        id: `product:${varId || `${productId}-${varSlug}`}`,
        type: 'product',
        title: varTitle,
        slug: varSlug,
        url: varUrl,
        cover_image: variant.main_image_url || data.main_image_url || null,
        seo_title: variant.seo_title || data.seo_title || null,
        seo_description: variant.seo_description || data.seo_description || null,
        seo_keywords: variant.seo_keywords || data.seo_keywords || null,
        content_summary: varShortDesc.slice(0, 5000) || fullContent.slice(0, 5000),
        content_full: fullContent,
        updatedAt: data.updatedAt || stat.mtime.toISOString(),
      }, locale);
    }
  }
}

// ==================== 产品合集（一级+二级） ====================
async function scanProductCategories(locale: string) {
  const jsonPath = path.join(DATA_ROOT, 'products', locale, 'categories.json');
  const content = await fs.readFile(jsonPath, 'utf-8').catch(() => '{}');
  const data = JSON.parse(content);
  const categories = data.categories || [];
  for (const cat of categories) {
    const catId = cat.id;
    if (!catId) continue;
    upsertPage({
      id: `productCollection:${catId}`,
      type: 'productCollection',
      title: cat.name,
      slug: cat.slug,
      url: `/collections/${cat.slug}`,
      cover_image: cat.image || null,
      seo_title: cat.seoTitle || cat.name,
      seo_description: cat.seoDescription || '',
      seo_keywords: cat.seoKeywords || '',
      content_summary: cat.description || '',
      content_full: '',
      updatedAt: new Date().toISOString(),
    }, locale);
    const series = cat.series || [];
    for (const sub of series) {
      const subId = sub.id;
      if (!subId) continue;
      upsertPage({
        id: `productCollection:${catId}/${subId}`,
        type: 'productCollection',
        title: sub.name,
        slug: sub.slug,
        url: `/collections/${cat.slug}/${sub.slug}`,
        cover_image: sub.image || null,
        seo_title: sub.seo?.title || sub.name,
        seo_description: sub.seo?.description || '',
        seo_keywords: sub.seo?.keywords || '',
        content_summary: sub.description || '',
        content_full: '',
        updatedAt: new Date().toISOString(),
      }, locale);
    }
  }
}

// ==================== 博客文章（从 SQLite 表读取） ====================
async function scanBlogPosts(locale: string) {
  const rows = db.prepare(`
    SELECT id, title, slug, excerpt, featured_image, seo_title, seo_description, seo_keywords, updated_at
    FROM blog_posts
    WHERE locale = ? AND visibility = 'visible'
  `).all(locale) as any[];
  for (const row of rows) {
    upsertPage({
      id: `blogPost:${row.id}`,
      type: 'blogPost',
      title: row.title,
      slug: row.slug,
      url: `/blog/${row.slug}`,
      cover_image: row.featured_image || null,
      seo_title: row.seo_title || null,
      seo_description: row.seo_description || null,
      seo_keywords: row.seo_keywords || null,
      content_summary: row.excerpt || '',
      content_full: '',
      updatedAt: row.updated_at || new Date().toISOString(),
    }, locale);
  }
}

// ==================== 博客合集（博客分类） ====================
async function scanBlogCategories(locale: string) {
  const jsonPath = path.join(DATA_ROOT, 'blog', locale, 'categories.json');
  const content = await fs.readFile(jsonPath, 'utf-8').catch(() => '[]');
  const categories = JSON.parse(content);
  for (const cat of categories) {
    const id = cat.id;
    if (!id) continue;
    upsertPage({
      id: `blogCategory:${id}`,
      type: 'blogCategory',
      title: cat.title,
      slug: cat.slug,
      url: `/blogs/${cat.slug}`,
      cover_image: null,
      seo_title: cat.seo_title || null,
      seo_description: cat.seo_description || null,
      seo_keywords: cat.seo_keywords || null,
      content_summary: '',
      content_full: '',
      updatedAt: cat.updated_at || new Date().toISOString(),
    }, locale);
  }
}

// ==================== 文档库 ====================
async function scanDocLibraries(locale: string) {
  const jsonPath = path.join(DATA_ROOT, 'docs', locale, 'libs.json');
  const content = await fs.readFile(jsonPath, 'utf-8').catch(() => '[]');
  const libraries = JSON.parse(content);
  for (const lib of libraries) {
    const id = lib.id;
    if (!id) continue;
    const slug = lib.slug || id;
    upsertPage({
      id: `docLibrary:${id}`,
      type: 'docLibrary',
      title: lib.name,
      slug,
      url: `/docs/${slug}`,
      cover_image: null,
      seo_title: lib.seo_title || null,
      seo_description: lib.seo_description || null,
      seo_keywords: lib.seo_keywords || null,
      content_summary: lib.description || '',
      content_full: '',
      updatedAt: lib.createdAt || new Date().toISOString(),
    }, locale);
  }
}

// ==================== 文档 ====================
async function scanDocs(locale: string) {
  const libsDir = path.join(DATA_ROOT, 'docs', locale);
  const libFolders = await fs.readdir(libsDir).catch(() => []);
  for (const folder of libFolders) {
    const indexJsonPath = path.join(libsDir, folder, 'index.json');
    const indexContent = await fs.readFile(indexJsonPath, 'utf-8').catch(() => '');
    if (!indexContent) continue;
    const data = JSON.parse(indexContent);
    const docs = data.docs || [];
    for (const doc of docs) {
      const id = doc.id;
      if (!id) continue;
      const slug = doc.slug;
      if (!slug) continue;
      upsertPage({
        id: `doc:${id}`,
        type: 'doc',
        title: doc.title,
        slug,
        url: `/docs/${folder}/${slug}`,
        cover_image: null,
        seo_title: doc.seo_title || null,
        seo_description: doc.seo_description || null,
        seo_keywords: doc.seo_keywords || null,
        content_summary: '',
        content_full: '',
        updatedAt: doc.updatedAt || new Date().toISOString(),
      }, locale);
    }
  }
}

// ==================== 视频合集（视频分类） ====================
async function scanVideoCategories(locale: string) {
  const jsonPath = path.join(DATA_ROOT, 'videosys', locale, 'categories.json');
  const content = await fs.readFile(jsonPath, 'utf-8').catch(() => '{}');
  const categories = JSON.parse(content);
  for (const [id, cat] of Object.entries(categories) as any) {
    const slug = cat.slug;
    if (!slug) continue;
    upsertPage({
      id: `videoCategory:${id}`,
      type: 'videoCategory',
      title: cat.name,
      slug,
      url: `/video/${slug}`,
      cover_image: null,
      seo_title: cat.seo_title || null,
      seo_description: cat.seo_description || null,
      seo_keywords: cat.seo_keywords || null,
      content_summary: '',
      content_full: '',
      updatedAt: new Date().toISOString(),
    }, locale);
  }
}

// ==================== 视频 ====================
async function scanVideos(locale: string) {
  const videosDir = path.join(DATA_ROOT, 'videosys', locale);
  const files = await fs.readdir(videosDir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const fullPath = path.join(videosDir, file);
    const stat = await fs.stat(fullPath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const { data, content } = matter(fileContent);
    const id = data.id;
    if (!id) {
      console.warn(`视频文件 ${file} 缺少 id，将使用 slug 作为 ID`);
    }
    const slug = data.slug || file.replace(/\.md$/, '');
    const title = data.title || slug;
    const url = `/video/${data.category_key}/${slug}`;
    upsertPage({
      id: `video:${id || slug}`,
      type: 'video',
      title,
      slug,
      url,
      cover_image: data.thumbnail || null,
      seo_title: data.seo_title || null,
      seo_description: data.seo_description || null,
      seo_keywords: data.seo_keywords || null,
      content_summary: content.slice(0, 5000),
      content_full: content,
      updatedAt: data.updated_at || stat.mtime.toISOString(),
    }, locale);
  }
}

// ==================== 静态页面（新格式：data/pages/{locale}/pages.json + 对应的 .md 文件） ====================
async function scanStaticPages(locale: string) {
  const pagesJsonPath = path.join(DATA_ROOT, 'pages', locale, 'pages.json');
  let pagesData: Record<string, any> = {};
  try {
    const content = await fs.readFile(pagesJsonPath, 'utf-8');
    pagesData = JSON.parse(content);
  } catch (err) {
    console.log(`No pages.json found for locale ${locale}, skipping static pages.`);
    return;
  }

  for (const [id, page] of Object.entries(pagesData)) {
    const title = page.title;
    const slug = page.slug;
    if (!slug) continue;
    const url = `/${slug}`;
    const isPolicy = page.type === 'policy';

    let contentFull = '';
    let contentSummary = '';
    const mdFilePath = path.join(DATA_ROOT, 'pages', locale, `${id}.md`);
    try {
      const mdContent = await fs.readFile(mdFilePath, 'utf-8');
      const { content } = matter(mdContent);
      contentFull = content;
      contentSummary = content.slice(0, 5000);
    } catch (err) {
      // 没有对应的 md 文件则留空
    }

    upsertPage({
      id: `page:${id}`,
      type: isPolicy ? 'policy' : 'page',
      title,
      slug,
      url,
      cover_image: page.image || null,
      seo_title: page.seo_title || null,
      seo_description: page.seo_description || null,
      seo_keywords: page.seo_keywords || null,
      canonical: page.canonical_url || null,
      noindex: page.noindex || false,
      nofollow: page.nofollow || false,
      content_summary: contentSummary,
      content_full: contentFull,
      updatedAt: page.updatedAt || new Date().toISOString(),
    }, locale);
  }
}

// ==================== 固定页面（主页、询盘、博客落地页） ====================
async function addFixedPages(locale: string) {
  const fixed = [
    { id: 'home', type: 'home', title: locale === 'zh' ? '首页' : 'Home', slug: '', url: '/' },
    { id: 'inquiry', type: 'inquiry', title: locale === 'zh' ? '询盘' : 'Inquiry', slug: 'inquiry', url: '/inquiry' },
    { id: 'blog', type: 'blog', title: locale === 'zh' ? '博客' : 'Blog', slug: 'blog', url: '/blog' },
  ];
  for (const page of fixed) {
    upsertPage({ ...page, content_summary: '', content_full: '', updatedAt: new Date().toISOString() }, locale);
  }
}

// ==================== 站点配置（页头、页脚） ====================
async function scanSiteConfigs(locale: string) {
  const configs = [
    { id: 'header', file: 'header.json' },
    { id: 'footer', file: 'footer.json' },
  ];
  for (const cfg of configs) {
    const filePath = path.join(DATA_ROOT, cfg.file);
    const content = await fs.readFile(filePath, 'utf-8').catch(() => '{}');
    const config = JSON.parse(content);
    const hash = computeHash(config);
    db.prepare(`
      INSERT OR REPLACE INTO site_configs (
        id, site_id, locale, config, content_hash,
        last_synced_at, synced_locales, source_hash, translated_by_ai, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      cfg.id, SITE_ID, locale, JSON.stringify(config), hash,
      null, null, null, 0,
      new Date().toISOString()
    );
  }
}

// ==================== 主函数 ====================
async function main() {
  const locales = ['zh', 'en'];
  for (const locale of locales) {
    console.log(`🔄 正在迁移: ${locale}`);
    await scanProductLines(locale);
    await scanProducts(locale);
    await scanProductCategories(locale);
    await scanBlogPosts(locale);
    await scanBlogCategories(locale);
    await scanDocLibraries(locale);
    await scanDocs(locale);
    await scanVideoCategories(locale);
    await scanVideos(locale);
    await scanStaticPages(locale);
    await addFixedPages(locale);
    await scanSiteConfigs(locale);
    console.log(`✅ ${locale} 迁移完成`);
  }
}

main().catch(console.error);