-- ============================================================
-- PostgreSQL 多租户建库脚本（从单站点 SQLite 升级）
-- 支持：租户 → 站点（一对多） → 域名（一对多）
-- 说明：所有表名/列名保留原始大小写，使用时需双引号包裹
-- ============================================================

-- 启用外键约束（PostgreSQL 默认开启）
-- SET CONSTRAINTS ALL DEFERRED;

-- ============================================================
-- 第一部分：多租户核心表
-- ============================================================

-- 1. 租户表（客户/公司）
CREATE TABLE IF NOT EXISTS "tenants" (
    "tenant_id"       TEXT PRIMARY KEY,
    "name"            TEXT NOT NULL,
    "billing_email"   TEXT,
    "status"          TEXT NOT NULL DEFAULT 'active',
    "subscription_plan" TEXT,
    "trial_ends_at"   TIMESTAMP,
    "created_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP
);

-- 2. 站点表（属于某个租户，管理服务期和多域名）
CREATE TABLE IF NOT EXISTS "sites" (
    "site_id"         TEXT PRIMARY KEY,
    "tenant_id"       TEXT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "name"            TEXT NOT NULL,
    "status"          TEXT NOT NULL DEFAULT 'active',
    "plan_name"       TEXT,
    "start_date"      DATE,
    "end_date"        DATE,
    "auto_renew"      BOOLEAN DEFAULT FALSE,
    "default_locale"  TEXT DEFAULT 'en',
    "created_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP,
    CONSTRAINT "chk_site_dates" CHECK ("end_date" IS NULL OR "end_date" > "start_date")
);

CREATE INDEX IF NOT EXISTS "idx_sites_tenant" ON "sites" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_sites_status" ON "sites" ("status");
CREATE INDEX IF NOT EXISTS "idx_sites_end_date" ON "sites" ("end_date") WHERE "status" = 'active';

