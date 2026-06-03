import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'jeekua.sqlite');

let db: Database.Database | null = null;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  const db = getDb();

  // ========== 产品表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      productId TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      productLineId TEXT,
      categoryId TEXT NOT NULL,
      seriesId TEXT,
      parent_product_id TEXT,
      sku TEXT NOT NULL,
      product_name TEXT NOT NULL,
      brand TEXT,
      price_tiers TEXT,
      currency TEXT DEFAULT 'USD',
      availability TEXT DEFAULT 'in_stock',
      min_order_quantity INTEGER DEFAULT 1,
      main_image_url TEXT,
      attributes TEXT,
      slug TEXT,
      status TEXT DEFAULT 'published',
      updatedAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_products_locale ON products(locale);
    CREATE INDEX IF NOT EXISTS idx_products_productLine ON products(productLineId);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoryId);
    CREATE INDEX IF NOT EXISTS idx_products_parent ON products(parent_product_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_products_updated ON products(updatedAt);
  `);

  // ========== 产品与资源关联表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS resource_product (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resource_type TEXT NOT NULL CHECK (resource_type IN ('blog', 'document', 'video')),
      resource_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(resource_type, resource_id, product_id)
    );
    CREATE INDEX IF NOT EXISTS idx_resource_product_lookup ON resource_product(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_product_resources ON resource_product(product_id);
  `);

  // ========== 博客文章表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      excerpt TEXT,
      visibility TEXT DEFAULT 'visible',
      featured_image TEXT,
      author TEXT,
      category_id TEXT,
      tags TEXT,
      template TEXT DEFAULT 'default',
      seo_keywords TEXT,
      seo_title TEXT,
      seo_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_blog_posts_locale ON blog_posts(locale);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_locale_slug ON blog_posts(locale, slug);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_locale_title ON blog_posts(locale, title);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category_id);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_visibility ON blog_posts(visibility);
    CREATE INDEX IF NOT EXISTS idx_blog_posts_updated ON blog_posts(updated_at);
  `);

  // ========== 视频表（已包含 tags 列） ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS videos (
      id TEXT PRIMARY KEY,
      locale TEXT NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL,
      category_key TEXT NOT NULL,
      source_type TEXT NOT NULL,
      video_url TEXT,
      video_id TEXT NOT NULL,
      thumbnail TEXT,
      duration INTEGER,
      visible INTEGER DEFAULT 1,
      flagged INTEGER DEFAULT 0,
      template TEXT,
      seo_keywords TEXT,
      seo_title TEXT,
      seo_description TEXT,
      order_index INTEGER DEFAULT 0,
      published_at DATETIME,
      updated_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      tags TEXT                     -- JSON 数组存储标签
    );
    CREATE INDEX IF NOT EXISTS idx_videos_locale ON videos(locale);
    CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category_key);
    CREATE INDEX IF NOT EXISTS idx_videos_title ON videos(title);
    CREATE INDEX IF NOT EXISTS idx_videos_visible ON videos(visible);
  `);

  // ========== CRM 客户表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      company_name TEXT DEFAULT '',
      address TEXT DEFAULT '',
      stage TEXT,
      importance INTEGER,
      scale TEXT,
      notes TEXT DEFAULT '',
      website TEXT DEFAULT '',
      flag TEXT DEFAULT '',
      email_subscribed TEXT DEFAULT '未订阅',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company_name);
    CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
    CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at);
  `);

  // ========== 询盘表 ==========
  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT DEFAULT '',
      company TEXT DEFAULT '',
      message TEXT NOT NULL,
      product_id TEXT,
      created_at TEXT NOT NULL,
      status TEXT DEFAULT '未处理'
    );
    CREATE INDEX IF NOT EXISTS idx_inquiries_email ON inquiries(email);
    CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
    CREATE INDEX IF NOT EXISTS idx_inquiries_created ON inquiries(created_at);
  `);

 // ========== 组件文本表 ==========
   db.exec(`
   CREATE TABLE IF NOT EXISTS component_texts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  site_id TEXT NOT NULL DEFAULT '100001',
  template_id TEXT NOT NULL,
  text_id TEXT NOT NULL,
  locale TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(site_id, template_id, text_id, locale)  
  );

CREATE INDEX IF NOT EXISTS idx_component_texts_lookup 
ON component_texts (site_id, template_id, text_id, locale);
`);

  
  // // ========== 统一的页面索引表 ==========
  // db.exec(`
  //   CREATE TABLE IF NOT EXISTS pages (
  //     id TEXT PRIMARY KEY,
  //     locale TEXT NOT NULL,
  //     type TEXT NOT NULL,
  //     title TEXT NOT NULL,
  //     slug TEXT,
  //     url TEXT NOT NULL,
  //     content TEXT,
  //     cover_image TEXT,
  //     metaTitle TEXT,
  //     metaDescription TEXT,
  //     metaKeywords TEXT,
  //     canonical TEXT,
  //     noindex INTEGER DEFAULT 0,
  //     nofollow INTEGER DEFAULT 0,
  //     priority REAL DEFAULT 0.5,
  //     changefreq TEXT DEFAULT 'weekly',
  //     updatedAt TEXT NOT NULL,
  //     createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  //   );
  //   CREATE INDEX IF NOT EXISTS idx_pages_locale ON pages(locale);
  //   CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
  //   CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
  //   CREATE INDEX IF NOT EXISTS idx_pages_title ON pages(title);
  // `);


