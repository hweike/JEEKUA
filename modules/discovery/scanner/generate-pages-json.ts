// modules/discovery/scanner/generate-pages-json.ts
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import matter from 'gray-matter';
import { contentTypes, categorySources } from './config.js';
import { PageInfo, ContentTypeConfig } from '../types.js';

const DATA_ROOT = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_ROOT, 'jeekua.sqlite');

// ---------- 数据库操作 ----------
function getDb() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

function createTablesIfNotExist() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT,
      url TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      metaTitle TEXT,
      metaDescription TEXT,
      metaKeywords TEXT,
      canonical TEXT,
      noindex INTEGER DEFAULT 0,
      nofollow INTEGER DEFAULT 0,
      updatedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pages_locale ON pages(locale);
    CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
    CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
  `);
  db.close();
}

function clearLocale(locale: string) {
  const db = getDb();
  db.prepare('DELETE FROM pages WHERE locale = ?').run(locale);
  db.close();
}

function upsertPage(page: PageInfo, locale: string) {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO pages (
      id, title, slug, url, type, content,
      metaTitle, metaDescription, metaKeywords, canonical,
      noindex, nofollow, updatedAt, locale
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    page.id,
    page.title,
    page.slug,
    page.url,
    page.type,
    page.content,
    page.seo.metaTitle,
    page.seo.metaDescription,
    page.seo.metaKeywords,
    page.seo.canonical,
    page.seo.noindex ? 1 : 0,
    page.seo.nofollow ? 1 : 0,
    page.updatedAt,
    locale
  );
  db.close();
}

// ---------- 扫描函数 ----------
async function scanContentType(config: ContentTypeConfig, locale: string): Promise<PageInfo[]> {
  const sourceDir = path.join(DATA_ROOT, config.sourceDir, locale);
  if (!fs.existsSync(sourceDir)) return [];

  const files = fs.readdirSync(sourceDir);
  const pages: PageInfo[] = [];

  for (const file of files) {
    if (!config.filePattern.test(file)) continue;
    const fullPath = path.join(sourceDir, file);
    const stat = fs.statSync(fullPath);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    const { data, content } = matter(fileContent);
    const slug = config.getSlug(file, data);
    const title = config.getTitle(data, locale);
    const url = `${config.urlPrefix}/${slug}`;
    const contentSummary = config.getContent ? config.getContent(content) : content.slice(0, 500);
    const seo = {
      metaTitle: data.seo_title || title,
      metaDescription: data.seo_description || '',
      metaKeywords: data.seo_keywords || '',
      canonical: data.canonical_url || null,
      noindex: data.noindex || false,
      nofollow: data.nofollow || false,
    };

    pages.push({
      id: `${config.type}:${slug}`,
      title,
      slug,
      url,
      type: config.type,
      content: contentSummary,
      seo,
      updatedAt: data.updatedAt || stat.mtime.toISOString(),
    });
  }
  return pages;
}

async function scanStaticPages(locale: string): Promise<PageInfo[]> {
  const pagesJsonPath = path.join(DATA_ROOT, 'pages.json');
  if (!fs.existsSync(pagesJsonPath)) return [];
  const pagesJson = JSON.parse(fs.readFileSync(pagesJsonPath, 'utf-8'));
  const pages: PageInfo[] = [];
  for (const page of pagesJson) {
    const title = page.title?.[locale] || page.title;
    const url = `/${page.slug}`;
    const content = page.content?.[locale] || '';
    pages.push({
      id: `page:${page.slug}`,
      title,
      slug: page.slug,
      url,
      type: 'page',
      content: content.slice(0, 500),
      seo: {
        metaTitle: page.seo_title?.[locale] || title,
        metaDescription: page.seo_description?.[locale] || '',
        metaKeywords: page.seo_keywords?.[locale] || '',
        canonical: page.canonical_url || null,
        noindex: page.noindex || false,
        nofollow: page.nofollow || false,
      },
      updatedAt: page.updatedAt || new Date().toISOString(),
    });
  }
  return pages;
}

async function scanCategories(locale: string): Promise<PageInfo[]> {
  const categories: PageInfo[] = [];
  for (const source of categorySources) {
    const filePath = path.join(process.cwd(), source.filePath);
    if (!fs.existsSync(filePath)) continue;
    const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const items = source.getItems(json, locale);
    categories.push(...items);
  }
  return categories;
}

async function addFixedPages(locale: string): Promise<PageInfo[]> {
  return [
    {
      id: 'home',
      title: locale === 'zh' ? '首页' : 'Home',
      slug: '',
      url: '/',
      type: 'home',
      content: '',
      seo: {
        metaTitle: locale === 'zh' ? '首页' : 'Home',
        metaDescription: '',
        metaKeywords: '',
        canonical: null,
        noindex: false,
        nofollow: false,
      },
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'inquiry',
      title: locale === 'zh' ? '询盘' : 'Inquiry',
      slug: 'inquiry',
      url: '/inquiry',
      type: 'inquiry',
      content: '',
      seo: {
        metaTitle: locale === 'zh' ? '询盘' : 'Inquiry',
        metaDescription: '',
        metaKeywords: '',
        canonical: null,
        noindex: false,
        nofollow: false,
      },
      updatedAt: new Date().toISOString(),
    },
  ];
}

export async function generateForLocale(locale: string) {
  let allPages: PageInfo[] = [];

  for (const config of contentTypes) {
    const pages = await scanContentType(config, locale);
    allPages.push(...pages);
  }

  const staticPages = await scanStaticPages(locale);
  allPages.push(...staticPages);

  const categories = await scanCategories(locale);
  allPages.push(...categories);

  const fixed = await addFixedPages(locale);
  allPages.push(...fixed);

  clearLocale(locale);
  for (const page of allPages) {
    upsertPage(page, locale);
  }
  console.log(`✅ Indexed ${allPages.length} pages for locale ${locale}`);
}

// 确保表存在（仅在第一次运行时创建）
createTablesIfNotExist();

// 执行入口
if (require.main === module) {
  const locales = ['zh', 'en'];
  Promise.all(locales.map(generateForLocale)).catch(console.error);
}