-- 3. 站点域名表（一个站点支持多个域名）
CREATE TABLE IF NOT EXISTS "site_domains" (
    "domain_id"       SERIAL PRIMARY KEY,
    "site_id"         TEXT NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
    "domain"          TEXT NOT NULL UNIQUE,
    "is_primary"      BOOLEAN NOT NULL DEFAULT FALSE,
    "verified_at"     TIMESTAMP,
    "created_at"      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_site_domains_site" ON "site_domains" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_site_domains_domain" ON "site_domains" ("domain");

-- ============================================================
-- 第二部分：业务表（多租户改造）
-- 说明：所有业务表均包含 "site_id" 列，并建立外键指向 sites 表
--       主键/唯一约束均包含 "site_id"，确保站点内数据独立
--       索引以 "site_id" 为第一列，提升多租户过滤性能
-- ============================================================

-- ========== 产品表 ==========
DROP TABLE IF EXISTS "products" CASCADE;  -- 若已存在旧表，需先迁移数据
CREATE TABLE IF NOT EXISTS "products" (
    "site_id"         TEXT NOT NULL,
    "productId"       TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "productLineId"   TEXT,
    "categoryId"      TEXT NOT NULL,
    "seriesId"        TEXT,
    "parent_product_id" TEXT,
    "sku"             TEXT NOT NULL,
    "product_name"    TEXT NOT NULL,
    "brand"           TEXT,
    "price_tiers"     TEXT,
    "currency"        TEXT DEFAULT 'USD',
    "availability"    TEXT DEFAULT 'in_stock',
    "min_order_quantity" INTEGER DEFAULT 1,
    "main_image_url"  TEXT,
    "attributes"      TEXT,
    "slug"            TEXT,
    "status"          TEXT DEFAULT 'published',
    "templateId"      TEXT DEFAULT '',
    "updatedAt"       TEXT NOT NULL,
    "createdAt"       TEXT NOT NULL,
    PRIMARY KEY ("site_id", "productId"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_products_site_locale" ON "products" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_products_site_productLine" ON "products" ("site_id", "productLineId");
CREATE INDEX IF NOT EXISTS "idx_products_site_category" ON "products" ("site_id", "categoryId");
CREATE INDEX IF NOT EXISTS "idx_products_site_parent" ON "products" ("site_id", "parent_product_id");
CREATE INDEX IF NOT EXISTS "idx_products_site_status" ON "products" ("site_id", "status");
CREATE INDEX IF NOT EXISTS "idx_products_site_updated" ON "products" ("site_id", "updatedAt");

-- ========== 产品与资源关联表 ==========
DROP TABLE IF EXISTS "resource_product" CASCADE;
CREATE TABLE IF NOT EXISTS "resource_product" (
    "id"            SERIAL PRIMARY KEY,
    "site_id"       TEXT NOT NULL,
    "resource_type" TEXT NOT NULL CHECK ("resource_type" IN ('blog', 'document', 'video')),
    "resource_id"   TEXT NOT NULL,
    "product_id"    TEXT NOT NULL,
    "sort_order"    INTEGER DEFAULT 0,
    "created_at"    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("site_id", "resource_type", "resource_id", "product_id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_resource_product_site_lookup" ON "resource_product" ("site_id", "resource_type", "resource_id");
CREATE INDEX IF NOT EXISTS "idx_product_resources_site" ON "resource_product" ("site_id", "product_id");

-- ========== 博客文章表 ==========
DROP TABLE IF EXISTS "blog_posts" CASCADE;
CREATE TABLE IF NOT EXISTS "blog_posts" (
    "site_id"         TEXT NOT NULL,
    "id"              TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "excerpt"         TEXT,
    "visibility"      TEXT DEFAULT 'visible',
    "featured_image"  TEXT,
    "author"          TEXT,
    "category_id"     TEXT,
    "tags"            TEXT,
    "template"        TEXT DEFAULT 'default',
    "seo_keywords"    TEXT,
    "seo_title"       TEXT,
    "seo_description" TEXT,
    "created_at"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("site_id", "id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale" ON "blog_posts" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale_slug" ON "blog_posts" ("site_id", "locale", "slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale_title" ON "blog_posts" ("site_id", "locale", "title");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_category" ON "blog_posts" ("site_id", "category_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_visibility" ON "blog_posts" ("site_id", "visibility");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_updated" ON "blog_posts" ("site_id", "updated_at");

-- ========== 视频表 ==========
DROP TABLE IF EXISTS "videos" CASCADE;
CREATE TABLE IF NOT EXISTS "videos" (
    "site_id"         TEXT NOT NULL,
    "id"              TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "category_key"    TEXT NOT NULL,
    "source_type"     TEXT NOT NULL,
    "video_url"       TEXT,
    "video_id"        TEXT NOT NULL,
    "thumbnail"       TEXT,
    "duration"        INTEGER,
    "visible"         INTEGER DEFAULT 1,
    "flagged"         INTEGER DEFAULT 0,
    "template"        TEXT,
    "seo_keywords"    TEXT,
    "seo_title"       TEXT,
    "seo_description" TEXT,
    "order_index"     INTEGER DEFAULT 0,
    "published_at"    TIMESTAMP,
    "updated_at"      TIMESTAMP,
    "created_at"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "tags"            TEXT,
    PRIMARY KEY ("site_id", "id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_videos_site_locale" ON "videos" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_videos_site_category" ON "videos" ("site_id", "category_key");
CREATE INDEX IF NOT EXISTS "idx_videos_site_title" ON "videos" ("site_id", "title");
CREATE INDEX IF NOT EXISTS "idx_videos_site_visible" ON "videos" ("site_id", "visible");

-- ========== CRM 客户表 ==========
DROP TABLE IF EXISTS "customers" CASCADE;
CREATE TABLE IF NOT EXISTS "customers" (
    "site_id"          TEXT NOT NULL,
    "id"               TEXT NOT NULL,
    "name"             TEXT NOT NULL DEFAULT '',
    "country"          TEXT NOT NULL DEFAULT '',
    "email"            TEXT NOT NULL DEFAULT '',
    "phone"            TEXT DEFAULT '',
    "whatsapp"         TEXT DEFAULT '',
    "company_name"     TEXT DEFAULT '',
    "address"          TEXT DEFAULT '',
    "stage"            TEXT,
    "importance"       INTEGER,
    "scale"            TEXT,
    "notes"            TEXT DEFAULT '',
    "website"          TEXT DEFAULT '',
    "flag"             TEXT DEFAULT '',
    "email_subscribed" TEXT DEFAULT '未订阅',
    "created_at"       TEXT NOT NULL,
    PRIMARY KEY ("site_id", "id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_customers_site_email" ON "customers" ("site_id", "email");
CREATE INDEX IF NOT EXISTS "idx_customers_site_company" ON "customers" ("site_id", "company_name");
CREATE INDEX IF NOT EXISTS "idx_customers_site_stage" ON "customers" ("site_id", "stage");
CREATE INDEX IF NOT EXISTS "idx_customers_site_created" ON "customers" ("site_id", "created_at");

-- ========== 询盘表 ==========
DROP TABLE IF EXISTS "inquiries" CASCADE;
CREATE TABLE IF NOT EXISTS "inquiries" (
    "id"          SERIAL PRIMARY KEY,
    "site_id"     TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "email"       TEXT NOT NULL,
    "phone"       TEXT DEFAULT '',
    "company"     TEXT DEFAULT '',
    "message"     TEXT NOT NULL,
    "product_id"  TEXT,
    "created_at"  TEXT NOT NULL,
    "status"      TEXT DEFAULT '未处理',
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- 注：inquiries 保留自增 id 作为全局唯一键，但查询时仍需按 site_id 过滤
CREATE INDEX IF NOT EXISTS "idx_inquiries_site_email" ON "inquiries" ("site_id", "email");
CREATE INDEX IF NOT EXISTS "idx_inquiries_site_status" ON "inquiries" ("site_id", "status");
CREATE INDEX IF NOT EXISTS "idx_inquiries_site_created" ON "inquiries" ("site_id", "created_at");

-- ========== 组件文本表 ==========
-- 原表已有 site_id，且唯一约束已包含 site_id，直接添加外键并调整索引即可
DROP TABLE IF EXISTS "component_texts" CASCADE;
CREATE TABLE IF NOT EXISTS "component_texts" (
    "id"          SERIAL PRIMARY KEY,
    "site_id"     TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "text_id"     TEXT NOT NULL,
    "locale"      TEXT NOT NULL,
    "text"        TEXT NOT NULL,
    "created_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("site_id", "template_id", "text_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_component_texts_site_lookup" 
    ON "component_texts" ("site_id", "template_id", "text_id", "locale");

-- ========== pages 表 ==========
DROP TABLE IF EXISTS "pages" CASCADE;
CREATE TABLE IF NOT EXISTS "pages" (
    "id"               TEXT NOT NULL,
    "site_id"          TEXT NOT NULL,
    "locale"           TEXT NOT NULL,
    "type"             TEXT NOT NULL,
    "title"            TEXT NOT NULL,
    "slug"             TEXT,
    "url"              TEXT NOT NULL,
    "cover_image"      TEXT,
    "seo_title"        TEXT,
    "seo_description"  TEXT,
    "seo_keywords"     TEXT,
    "canonical"        TEXT,
    "noindex"          INTEGER DEFAULT 0,
    "nofollow"         INTEGER DEFAULT 0,
    "priority"         REAL DEFAULT 0.5,
    "changefreq"       TEXT DEFAULT 'weekly',
    "content_summary"  TEXT,
    "content_hash"     TEXT,
    "last_synced_at"   TEXT,
    "synced_locales"   TEXT,
    "source_hash"      TEXT,
    "translated_by_ai" INTEGER DEFAULT 0,
    "updatedAt"        TEXT NOT NULL,
    "createdAt"        TEXT DEFAULT (CURRENT_TIMESTAMP)::TEXT,
    PRIMARY KEY ("id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_pages_site_locale" ON "pages" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_pages_type_site" ON "pages" ("type", "site_id");
CREATE INDEX IF NOT EXISTS "idx_pages_url_site" ON "pages" ("url", "site_id");

-- ========== page_contents 表 ==========
DROP TABLE IF EXISTS "page_contents" CASCADE;
CREATE TABLE IF NOT EXISTS "page_contents" (
    "id"            SERIAL PRIMARY KEY,
    "page_id"       TEXT NOT NULL,
    "site_id"       TEXT NOT NULL,
    "locale"        TEXT NOT NULL,
    "full_content"  TEXT,
    "content_hash"  TEXT,
    "updatedAt"     TEXT NOT NULL,
    UNIQUE ("page_id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_contents_page_site" ON "page_contents" ("page_id", "site_id", "locale");

-- ========== site_configs 表 ==========
DROP TABLE IF EXISTS "site_configs" CASCADE;
CREATE TABLE IF NOT EXISTS "site_configs" (
    "id"               TEXT NOT NULL,
    "site_id"          TEXT NOT NULL,
    "locale"           TEXT NOT NULL,
    "config"           JSON NOT NULL,
    "content_hash"     TEXT,
    "last_synced_at"   TEXT,
    "synced_locales"   TEXT,
    "source_hash"      TEXT,
    "translated_by_ai" INTEGER DEFAULT 0,
    "updatedAt"        TEXT NOT NULL,
    "createdAt"        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);


-- ========== 管理员表 ==========
CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  "englishName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  role TEXT NOT NULL CHECK (role IN ('super', 'admin')),
  api_token VARCHAR(100) UNIQUE,
  api_token_expires_at TIMESTAMPTZ,
  site_id TEXT NOT NULL DEFAULT '000001'   -- 新增：站点隔离字段
);

-- 创建索引（单列）
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_token ON admin_users(api_token);
CREATE INDEX IF NOT EXISTS idx_admin_users_site_id ON admin_users(site_id);  -- 新增：站点索引

-- 可选：联合索引，优化按站点 + 邮箱的查询（如果未来将唯一约束改为 (site_id, email) 则更有用）
CREATE INDEX IF NOT EXISTS idx_admin_users_site_email ON admin_users(site_id, email);

-- 插入默认超级管理员（仅当表为空时，且 site_id 默认为 '000001'）
INSERT INTO admin_users (id, email, name, "englishName", "passwordHash", "mustChangePassword", role, site_id)
SELECT 
  '1', 
  'admin@admin.com', 
  '超级管理员', 
  'Admin', 
  '$2b$10$yDBubqffAuScFmQGQbw13uhqR4xrQ1j4scKcrihvzgfvv5AyLtm.S', 
  false, 
  'super',
  '000001'   -- 默认站点
WHERE NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1);

-- 为 site_configs 表创建索引（保持原有）
CREATE INDEX IF NOT EXISTS "idx_configs_site_locale" ON "site_configs" ("site_id", "locale");


-- ========== sync_logs 表 ==========
DROP TABLE IF EXISTS "sync_logs" CASCADE;
CREATE TABLE IF NOT EXISTS "sync_logs" (
    "id"             SERIAL PRIMARY KEY,
    "site_id"        TEXT NOT NULL,
    "syncType"       TEXT NOT NULL,
    "source_locale"  TEXT,
    "target_locale"  TEXT,
    "item_id"        TEXT NOT NULL,
    "status"         TEXT,
    "errorMsg"       TEXT,
    "created_at"     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_sync_logs_site" ON "sync_logs" ("site_id");


-- 创建 admin_logs 表（不含内联索引）
CREATE TABLE IF NOT EXISTS admin_logs (
  id BIGSERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type TEXT NOT NULL CHECK (type IN ('login', 'admin', 'menu')),
  
  -- 通用字段
  email TEXT,
  ip TEXT,
  user_agent TEXT,
  
  -- login 特有
  success BOOLEAN,
  message TEXT,
  
  -- admin 特有
  operator_email TEXT,
  action TEXT CHECK (action IN ('add', 'delete')),
  target_email TEXT,
  target_name TEXT,
  
  -- menu 特有
  path TEXT,
  menu_name TEXT
);

-- 创建索引（独立语句）
CREATE INDEX IF NOT EXISTS idx_admin_logs_timestamp ON admin_logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_logs_type ON admin_logs (type);
CREATE INDEX IF NOT EXISTS idx_admin_logs_email ON admin_logs (email);
CREATE INDEX IF NOT EXISTS idx_admin_logs_operator_email ON admin_logs (operator_email);



-- ========== collected_products 产品数据采集表 ==========
DROP TABLE IF EXISTS collected_products;
CREATE TABLE collected_products (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,                       -- 对应 tenants.tenant_id (TEXT)
    site_id TEXT NOT NULL,                         -- 对应 sites.site_id (TEXT)
    source_url TEXT NOT NULL,
    platform VARCHAR(50),
    status VARCHAR(20) DEFAULT 'unclaimed',
    title TEXT,
    main_image_url TEXT,
    price DECIMAL(12,2),
    currency VARCHAR(3) DEFAULT 'CNY',
    raw_data JSONB NOT NULL,
    documents JSONB,
    custom_fields JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_collected_products_tenant_site ON collected_products(tenant_id, site_id);
CREATE INDEX idx_collected_products_status ON collected_products(status);
CREATE INDEX idx_collected_products_platform ON collected_products(platform);


-- ========== user_platform_credentials 数据采集用户与平台凭据表 ==========
-- 创建通用平台凭据表
-- 创建新表，user_id 类型为 TEXT 以匹配 admin_users.id
CREATE TABLE IF NOT EXISTS user_platform_credentials (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    credential TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);

-- 创建索引（不创建外键约束）
CREATE INDEX IF NOT EXISTS idx_user_platform_credentials_user_platform ON user_platform_credentials(user_id, platform);


-- ============================================================
-- 附录：数据迁移说明（从单站点升级到多租户）
-- ============================================================
/*
1. 创建默认租户和站点（例如原系统 site_id = '000001' 或 '100001'）
   INSERT INTO "tenants" ("tenant_id", "name") VALUES ('tenant_default', 'Default Tenant');
   INSERT INTO "sites" ("site_id", "tenant_id", "name") VALUES ('000001', 'tenant_default', 'Default Site');
   -- 若存在 '100001'，同样插入
   INSERT INTO "site_domains" ("site_id", "domain", "is_primary") VALUES ('000001', 'your-old-domain.com', TRUE);

2. 为旧表添加 site_id 列（如果使用 DROP TABLE 重建则无需此步，但需先导出数据再导入）
   建议：将旧数据导出为 CSV，再导入新表。

3. 重命名备份旧表，执行本脚本，然后将数据按新结构插入。

4. 所有业务表查询必须添加 WHERE site_id = ? 条件，或启用 RLS。
*/