// ========== Discovery 模块表 ==========

// pages 表（页面元数据）
db.exec(`
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT NOT NULL,
    site_id TEXT NOT NULL DEFAULT '000001',
    locale TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    slug TEXT,
    url TEXT NOT NULL,
    cover_image TEXT,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,
    canonical TEXT,
    noindex INTEGER DEFAULT 0,
    nofollow INTEGER DEFAULT 0,
    priority REAL DEFAULT 0.5,
    changefreq TEXT DEFAULT 'weekly',
    content_summary TEXT,
    content_hash TEXT,
    last_synced_at TEXT,
    synced_locales TEXT,
    source_hash TEXT,
    translated_by_ai INTEGER DEFAULT 0,
    updatedAt TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, site_id, locale)
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_pages_site_locale ON pages(site_id, locale);
  CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type);
  CREATE INDEX IF NOT EXISTS idx_pages_url ON pages(url);
`);

// page_contents 表（完整内容，用于搜索和翻译）
db.exec(`
  CREATE TABLE IF NOT EXISTS page_contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id TEXT NOT NULL,
    site_id TEXT NOT NULL DEFAULT '000001',
    locale TEXT NOT NULL,
    full_content TEXT,
    content_hash TEXT,
    updatedAt TEXT NOT NULL,
    UNIQUE(page_id, site_id, locale)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_contents_page ON page_contents(page_id, site_id, locale);`);

// site_configs 表（站点配置：页头、页脚、菜单等）
db.exec(`
  CREATE TABLE IF NOT EXISTS site_configs (
    id TEXT NOT NULL,                    -- 如 'header', 'footer', 'menus'
    site_id TEXT NOT NULL DEFAULT '000001',
    locale TEXT NOT NULL,
    config JSON NOT NULL,                -- 存储完整的配置 JSON
    content_hash TEXT,                   -- 用于版本追踪
    last_synced_at TEXT,
    synced_locales TEXT,
    source_hash TEXT,
    translated_by_ai INTEGER DEFAULT 0,
    updatedAt TEXT NOT NULL,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, site_id, locale)
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_configs_site_locale ON site_configs(site_id, locale);`);

// sync_logs 表（同步日志）
db.exec(`
  CREATE TABLE IF NOT EXISTS sync_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id TEXT NOT NULL DEFAULT '000001',
    syncType TEXT NOT NULL,              -- 'page', 'config'
    source_locale TEXT,
    target_locale TEXT,
    item_id TEXT NOT NULL,               -- 页面的 id 或配置的 id (如 'header')
    status TEXT,                         -- 'success', 'failed', 'skipped'
    errorMsg TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_sync_logs_site ON sync_logs(site_id);`);



// 自动迁移：为 videos 表添加 tags 列（如果不存在）
  try {
    db.exec(`ALTER TABLE videos ADD COLUMN tags TEXT;`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  // 自动迁移：为 products 表添加 templateId 列（如果不存在）
  try {
    db.exec(`ALTER TABLE products ADD COLUMN templateId TEXT DEFAULT ''`);
  } catch (e) {
    // 列已存在，忽略错误
  }

  console.log('✅ 数据库表初始化完成');
}

export default getDb;