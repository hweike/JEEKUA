-- ============================================================
-- PostgreSQL 多租户建库脚本（完整合并版）
-- 生成日期：2026-09-23
-- 特性：全量 DROP + CREATE，幂等可重跑
-- 包含：完整表结构 + 索引 + 注释 + 初始化数据（含 site_pages）
-- ============================================================

-- ============================================================
-- 第 0 部分：扩展与 schema
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE SCHEMA IF NOT EXISTS chat;

-- ============================================================
-- 第 1 部分：多租户核心
-- ============================================================

-- 1.1 租户表
DROP TABLE IF EXISTS "tenants" CASCADE;
CREATE TABLE "tenants" (
    "tenant_id"         TEXT PRIMARY KEY,
    "name"              TEXT NOT NULL,
    "billing_email"     TEXT,
    "status"            TEXT NOT NULL DEFAULT 'active',
    "subscription_plan" TEXT,
    "trial_ends_at"     TIMESTAMP,
    "created_at"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP
);

-- 1.2 站点表
DROP TABLE IF EXISTS "sites" CASCADE;
CREATE TABLE "sites" (
    "site_id"           TEXT PRIMARY KEY,
    "tenant_id"         TEXT NOT NULL REFERENCES "tenants"("tenant_id") ON DELETE CASCADE,
    "name"              TEXT NOT NULL,
    "status"            TEXT NOT NULL DEFAULT 'active',
    "plan_name"         TEXT,
    "start_date"        DATE,
    "end_date"          DATE,
    "auto_renew"        BOOLEAN DEFAULT FALSE,
    "default_locale"    TEXT DEFAULT 'en',
    "created_at"        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"        TIMESTAMP,
    CONSTRAINT "chk_site_dates" CHECK ("end_date" IS NULL OR "end_date" > "start_date")
);
CREATE INDEX "idx_sites_tenant"    ON "sites" ("tenant_id");
CREATE INDEX "idx_sites_status"    ON "sites" ("status");
CREATE INDEX "idx_sites_end_date"  ON "sites" ("end_date") WHERE "status" = 'active';

-- 1.3 站点域名表
DROP TABLE IF EXISTS "site_domains" CASCADE;
CREATE TABLE "site_domains" (
    "domain_id"     SERIAL PRIMARY KEY,
    "site_id"       TEXT NOT NULL REFERENCES "sites"("site_id") ON DELETE CASCADE,
    "domain"        TEXT NOT NULL UNIQUE,
    "is_primary"    BOOLEAN NOT NULL DEFAULT FALSE,
    "verified_at"   TIMESTAMP,
    "created_at"    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP
);
CREATE INDEX "idx_site_domains_site"   ON "site_domains" ("site_id");
CREATE INDEX "idx_site_domains_domain" ON "site_domains" ("domain");

-- 1.4 站点基本设置表
DROP TABLE IF EXISTS "sites_settings" CASCADE;
CREATE TABLE "sites_settings" (
    id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    site_id             TEXT NOT NULL DEFAULT '000001',
    site_name           TEXT NOT NULL,
    website_url         TEXT NOT NULL,
    default_locale      TEXT DEFAULT 'en',
    target_audience     TEXT,
    contact_email       TEXT,
    contact_phone       TEXT,
    company_name        TEXT,
    country             TEXT DEFAULT 'China',
    registered_address  TEXT,
    city                TEXT,
    province            TEXT,
    postal_code         TEXT,
    brand               JSONB DEFAULT '[]'::jsonb,
    social_share_image  TEXT,
    logo                TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX "idx_sites_settings_site_id" ON "sites_settings" (site_id);
COMMENT ON COLUMN "sites_settings".logo IS '企业Logo图片URL';
COMMENT ON COLUMN "sites_settings".social_share_image IS '社交媒体分享图片URL（建议尺寸1200×628px）';



-- ============================================================
-- 第 2 部分：产品域
-- ============================================================

-- 2.1 产品表
DROP TABLE IF EXISTS "products" CASCADE;
CREATE TABLE "products" (
    "site_id"              TEXT NOT NULL,
    "productId"            TEXT NOT NULL,
    "locale"               TEXT NOT NULL,
    "productLineId"        TEXT,
    "categoryId"           TEXT NOT NULL,
    "seriesId"             TEXT,
    "parent_product_id"    TEXT,
    "sku"                  TEXT NOT NULL,
    "product_name"         TEXT NOT NULL,
    "brand"                TEXT,
    "price_tiers"          TEXT,
    "currency"             TEXT DEFAULT 'USD',
    "availability"         TEXT DEFAULT 'in_stock',
    "min_order_quantity"   INTEGER DEFAULT 1,
    "main_image_url"       TEXT,
    "attributes"           TEXT,
    "slug"                 TEXT,
    "status"               TEXT DEFAULT 'published',
    "templateId"           TEXT DEFAULT '',
    "updatedAt"            TEXT NOT NULL,
    "createdAt"            TEXT NOT NULL,
    "source_locale"        TEXT,
    "source_product_id"    TEXT,
    "source_content_hash"  TEXT,
    "last_sync_time"       TEXT,
    "last_sync_operator"   TEXT,
    "search_vector"        TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(product_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(sku, '')), 'B')
    ) STORED,
    PRIMARY KEY ("site_id", "productId", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX "idx_products_site_locale"        ON "products" ("site_id", "locale");
CREATE INDEX "idx_products_site_productLine"   ON "products" ("site_id", "productLineId");
CREATE INDEX "idx_products_site_category"      ON "products" ("site_id", "categoryId");
CREATE INDEX "idx_products_site_parent"        ON "products" ("site_id", "parent_product_id");
CREATE INDEX "idx_products_site_status"        ON "products" ("site_id", "status");
CREATE INDEX "idx_products_site_updated"       ON "products" ("site_id", "updatedAt");
CREATE INDEX "idx_products_list"               ON "products" ("site_id", "locale", "parent_product_id", "status", "categoryId", "updatedAt" DESC);
CREATE INDEX "idx_products_uncategorized"      ON "products" ("site_id", "locale", "categoryId") WHERE "categoryId" = '__UNCATEGORIZED__';
CREATE INDEX "idx_products_sku"                ON "products" ("sku");
CREATE INDEX "idx_products_parent_id"          ON "products" ("parent_product_id");
CREATE INDEX "idx_products_lookup"             ON "products" ("site_id", "locale", "productId");
CREATE INDEX "idx_products_search_all"         ON "products" ("site_id", "locale", "parent_product_id", "categoryId", "updatedAt" DESC);
CREATE INDEX "idx_products_search_series"      ON "products" ("site_id", "locale", "parent_product_id", "categoryId", "seriesId", "updatedAt" DESC);
CREATE INDEX "idx_products_search_status"      ON "products" ("site_id", "locale", "parent_product_id", "status", "categoryId", "updatedAt" DESC);
CREATE INDEX "idx_products_search_basic"       ON "products" ("site_id", "locale", "parent_product_id", "updatedAt" DESC);
CREATE INDEX "idx_products_search_vector"      ON "products" USING GIN ("search_vector");
CREATE INDEX "idx_products_source"             ON "products" ("source_locale", "source_product_id");

-- 2.2 产品异步任务表
DROP TABLE IF EXISTS product_tasks CASCADE;
CREATE TABLE product_tasks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     TEXT NOT NULL DEFAULT '000001',
    status      TEXT NOT NULL DEFAULT 'pending',
    result      JSONB,
    error       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE INDEX idx_product_tasks_status      ON product_tasks(status);
CREATE INDEX idx_product_tasks_created_at  ON product_tasks(created_at);
CREATE INDEX idx_product_tasks_site        ON product_tasks(site_id);

-- 2.3 产品价格表（内部价格）
DROP TABLE IF EXISTS product_prices CASCADE;
CREATE TABLE product_prices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id         TEXT NOT NULL DEFAULT '000001',
    model           TEXT NOT NULL UNIQUE,
    product_line    TEXT,
    moq             INTEGER,
    lpp_price       NUMERIC(10,4),
    pp_price        NUMERIC(10,4),
    exchange_rate   NUMERIC(10,6),
    price_moq_20    NUMERIC(10,4),
    price_moq_100   NUMERIC(10,4),
    price_moq_500   NUMERIC(10,4),
    price_A         NUMERIC(10,4),
    price_B         NUMERIC(10,4),
    parent_model    TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE INDEX idx_product_prices_model         ON product_prices(model);
CREATE INDEX idx_product_prices_parent_model  ON product_prices(parent_model);
CREATE INDEX idx_product_prices_product_line  ON product_prices(product_line);
CREATE INDEX idx_product_prices_moq           ON product_prices(moq);
CREATE INDEX idx_product_prices_site          ON product_prices(site_id);

-- 2.4 产品-资源关联表
DROP TABLE IF EXISTS "resource_product" CASCADE;
CREATE TABLE "resource_product" (
    "id"             SERIAL PRIMARY KEY,
    "site_id"        TEXT NOT NULL,
    "resource_type"  TEXT NOT NULL CHECK ("resource_type" IN ('blog', 'document', 'video')),
    "resource_id"    TEXT NOT NULL,
    "product_id"     TEXT NOT NULL,
    "sort_order"     INTEGER DEFAULT 0,
    "created_at"     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("site_id", "resource_type", "resource_id", "product_id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX "idx_resource_product_site_lookup" ON "resource_product" ("site_id", "resource_type", "resource_id");
CREATE INDEX "idx_product_resources_site"       ON "resource_product" ("site_id", "product_id");

-- 2.5 采集产品表
DROP TABLE IF EXISTS collected_products CASCADE;
CREATE TABLE collected_products (
    id              BIGSERIAL PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    site_id         TEXT NOT NULL DEFAULT '000001',
    source_url      TEXT NOT NULL,
    platform        VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'unclaimed',
    title           TEXT,
    main_image_url  TEXT,
    price           DECIMAL(12,2),
    currency        VARCHAR(3) DEFAULT 'CNY',
    raw_data        JSONB NOT NULL,
    documents       JSONB,
    custom_fields   JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE INDEX idx_collected_products_tenant_site ON collected_products(tenant_id, site_id);
CREATE INDEX idx_collected_products_status      ON collected_products(status);
CREATE INDEX idx_collected_products_platform    ON collected_products(platform);

-- 2.6 采集器配置表
DROP TABLE IF EXISTS crawler_configs CASCADE;
CREATE TABLE crawler_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     TEXT NOT NULL DEFAULT '000001',
    config      JSONB NOT NULL,
    version     TEXT NOT NULL DEFAULT '1.0.0',
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_by  TEXT,
    UNIQUE(site_id),
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);

-- 2.7 采集产品临时表
DROP TABLE IF EXISTS crawler_products CASCADE;
CREATE TABLE crawler_products (
    crawler_id          TEXT PRIMARY KEY,
    site_id             TEXT NOT NULL DEFAULT '000001',
    locale              TEXT NOT NULL DEFAULT 'en',
    product_id          TEXT NOT NULL,
    product_line_id     TEXT,
    category_id         TEXT,
    series_id           TEXT,
    parent_product_id   TEXT,
    sku                 TEXT NOT NULL,
    product_name        TEXT NOT NULL,
    brand               TEXT,
    price_tiers         JSONB,
    currency            TEXT DEFAULT 'USD',
    availability        TEXT DEFAULT 'in_stock',
    min_order_quantity  INTEGER DEFAULT 1,
    main_image_url      TEXT,
    additional_images   JSONB,
    description         TEXT,
    short_description   TEXT,
    attributes          JSONB,
    spec_text           TEXT,
    slug                TEXT,
    status              TEXT DEFAULT 'draft',
    template_id         TEXT DEFAULT '',
    seo_title           TEXT,
    seo_description     TEXT,
    seo_keywords        TEXT,
    sku_list            JSONB DEFAULT '[]'::jsonb,
    platform            TEXT NOT NULL,
    source_url          TEXT NOT NULL,
    source_product_id   TEXT,
    source_locale       TEXT DEFAULT 'en',
    collected_at        TIMESTAMPTZ,
    collected_by        TEXT,
    import_status       TEXT DEFAULT 'pending',
    imported_at         TIMESTAMPTZ,
    import_error        TEXT,
    updated_at          TIMESTAMPTZ DEFAULT NOW(),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(site_id, source_url),
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE INDEX idx_crawler_products_site          ON crawler_products(site_id);
CREATE INDEX idx_crawler_products_platform      ON crawler_products(platform);
CREATE INDEX idx_crawler_products_import_status ON crawler_products(import_status);
CREATE INDEX idx_crawler_products_collected_at  ON crawler_products(collected_at DESC);
CREATE INDEX idx_crawler_products_source_url    ON crawler_products(source_url);

COMMENT ON TABLE crawler_products IS '产品采集数据临时表，存放从各平台采集的商品数据';
COMMENT ON COLUMN crawler_products.import_status IS '导入状态: pending-待导入, imported-已导入, skipped-已跳过, failed-导入失败';
COMMENT ON COLUMN crawler_products.sku_list IS '变体列表（SKU组合）';

-- 2.8 平台凭据表
DROP TABLE IF EXISTS user_platform_credentials CASCADE;
CREATE TABLE user_platform_credentials (
    id           BIGSERIAL PRIMARY KEY,
    user_id      TEXT NOT NULL,
    platform     VARCHAR(50) NOT NULL,
    credential   TEXT NOT NULL,
    expires_at   TIMESTAMPTZ,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);
CREATE INDEX idx_user_platform_credentials_user_platform ON user_platform_credentials(user_id, platform);



-- ============================================================
-- 第 3 部分：内容域
-- ============================================================

-- 3.1 布局模板表
DROP TABLE IF EXISTS site_pages CASCADE;
CREATE TABLE site_pages (
  site_id          TEXT NOT NULL,
  id               TEXT NOT NULL,
  locale           TEXT NOT NULL,
  title            TEXT NOT NULL,
  type             TEXT,
  preset           BOOLEAN DEFAULT FALSE,
  visible          TEXT DEFAULT 'visible',
  template         TEXT,
  template_hash    TEXT,
  slug             TEXT NOT NULL,
  seo_keywords     TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  content          TEXT,
  template_data    JSONB,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (site_id, id, locale),
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX idx_site_pages_site_locale_slug  ON site_pages (site_id, locale, slug);
CREATE INDEX idx_site_pages_template                  ON site_pages (site_id, template);
CREATE INDEX idx_site_pages_template_hash             ON site_pages (template_hash);
CREATE INDEX idx_site_pages_site_locale_type          ON site_pages (site_id, locale, type);
COMMENT ON TABLE site_pages IS '网站页面表 - 存储所有页面的元数据、SEO 和布局配置';
COMMENT ON COLUMN site_pages.locale IS '语言代码（如 en/zh/base），base 表示全局布局模板（不区分语言）';
COMMENT ON COLUMN site_pages.type IS '页面类型: page | product | product_category | product_line | document | document_library | blog | blog_post | blog_collection | video_category | video | home | custom | policy';
COMMENT ON COLUMN site_pages.preset IS '是否为系统预设页面（true 时不可删除）';
COMMENT ON COLUMN site_pages.template IS '关联的模板 ID（来自 webbuilder/templates）';
COMMENT ON COLUMN site_pages.template_hash IS '当前嵌入模板数据的哈希值，用于快速比对版本变化';
COMMENT ON COLUMN site_pages.template_data IS '完整的 Puck 布局数据（JSONB），存储页面组件的完整配置';

-- 3.2 Discovery 注册表
DROP TABLE IF EXISTS "pages" CASCADE;
CREATE TABLE "pages" (
    "id"                   TEXT NOT NULL,
    "site_id"              TEXT NOT NULL,
    "locale"               TEXT NOT NULL,
    "type"                 TEXT NOT NULL,
    "title"                TEXT NOT NULL,
    "slug"                 TEXT,
    "url"                  TEXT NOT NULL,
    "cover_image"          TEXT,
    "seo_title"            TEXT,
    "seo_description"      TEXT,
    "seo_keywords"         TEXT,
    "canonical"            TEXT,
    "noindex"              INTEGER DEFAULT 0,
    "nofollow"             INTEGER DEFAULT 0,
    "priority"             REAL DEFAULT 0.5,
    "changefreq"           TEXT DEFAULT 'weekly',
    "content_summary"      TEXT,
    "content_hash"         TEXT,
    "source_content_hash"  TEXT,
    "source_locale"        TEXT,
    "last_sync_time"       TEXT,
    "last_sync_operator"   TEXT,
    "translated_by_ai"     INTEGER DEFAULT 0,
    "updatedAt"            TEXT NOT NULL,
    "createdAt"            TEXT DEFAULT (CURRENT_TIMESTAMP)::TEXT,
    PRIMARY KEY ("id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX idx_pages_site_locale                   ON "pages" ("site_id", "locale");
CREATE INDEX idx_pages_type_site                     ON "pages" ("type", "site_id");
CREATE INDEX idx_pages_url_site                      ON "pages" ("url", "site_id");
CREATE INDEX idx_pages_source                        ON "pages" ("source_locale", "source_content_hash");
CREATE INDEX idx_pages_id_source_locale              ON "pages" ("id", "source_locale") WHERE source_locale IS NOT NULL;
CREATE INDEX idx_pages_site_locale_type_updated      ON "pages" ("site_id", "locale", "type", "updatedAt" DESC);
CREATE INDEX idx_pages_title_trgm                    ON "pages" USING GIN ("title" gin_trgm_ops);

-- 3.3 页面内容表
DROP TABLE IF EXISTS "page_contents" CASCADE;
CREATE TABLE "page_contents" (
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
CREATE INDEX idx_contents_page_site ON "page_contents" ("page_id", "site_id", "locale");

-- 3.4 站点配置表
DROP TABLE IF EXISTS "site_configs" CASCADE;
CREATE TABLE "site_configs" (
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
CREATE INDEX idx_site_configs_lookup    ON "site_configs" ("site_id", "locale", "id");
CREATE INDEX idx_configs_site_locale    ON "site_configs" ("site_id", "locale");

-- 3.5 组件文本表（已废弃，保留兼容）
DROP TABLE IF EXISTS "component_texts" CASCADE;
CREATE TABLE "component_texts" (
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
CREATE INDEX idx_component_texts_site_lookup ON "component_texts" ("site_id", "template_id", "text_id", "locale");

-- ============================================================
-- 第 4 部分：博客 / 文档 / 视频
-- ============================================================

-- 4.1 博客文章表
DROP TABLE IF EXISTS "blog_posts" CASCADE;
CREATE TABLE "blog_posts" (
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
    PRIMARY KEY ("site_id", "id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX idx_blog_posts_site_locale         ON "blog_posts" ("site_id", "locale");
CREATE INDEX idx_blog_posts_site_locale_slug    ON "blog_posts" ("site_id", "locale", "slug");
CREATE INDEX idx_blog_posts_site_locale_title   ON "blog_posts" ("site_id", "locale", "title");
CREATE INDEX idx_blog_posts_site_category       ON "blog_posts" ("site_id", "category_id");
CREATE INDEX idx_blog_posts_site_visibility     ON "blog_posts" ("site_id", "visibility");
CREATE INDEX idx_blog_posts_site_updated        ON "blog_posts" ("site_id", "updated_at");

-- 4.2 文档表
DROP TABLE IF EXISTS "documents" CASCADE;
CREATE TABLE "documents" (
    "site_id"         TEXT NOT NULL,
    "id"              TEXT NOT NULL,
    "lib_id"          TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "parent_id"       TEXT,
    "order_index"     INTEGER NOT NULL,
    "file"            TEXT NOT NULL,
    "template_id"     TEXT,
    "seo_title"       TEXT,
    "seo_description" TEXT,
    "seo_keywords"    TEXT,
    "created_at"      TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY ("site_id", "id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX idx_documents_lib_locale ON "documents" ("lib_id", "locale");
CREATE INDEX idx_documents_parent     ON "documents" ("parent_id");
CREATE INDEX idx_documents_site       ON "documents" ("site_id");

-- 4.3 视频表
DROP TABLE IF EXISTS "videos" CASCADE;
CREATE TABLE "videos" (
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
    PRIMARY KEY ("site_id", "id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX idx_videos_site_locale   ON "videos" ("site_id", "locale");
CREATE INDEX idx_videos_site_category ON "videos" ("site_id", "category_key");
CREATE INDEX idx_videos_site_title    ON "videos" ("site_id", "title");
CREATE INDEX idx_videos_site_visible  ON "videos" ("site_id", "visible");

-- ============================================================
-- 第 5 部分：CRM 与询盘
-- ============================================================

-- 5.1 客户表
DROP TABLE IF EXISTS "customers" CASCADE;
CREATE TABLE "customers" (
    "site_id"          TEXT NOT NULL,
    "id"               TEXT NOT NULL,
    "first_name"       TEXT DEFAULT '',
    "last_name"        TEXT DEFAULT '',
    "name"             TEXT DEFAULT '',
    "country"          TEXT DEFAULT '',
    "country_code"     TEXT DEFAULT '',
    "email"            TEXT NOT NULL DEFAULT '',
    "phone"            TEXT DEFAULT '',
    "whatsapp"         TEXT DEFAULT '',
    "company_name"     TEXT DEFAULT '',
    "address"          TEXT DEFAULT '',
    "email_verified"   BOOLEAN DEFAULT FALSE,
    "last_login"       TIMESTAMP,
    "password_hash"    TEXT DEFAULT '',
    "auth_uid"         UUID,
    "role"             TEXT DEFAULT 'customer',
    "stage"            TEXT,
    "importance"       INTEGER,
    "scale"            TEXT,
    "notes"            TEXT DEFAULT '',
    "website"          TEXT DEFAULT '',
    "flag"             TEXT DEFAULT '',
    "email_subscribed" TEXT DEFAULT '未订阅',
    "source"           TEXT NOT NULL,
    "created_at"       TIMESTAMP DEFAULT NOW(),
    "updated_at"       TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("site_id", "id"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX idx_customers_site_email     ON "customers" ("site_id", "email");
CREATE INDEX idx_customers_site_company   ON "customers" ("site_id", "company_name");
CREATE INDEX idx_customers_site_stage     ON "customers" ("site_id", "stage");
CREATE INDEX idx_customers_site_created   ON "customers" ("site_id", "created_at");
CREATE INDEX idx_customers_auth_uid       ON "customers" ("auth_uid");
CREATE UNIQUE INDEX idx_customers_site_email_source ON "customers" ("site_id", "email", "source");

-- 5.2 客户地址表
DROP TABLE IF EXISTS "addresses" CASCADE;
CREATE TABLE "addresses" (
    "id"             SERIAL PRIMARY KEY,
    "site_id"        TEXT NOT NULL,
    "customer_id"    TEXT NOT NULL,
    "recipient"      TEXT NOT NULL,
    "phone"          TEXT NOT NULL,
    "country_code"   TEXT NOT NULL,
    "company"        TEXT DEFAULT '',
    "province"       TEXT DEFAULT '',
    "city"           TEXT DEFAULT '',
    "district"       TEXT DEFAULT '',
    "detail"         TEXT NOT NULL,
    "is_default"     BOOLEAN DEFAULT FALSE,
    "created_at"     TIMESTAMP DEFAULT NOW(),
    "updated_at"     TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("site_id", "customer_id") REFERENCES "customers" ("site_id", "id") ON DELETE CASCADE
);
CREATE INDEX idx_addresses_site_customer ON "addresses" ("site_id", "customer_id");
CREATE INDEX idx_addresses_site_default  ON "addresses" ("site_id", "is_default");

-- 5.3 询盘表
DROP TABLE IF EXISTS "inquiries" CASCADE;
CREATE TABLE "inquiries" (
    "id"                SERIAL PRIMARY KEY,
    "site_id"           TEXT NOT NULL,
    "inquiry_number"    TEXT NOT NULL UNIQUE,
    "customer_id"       TEXT,
    "name"              TEXT NOT NULL,
    "email"             TEXT NOT NULL,
    "phone"             TEXT DEFAULT '',
    "company"           TEXT DEFAULT '',
    "subject"           TEXT DEFAULT '',
    "message"           TEXT NOT NULL,
    "product_id"        TEXT,
    "product_locale"    TEXT,
    "product_slug"      TEXT,
    "status"            TEXT DEFAULT '待处理'
        CHECK (status IN ('待处理', '处理中', '已回复', '已关闭')),
    "created_at"        TIMESTAMP DEFAULT NOW(),
    "updated_at"        TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE,
    FOREIGN KEY ("site_id", "customer_id") REFERENCES "customers" ("site_id", "id") ON DELETE SET NULL
);
CREATE INDEX idx_inquiries_site_email         ON "inquiries" ("site_id", "email");
CREATE INDEX idx_inquiries_site_status        ON "inquiries" ("site_id", "status");
CREATE INDEX idx_inquiries_site_created       ON "inquiries" ("site_id", "created_at");
CREATE INDEX idx_inquiries_customer           ON "inquiries" ("site_id", "customer_id");
CREATE INDEX idx_inquiries_number             ON "inquiries" ("inquiry_number");
CREATE INDEX idx_inquiries_product_locale     ON "inquiries" ("product_locale");
CREATE INDEX idx_inquiries_product_slug       ON "inquiries" ("product_slug");

-- 5.4 询盘回复表
DROP TABLE IF EXISTS "inquiry_replies" CASCADE;
CREATE TABLE "inquiry_replies" (
    "id"                SERIAL PRIMARY KEY,
    "inquiry_id"        INT NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
    "site_id"           TEXT NOT NULL,
    "sender_type"       VARCHAR(20) NOT NULL CHECK (sender_type IN ('admin', 'user', 'system')),
    "sender_email"      VARCHAR(255) NOT NULL,
    "sender_name"       VARCHAR(255),
    "admin_id"          INT,
    "customer_id"       TEXT,
    "content"           TEXT NOT NULL,
    "is_internal"       BOOLEAN DEFAULT FALSE,
    "message_id"        VARCHAR(255),
    "in_reply_to"       VARCHAR(255),
    "created_at"        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_replies_inquiry       ON "inquiry_replies" ("inquiry_id");
CREATE INDEX idx_replies_site_inquiry  ON "inquiry_replies" ("site_id", "inquiry_id");
CREATE INDEX idx_replies_created       ON "inquiry_replies" ("created_at");
CREATE INDEX idx_replies_sender        ON "inquiry_replies" ("sender_type");

-- 5.5 验证码表
DROP TABLE IF EXISTS "verification_codes" CASCADE;
CREATE TABLE "verification_codes" (
    "id"         SERIAL PRIMARY KEY,
    "email"      TEXT NOT NULL,
    "code"       TEXT NOT NULL,
    "type"       TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_verification_codes_email ON "verification_codes" ("email");


-- ============================================================
-- 第 6 部分：SEO
-- ============================================================

-- 6.1 SEO 策略表（✅ 部分唯一索引，NULL 也生效）
DROP TABLE IF EXISTS "seo_strategies" CASCADE;
CREATE TABLE "seo_strategies" (
    "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "site_id"              TEXT,
    "page_type"            TEXT NOT NULL,
    "label"                TEXT NOT NULL,
    "use_global_context"   BOOLEAN DEFAULT TRUE,
    "fields"               JSONB NOT NULL,
    "created_at"           TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX "seo_strategies_global_unique"
  ON "seo_strategies" ("page_type")
  WHERE "site_id" IS NULL;
CREATE UNIQUE INDEX "seo_strategies_site_unique"
  ON "seo_strategies" ("site_id", "page_type")
  WHERE "site_id" IS NOT NULL;
CREATE INDEX "idx_seo_strategies_site"      ON "seo_strategies" ("site_id");
CREATE INDEX "idx_seo_strategies_page_type" ON "seo_strategies" ("page_type");

-- 6.2 页面 SEO 数据表
DROP TABLE IF EXISTS "page_seo_data" CASCADE;
CREATE TABLE "page_seo_data" (
    "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "site_id"              TEXT NOT NULL,
    "page_id"              TEXT NOT NULL,
    "locale"               TEXT NOT NULL,
    "page_type"            TEXT NOT NULL,
    "analyzed_keywords"    TEXT[],
    "analyzed_summary"     TEXT,
    "seo_title"            TEXT,
    "seo_description"      TEXT,
    "seo_keywords"         TEXT[],
    "generation_status"    TEXT DEFAULT 'pending',
    "source_locale"        TEXT,
    "source_analysis_ref"  UUID,
    "created_at"           TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT "page_seo_data_site_page_locale_unique" UNIQUE ("site_id", "page_id", "locale")
);
CREATE INDEX "idx_page_seo_data_site_page"     ON "page_seo_data" ("site_id", "page_id");
CREATE INDEX "idx_page_seo_data_site_locale"   ON "page_seo_data" ("site_id", "locale");
CREATE INDEX "idx_page_seo_data_site_status"   ON "page_seo_data" ("site_id", "generation_status");
CREATE INDEX "idx_page_seo_data_site_source"   ON "page_seo_data" ("site_id", "source_locale");
CREATE INDEX "idx_page_seo_data_page_type"     ON "page_seo_data" ("page_type");

-- 6.3 SEO 批量任务表
DROP TABLE IF EXISTS "seo_batch_jobs" CASCADE;
CREATE TABLE "seo_batch_jobs" (
    "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "site_id"              TEXT NOT NULL,
    "job_type"             TEXT NOT NULL,
    "status"               TEXT DEFAULT 'pending',
    "total_count"          INTEGER NOT NULL,
    "completed_count"      INTEGER DEFAULT 0,
    "failed_count"         INTEGER DEFAULT 0,
    "source_locale"        TEXT,
    "target_locales"       TEXT[],
    "page_ids"             TEXT[],
    "error_summary"        TEXT,
    "started_at"           TIMESTAMPTZ,
    "finished_at"          TIMESTAMPTZ,
    "created_by"           TEXT,
    "created_at"           TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX "idx_seo_batch_jobs_site_status" ON "seo_batch_jobs" ("site_id", "status");
CREATE INDEX "idx_seo_batch_jobs_created"     ON "seo_batch_jobs" ("created_at" DESC);

-- 6.4 同步日志表
DROP TABLE IF EXISTS "sync_logs" CASCADE;
CREATE TABLE "sync_logs" (
    "id"              SERIAL PRIMARY KEY,
    "site_id"         TEXT NOT NULL,
    "sync_type"       TEXT NOT NULL,
    "source_id"       TEXT NOT NULL,
    "source_locale"   TEXT NOT NULL,
    "target_locale"   TEXT NOT NULL,
    "target_id"       TEXT NOT NULL,
    "source_hash"     TEXT,
    "status"          TEXT DEFAULT 'success',
    "error_message"   TEXT,
    "operator"        TEXT,
    "created_at"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX "idx_sync_logs_site"     ON "sync_logs" ("site_id");
CREATE INDEX "idx_sync_logs_source"   ON "sync_logs" ("source_id", "source_locale");
CREATE INDEX "idx_sync_logs_target"   ON "sync_logs" ("target_id", "target_locale");
CREATE INDEX "idx_sync_logs_created"  ON "sync_logs" ("created_at");

-- ============================================================
-- 第 7 部分：媒体文件
-- ============================================================

DROP TABLE IF EXISTS file_categories CASCADE;
CREATE TABLE file_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       TEXT NOT NULL,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL,
  parent_id     UUID NULL REFERENCES file_categories(id) ON DELETE SET NULL,
  "order"       INT DEFAULT 0,
  description   TEXT DEFAULT '',
  icon          TEXT DEFAULT 'folder',
  color         TEXT DEFAULT '#3b82f6',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ,
  CONSTRAINT unique_site_slug UNIQUE (site_id, slug),
  CONSTRAINT unique_site_name UNIQUE (site_id, name)
);

DROP TABLE IF EXISTS media_files CASCADE;
CREATE TABLE media_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id       TEXT NOT NULL DEFAULT '000001',
  storage_key   TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size          BIGINT NOT NULL,
  file_hash     TEXT NOT NULL,
  width         INT,
  height        INT,
  source_url    TEXT,
  category_id   UUID NULL REFERENCES file_categories(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

DROP TABLE IF EXISTS file_references CASCADE;
CREATE TABLE file_references (
  id             SERIAL PRIMARY KEY,
  site_id        TEXT NOT NULL DEFAULT '000001',
  file_id        UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) NOT NULL,
  reference_id   VARCHAR(255) NOT NULL,
  alt_text       TEXT,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(file_id, reference_type, reference_id)
);

CREATE INDEX idx_media_files_hash         ON media_files(file_hash);
CREATE INDEX idx_media_files_created      ON media_files(created_at DESC);
CREATE INDEX idx_media_files_source_url   ON media_files(source_url);
CREATE INDEX idx_media_files_category     ON media_files(category_id);
CREATE INDEX idx_media_files_site_id      ON media_files(site_id);
CREATE INDEX idx_file_categories_parent   ON file_categories(parent_id);
CREATE INDEX idx_file_categories_order    ON file_categories("order");
CREATE INDEX idx_file_categories_site     ON file_categories(site_id);
CREATE INDEX idx_file_ref_target          ON file_references(reference_type, reference_id);
CREATE INDEX idx_file_ref_file            ON file_references(file_id);
CREATE INDEX idx_file_ref_site            ON file_references(site_id);

-- ============================================================
-- 第 8 部分：订单与支付
-- ============================================================

DROP TABLE IF EXISTS "orders" CASCADE;
CREATE TABLE "orders" (
    "id"                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"               TEXT NOT NULL,
    "order_no"              TEXT NOT NULL UNIQUE,
    "contract_no"           TEXT,
    "customer_id"           TEXT,
    "buyer_name"            TEXT NOT NULL,
    "buyer_email"           TEXT NOT NULL,
    "buyer_company"         TEXT DEFAULT '',
    "buyer_country"         TEXT DEFAULT '',
    "buyer_phone"           TEXT DEFAULT '',
    "buyer_address"         TEXT DEFAULT '',
    "payment_method"        TEXT DEFAULT 'bank_transfer',
    "selected_account_ids"  JSONB DEFAULT '[]'::jsonb,
    "currency"              TEXT DEFAULT 'USD',
    "sub_total"             DECIMAL(15,2) DEFAULT 0,
    "discount"              DECIMAL(15,2) DEFAULT 0,
    "shipping_fee"          DECIMAL(15,2) DEFAULT 0,
    "tax"                   DECIMAL(15,2) DEFAULT 0,
    "total_amount"          DECIMAL(15,2) DEFAULT 0,
    "shipping_method"       TEXT DEFAULT '',
    "shipping_date_type"    TEXT DEFAULT '',
    "shipping_date"         DATE,
    "shipping_days"         INTEGER DEFAULT 0,
    "trade_term"            TEXT DEFAULT 'FOB',
    "tracking_number"       TEXT DEFAULT '',
    "carrier"               TEXT DEFAULT '',
    "carrier_name"          TEXT DEFAULT '',
    "tracking_image"        TEXT DEFAULT '',
    "shipping_records"      JSONB DEFAULT '[]'::jsonb,
    "expiry_date"           TIMESTAMP,
    "legal_terms"           TEXT DEFAULT '',
    "postscript"            TEXT DEFAULT '',
    "remark"                TEXT DEFAULT '',
    "paypal_order_id"       TEXT,
    "paypal_payer_id"       TEXT,
    "paypal_payment_id"     TEXT,
    "payment_status"        TEXT DEFAULT 'pending',
    "paid_at"               TIMESTAMP,
    "deposit_amount"        DECIMAL(15,2) DEFAULT 0,
    "status"                TEXT DEFAULT 'draft',
    "sent_status"           TEXT DEFAULT 'unsent',
    "share_token"           TEXT,
    "share_view_count"      INTEGER DEFAULT 0,
    "created_by"            TEXT,
    "sent_at"               TIMESTAMP,
    "cancelled_at"          TIMESTAMP,
    "expired_at"            TIMESTAMP,
    "created_at"            TIMESTAMP DEFAULT NOW(),
    "updated_at"            TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX "idx_orders_site"                     ON "orders" ("site_id");
CREATE INDEX "idx_orders_site_status"              ON "orders" ("site_id", "status");
CREATE INDEX "idx_orders_site_customer"            ON "orders" ("site_id", "customer_id");
CREATE INDEX "idx_orders_order_no"                 ON "orders" ("order_no");
CREATE INDEX "idx_orders_contract_no"              ON "orders" ("contract_no");
CREATE INDEX "idx_orders_paypal_order_id"          ON "orders" ("paypal_order_id");
CREATE INDEX "idx_orders_site_created"             ON "orders" ("site_id", "created_at" DESC);
CREATE INDEX "idx_orders_site_status_expiry"       ON "orders" ("site_id", "status", "expiry_date");
CREATE INDEX "idx_orders_share_token"              ON "orders" ("share_token");
CREATE INDEX "idx_orders_payment_method"           ON "orders" ("payment_method");
CREATE INDEX "idx_orders_selected_account_ids"     ON "orders" USING GIN ("selected_account_ids");
CREATE INDEX "idx_orders_customer_id"              ON "orders" ("customer_id");
CREATE INDEX "idx_orders_sent_status"              ON "orders" ("sent_status");
CREATE INDEX "idx_orders_shipping_records"         ON "orders" USING GIN ("shipping_records");

COMMENT ON COLUMN "orders"."order_no" IS '系统订单号，唯一';
COMMENT ON COLUMN "orders"."contract_no" IS '合同号（客户可见），允许重复';
COMMENT ON COLUMN "orders"."buyer_country" IS '买家国家/地区';
COMMENT ON COLUMN "orders"."payment_method" IS '支付方式: bank_transfer | qr_code | online_payment';
COMMENT ON COLUMN "orders"."selected_account_ids" IS '选中的收款账号ID列表，JSON数组格式';
COMMENT ON COLUMN "orders"."shipping_method" IS '运输方式: 快递/海运/空运/陆运/邮政/多式联运';
COMMENT ON COLUMN "orders"."shipping_date_type" IS '发货日期类型: deposit | balance | fixed';
COMMENT ON COLUMN "orders"."shipping_date" IS '指定发货日期（fixed 时使用）';
COMMENT ON COLUMN "orders"."shipping_days" IS '发货天数（deposit/balance 时使用）';
COMMENT ON COLUMN "orders"."trade_term" IS '贸易术语: EXW | FCA | FAS | FOB | CFR | CIF | CPT | CIP | DAT | DAP | DDP';
COMMENT ON COLUMN "orders"."tracking_number" IS '【已废弃，请使用 shipping_records】';
COMMENT ON COLUMN "orders"."carrier" IS '【已废弃，请使用 shipping_records】';
COMMENT ON COLUMN "orders"."carrier_name" IS '【已废弃，请使用 shipping_records】';
COMMENT ON COLUMN "orders"."tracking_image" IS '【已废弃，请使用 shipping_records】';
COMMENT ON COLUMN "orders"."shipping_records" IS '发货记录列表（JSONB数组），支持多次发货';
COMMENT ON COLUMN "orders"."expiry_date" IS '订单过期时间，用于自动过期判断';
COMMENT ON COLUMN "orders"."remark" IS '备注（仅内部可见）';
COMMENT ON COLUMN "orders"."deposit_amount" IS '预付款金额';
COMMENT ON COLUMN "orders"."status" IS '订单状态: draft | formal | paid | completed | cancelled';
COMMENT ON COLUMN "orders"."sent_status" IS '发送状态: sent | unsent';

DROP TABLE IF EXISTS "order_items" CASCADE;
CREATE TABLE "order_items" (
    "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id"       UUID NOT NULL,
    "product_id"     TEXT,
    "locale"         TEXT DEFAULT 'zh',
    "product_name"   TEXT NOT NULL,
    "product_image"  TEXT DEFAULT '',
    "category"       TEXT DEFAULT '',
    "specification"  TEXT DEFAULT '',
    "sku"            TEXT DEFAULT '',
    "price"          DECIMAL(15,2) NOT NULL,
    "quantity"       INTEGER NOT NULL DEFAULT 1,
    "unit"           TEXT DEFAULT 'pcs',
    "total"          DECIMAL(15,2) NOT NULL,
    "sort_order"     INTEGER DEFAULT 0,
    "created_at"     TIMESTAMP DEFAULT NOW(),
    "updated_at"     TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE
);
CREATE INDEX "idx_order_items_order"    ON "order_items" ("order_id");
CREATE INDEX "idx_order_items_product"  ON "order_items" ("product_id");

DROP TABLE IF EXISTS "order_status_logs" CASCADE;
CREATE TABLE "order_status_logs" (
    "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id"     UUID NOT NULL,
    "from_status"  TEXT,
    "to_status"    TEXT NOT NULL,
    "operator"     TEXT,
    "note"         TEXT DEFAULT '',
    "created_at"   TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE
);
CREATE INDEX "idx_order_status_logs_order"    ON "order_status_logs" ("order_id");
CREATE INDEX "idx_order_status_logs_created"  ON "order_status_logs" ("created_at" DESC);

DROP TABLE IF EXISTS "payment_accounts" CASCADE;
CREATE TABLE "payment_accounts" (
    "id"                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"                   TEXT NOT NULL,
    "account_type"              TEXT,
    "payment_type"              TEXT NOT NULL,
    "payment_method"            TEXT NOT NULL,
    "display_name_zh"           TEXT NOT NULL,
    "display_name_en"           TEXT NOT NULL,
    "currency"                  JSONB NOT NULL DEFAULT '[]',
    "is_active"                 BOOLEAN DEFAULT TRUE,
    "is_default"                BOOLEAN DEFAULT FALSE,
    "sort_order"                INTEGER DEFAULT 0,
    "beneficiary_name"          TEXT,
    "beneficiary_account"       TEXT,
    "country_region"            TEXT,
    "swift_code"                TEXT,
    "beneficiary_address"       TEXT,
    "beneficiary_bank"          TEXT,
    "beneficiary_bank_address"  TEXT,
    "bank_code"                 TEXT,
    "branch_code"               TEXT,
    "iban"                      TEXT,
    "attention"                 TEXT,
    "intermediary_bank"         TEXT,
    "account_holder"            TEXT,
    "account_identifier"        TEXT,
    "qr_code_image"             TEXT,
    "remark"                    TEXT,
    "paypal_email"              TEXT,
    "paypal_client_id"          TEXT,
    "paypal_client_secret"      TEXT,
    "paypal_webhook_id"         TEXT,
    "is_verified"               BOOLEAN DEFAULT FALSE,
    "stripe_secret_key"         TEXT,
    "stripe_publishable_key"    TEXT,
    "stripe_webhook_secret"     TEXT,
    "share_token"               TEXT,
    "details"                   JSONB,
    "created_at"                TIMESTAMP DEFAULT NOW(),
    "updated_at"                TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);
CREATE INDEX "idx_payment_accounts_site"            ON "payment_accounts" ("site_id");
CREATE INDEX "idx_payment_accounts_account_type"    ON "payment_accounts" ("account_type");
CREATE INDEX "idx_payment_accounts_type_method"     ON "payment_accounts" ("payment_type", "payment_method");
CREATE INDEX "idx_payment_accounts_currency"        ON "payment_accounts" USING GIN ("currency");
CREATE INDEX "idx_payment_accounts_default"         ON "payment_accounts" ("site_id", "is_default");
CREATE INDEX "idx_payment_accounts_share_token"     ON "payment_accounts" ("share_token");
CREATE INDEX "idx_payment_accounts_display_name"    ON "payment_accounts" ("display_name_zh", "display_name_en");
CREATE INDEX "idx_payment_accounts_payment_method"  ON "payment_accounts" ("payment_method");
CREATE INDEX "idx_payment_accounts_is_verified"     ON "payment_accounts" ("is_verified");

DROP TABLE IF EXISTS "paypal_webhook_logs" CASCADE;
CREATE TABLE "paypal_webhook_logs" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "event_id"          TEXT NOT NULL,
    "event_type"        TEXT NOT NULL,
    "order_id"          UUID,
    "paypal_order_id"   TEXT,
    "payload"           JSONB,
    "processed"         BOOLEAN DEFAULT FALSE,
    "processed_at"      TIMESTAMP,
    "error"             TEXT,
    "created_at"        TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "idx_paypal_webhook_logs_event_id"   ON "paypal_webhook_logs" ("event_id");
CREATE INDEX "idx_paypal_webhook_logs_order"      ON "paypal_webhook_logs" ("order_id");
CREATE INDEX "idx_paypal_webhook_logs_processed"  ON "paypal_webhook_logs" ("processed");

DROP TABLE IF EXISTS legal_templates CASCADE;
CREATE TABLE legal_templates (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id      VARCHAR(20) NOT NULL DEFAULT '000001',
    name         VARCHAR(200) NOT NULL,
    content      TEXT NOT NULL,
    description  TEXT,
    is_default   BOOLEAN DEFAULT FALSE,
    sort_order   INTEGER DEFAULT 0,
    created_by   VARCHAR(100),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,
    FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE
);
CREATE INDEX idx_legal_templates_site_id     ON legal_templates(site_id);
CREATE INDEX idx_legal_templates_is_default  ON legal_templates(is_default);
CREATE INDEX idx_legal_templates_deleted_at  ON legal_templates(deleted_at);
CREATE INDEX idx_legal_templates_sort_order  ON legal_templates(sort_order);

DROP TABLE IF EXISTS "carriers" CASCADE;
CREATE TABLE "carriers" (
    "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"            TEXT,
    "key"                TEXT NOT NULL UNIQUE,
    "name_en"            TEXT NOT NULL,
    "name_cn"            TEXT NOT NULL,
    "name_hk"            TEXT,
    "url"                TEXT,
    "shipping_methods"   JSONB DEFAULT '[]'::jsonb,
    "logo"               TEXT,
    "sort_order"         INTEGER DEFAULT 0,
    "is_active"          BOOLEAN DEFAULT TRUE,
    "created_at"         TIMESTAMP DEFAULT NOW(),
    "updated_at"         TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "idx_carriers_site"              ON "carriers" ("site_id");
CREATE INDEX "idx_carriers_key"               ON "carriers" ("key");
CREATE INDEX "idx_carriers_shipping_methods"  ON "carriers" USING GIN ("shipping_methods");
CREATE INDEX "idx_carriers_is_active"         ON "carriers" ("is_active");

-- ============================================================
-- 第 9 部分：管理员与日志
-- ============================================================

DROP TABLE IF EXISTS admin_users CASCADE;
CREATE TABLE admin_users (
  id                     TEXT PRIMARY KEY,
  email                  TEXT UNIQUE NOT NULL,
  name                   TEXT NOT NULL,
  "englishName"          TEXT NOT NULL,
  "passwordHash"         TEXT NOT NULL,
  "createdAt"            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "mustChangePassword"   BOOLEAN NOT NULL DEFAULT true,
  role                   TEXT NOT NULL CHECK (role IN ('super', 'admin')),
  api_token              VARCHAR(100) UNIQUE,
  api_token_expires_at   TIMESTAMPTZ,
  site_id                TEXT NOT NULL DEFAULT '000001',
  avatar_url             TEXT,
  nickname               TEXT,
  online_status          TEXT DEFAULT 'online' CHECK (online_status IN ('online', 'offline', 'busy', 'away')),
  default_welcome        TEXT DEFAULT 'Hello, how can I help you?',
  offline_reply          TEXT DEFAULT 'Sorry, we are currently offline. We will get back to you soon.',
  online_start_time      TIME DEFAULT '09:00:00',
  online_end_time        TIME DEFAULT '21:00:00',
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_admin_users_email            ON admin_users(email);
CREATE INDEX idx_admin_users_api_token        ON admin_users(api_token);
CREATE INDEX idx_admin_users_site_id          ON admin_users(site_id);
CREATE INDEX idx_admin_users_site_email       ON admin_users(site_id, email);

COMMENT ON COLUMN admin_users.avatar_url IS '管理员头像图片地址';
COMMENT ON COLUMN admin_users.nickname IS '聊天显示的昵称';
COMMENT ON COLUMN admin_users.online_status IS '在线状态：online | offline | busy | away';
COMMENT ON COLUMN admin_users.default_welcome IS '客户发起聊天时的默认欢迎语';
COMMENT ON COLUMN admin_users.offline_reply IS '管理员离线时的自动回复内容';
COMMENT ON COLUMN admin_users.online_start_time IS '每日在线开始时间';
COMMENT ON COLUMN admin_users.online_end_time IS '每日在线结束时间';
COMMENT ON COLUMN admin_users.updated_at IS '记录最后更新时间';

-- 9.2 管理日志表（✅ 修正：action 加 'update'）
DROP TABLE IF EXISTS admin_logs CASCADE;
CREATE TABLE admin_logs (
  id              BIGSERIAL PRIMARY KEY,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type            TEXT NOT NULL CHECK (type IN ('login', 'admin', 'menu')),
  email           TEXT,
  ip              TEXT,
  user_agent      TEXT,
  success         BOOLEAN,
  message         TEXT,
  operator_email  TEXT,
  action          TEXT CHECK (action IN ('add', 'update', 'delete')),
  target_email    TEXT,
  target_name     TEXT,
  path            TEXT,
  menu_name       TEXT
);
CREATE INDEX idx_admin_logs_timestamp       ON admin_logs (timestamp);
CREATE INDEX idx_admin_logs_type            ON admin_logs (type);
CREATE INDEX idx_admin_logs_email           ON admin_logs (email);
CREATE INDEX idx_admin_logs_operator_email  ON admin_logs (operator_email);


-- ============================================================
-- 第 10 部分：聊天（chat schema）
-- ============================================================

DROP TABLE IF EXISTS chat.messages CASCADE;
DROP TABLE IF EXISTS chat.quick_replies CASCADE;
DROP TABLE IF EXISTS chat.conversations CASCADE;

CREATE TABLE chat.conversations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id        TEXT NOT NULL,
  customer_id    TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name  TEXT,
  agent_id       TEXT,
  status         TEXT DEFAULT 'pending',
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_conversations_agent
    FOREIGN KEY (agent_id) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE chat.messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL,
  sender_id        TEXT,
  sender_email     TEXT,
  sender_name      TEXT,
  content          TEXT,
  content_type     TEXT DEFAULT 'text',
  file_url         TEXT,
  is_read          BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chat.quick_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     TEXT NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_by  TEXT NOT NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_quick_replies_created_by
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE INDEX idx_conversations_site_id        ON chat.conversations(site_id);
CREATE INDEX idx_conversations_customer_id    ON chat.conversations(customer_id);
CREATE INDEX idx_conversations_customer_email ON chat.conversations(customer_email);
CREATE INDEX idx_conversations_status         ON chat.conversations(status);
CREATE INDEX idx_conversations_last_message   ON chat.conversations(last_message_at);
CREATE INDEX idx_messages_conversation_id     ON chat.messages(conversation_id);
CREATE INDEX idx_messages_created_at          ON chat.messages(created_at);
CREATE INDEX idx_messages_sender_type         ON chat.messages(sender_type);
CREATE INDEX idx_quick_replies_site_id        ON chat.quick_replies(site_id);
CREATE INDEX idx_quick_replies_created_by     ON chat.quick_replies(created_by);

ALTER TABLE chat.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat.messages REPLICA IDENTITY FULL;

GRANT USAGE ON SCHEMA chat TO authenticator, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA chat
  TO authenticator, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA chat
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES
  TO authenticator, anon, authenticated, service_role;

-- ============================================================
-- 第 11 部分：工具表
-- ============================================================

DROP TABLE IF EXISTS content_templates CASCADE;
CREATE TABLE content_templates (
  id          TEXT PRIMARY KEY,
  site_id     TEXT NOT NULL DEFAULT '000001',
  locale      TEXT NOT NULL,
  name        TEXT NOT NULL,
  content     TEXT NOT NULL,
  is_system   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_content_templates_site_locale ON content_templates(site_id, locale);
CREATE INDEX idx_content_templates_is_system   ON content_templates(is_system);
COMMENT ON TABLE content_templates IS '内容模板表';
COMMENT ON COLUMN content_templates.id IS '模板 ID，系统模板以 sys_ 开头，用户模板以 user_ 开头';
COMMENT ON COLUMN content_templates.is_system IS '是否为系统模板（true 时不可删除、不可修改）';

DROP TABLE IF EXISTS language_settings CASCADE;
CREATE TABLE language_settings (
    id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled           JSON NOT NULL,
    default_language  TEXT NOT NULL DEFAULT 'zh',
    updated_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE IF EXISTS cache_versions CASCADE;
CREATE TABLE cache_versions (
  key         TEXT PRIMARY KEY,
  version     BIGINT NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cache_versions_updated_at ON cache_versions (updated_at DESC);
CREATE INDEX idx_cache_versions_key_prefix ON cache_versions (key text_pattern_ops);

CREATE OR REPLACE FUNCTION increment_cache_version(p_key TEXT)
RETURNS BIGINT AS $$
DECLARE
  new_version BIGINT;
BEGIN
  UPDATE cache_versions
  SET version = version + 1, updated_at = NOW()
  WHERE key = p_key
  RETURNING version INTO new_version;

  IF new_version IS NULL THEN
    INSERT INTO cache_versions (key, version, updated_at)
    VALUES (p_key, 1, NOW())
    RETURNING version INTO new_version;
  END IF;

  RETURN new_version;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_cache_versions_bulk(p_keys TEXT[])
RETURNS VOID AS $$
BEGIN
  UPDATE cache_versions
  SET version = version + 1, updated_at = NOW()
  WHERE key = ANY(p_keys);

  INSERT INTO cache_versions (key, version, updated_at)
  SELECT k, 1, NOW()
  FROM unnest(p_keys) AS k
  WHERE NOT EXISTS (
    SELECT 1 FROM cache_versions WHERE cache_versions.key = k
  );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_cache_versions_by_prefix(p_prefix TEXT)
RETURNS BIGINT AS $$
DECLARE
  affected BIGINT;
BEGIN
  UPDATE cache_versions
  SET version = version + 1, updated_at = NOW()
  WHERE key LIKE p_prefix || '%';

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_cache_versions(p_days INT DEFAULT 30)
RETURNS BIGINT AS $$
DECLARE
  deleted BIGINT;
BEGIN
  DELETE FROM cache_versions
  WHERE updated_at < NOW() - (p_days || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- 第 12 部分：初始化数据
-- ============================================================

-- 12.1 默认租户和站点
INSERT INTO tenants (tenant_id, name)
VALUES ('tenant_default', 'Default Tenant')
ON CONFLICT (tenant_id) DO NOTHING;

INSERT INTO sites (site_id, tenant_id, name, default_locale)
VALUES ('000001', 'tenant_default', 'Default Site', 'en')
ON CONFLICT (site_id) DO NOTHING;

-- 12.2 默认文件分类
INSERT INTO file_categories (id, site_id, name, slug, "order", description)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '000001',
  '未分类',
  'uncategorized',
  0,
  '系统默认分类，存放尚未分类的文件'
) ON CONFLICT (id) DO NOTHING;

-- 12.3 默认语言设置
INSERT INTO language_settings (enabled, default_language)
VALUES (
    (SELECT json_object_agg(code, true) FROM unnest(ARRAY[
        'en','zh','es','de','ja','fr','ar','ko','pt','it',
        'nl','pl','ru','tr','id','vi','th','he','sv','no',
        'da','fi','el','cs','hu','ro','bg','hr','sk','sl',
        'lt','lv','et','ms','hi','ta','uk','sr','mk','sq',
        'ca','eu'
    ]) AS code),
    'zh'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 12.4 默认 SEO 策略（全局，site_id = NULL）
-- ============================================================
-- ⚠️ 这 14 条策略的 JSON 内容与你原脚本完全一致，此处从略。
--    请从你原脚本的 "INSERT INTO seo_strategies ... ON CONFLICT ..." 那一整段粘贴过来。
--    注意：由于新脚本用了部分唯一索引，ON CONFLICT 语法要改成：
--
--    INSERT INTO seo_strategies (site_id, page_type, label, fields) VALUES
--      (NULL, 'home', '首页', '{...}'),
--      ... 13 more ...
--    ON CONFLICT ("page_type") WHERE "site_id" IS NULL DO NOTHING;
--
--    或者更简单（推荐）：DELETE 后直接 INSERT：
--
--    DELETE FROM seo_strategies WHERE site_id IS NULL;
--    INSERT INTO seo_strategies (site_id, page_type, label, fields) VALUES
--      (NULL, 'home', '首页', '{...}'),
--      ... 13 more ...;

DELETE FROM "seo_strategies" WHERE "site_id" IS NULL;

INSERT INTO "seo_strategies" ("site_id", "page_type", "label", "fields") VALUES
(
    NULL, 
    'home', 
    '首页', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为{site_name}的首页生成SEO标题。\n\n【品牌信息】\n品牌名称：{brand_name}\n目标受众：{target_audience}\n核心价值观：{core_values}\n\n【SEO标题规则】\n1. 核心关键词必须前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 格式：核心词 + 品牌名 + 核心卖点\n4. 标题必须与首页内容主题匹配\n5. 禁止关键词堆砌\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为{site_name}的首页生成SEO描述。\n\n【品牌信息】\n品牌名称：{brand_name}\n目标受众：{target_audience}\n核心价值观：{core_values}\n\n【SEO描述规则】\n1. 必须包含核心关键词\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA），如\"立即了解\"、\"探索更多\"\n5. 描述必须与首页内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为首页页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n核心关键词参考：{analyzed_keywords}\n\n【要求】\n1. 关键词必须精准反映首页核心主题\n2. 包含品牌名、核心业务词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'product', 
    '产品', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品页面生成SEO标题。\n\n【产品信息】\n产品名称：{page_title}\n品牌：{brand_name}\n核心关键词：{analyzed_keywords}\n内容摘要：{analyzed_summary}\n\n【SEO标题规则】\n1. 核心关键词必须出现在标题中，且尽量前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 格式：核心关键词 + 品牌名 + 核心卖点\n4. 标题必须与产品内容匹配\n5. 禁止关键词堆砌\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品页面生成SEO描述。\n\n【产品信息】\n产品名称：{page_title}\n品牌：{brand_name}\n核心关键词：{analyzed_keywords}\n内容摘要：{analyzed_summary}\n\n【SEO描述规则】\n1. 必须包含核心关键词\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA），如\"立即购买\"、\"了解更多\"、\"获取报价\"\n5. 突出产品核心卖点和应用场景\n6. 描述必须与产品内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为产品页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【产品信息】\n产品名称：{page_title}\n品牌：{brand_name}\n核心关键词参考：{analyzed_keywords}\n\n【要求】\n1. 关键词必须精准反映产品核心特征\n2. 包含品牌名、产品名、核心规格\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'productLine', 
    '产品线落地页', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品线页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n核心关键词：{analyzed_keywords}\n\n【SEO标题规则】\n1. 核心关键词前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 突出产品线品类和品牌优势\n4. 标题必须与产品线内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品线页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n内容摘要：{analyzed_summary}\n\n【SEO描述规则】\n1. 包含核心关键词\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 概括产品线整体特点和适用领域\n6. 描述必须与产品线内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为产品线页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n核心关键词参考：{analyzed_keywords}\n\n【要求】\n1. 关键词必须精准反映产品线主题\n2. 包含品牌名、品类词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'productCollection', 
    '产品合集', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品合集页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n核心关键词：{analyzed_keywords}\n\n【SEO标题规则】\n1. 核心关键词前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 突出合集主题和产品数量\n4. 标题必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下产品合集页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n内容摘要：{analyzed_summary}\n\n【SEO描述规则】\n1. 包含核心关键词\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 概括合集覆盖的产品范围\n6. 描述必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为产品合集页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n核心关键词参考：{analyzed_keywords}\n\n【要求】\n1. 关键词必须精准反映合集主题\n2. 包含品牌名、合集主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'page', 
    '页面', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含页面核心主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与页面内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 概括页面主要内容\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与页面内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为普通页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映页面核心主题\n2. 包含品牌名、页面主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'blogPost', 
    '博客文章', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下博客文章生成SEO标题。\n\n【文章信息】\n文章标题：{page_title}\n核心关键词：{analyzed_keywords}\n内容摘要：{analyzed_summary}\n\n【SEO标题规则】\n1. 核心关键词前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 使用吸引点击的词语\n4. 标题必须与文章内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下博客文章生成SEO描述。\n\n【文章信息】\n文章标题：{page_title}\n核心关键词：{analyzed_keywords}\n内容摘要：{analyzed_summary}\n\n【SEO描述规则】\n1. 包含核心关键词\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA），如\"阅读全文\"、\"了解更多\"\n5. 概括文章核心价值，激发读者点击兴趣\n6. 描述必须与文章内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为博客文章生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【文章信息】\n文章标题：{page_title}\n核心关键词参考：{analyzed_keywords}\n\n【要求】\n1. 关键词必须精准反映文章主题\n2. 包含文章核心话题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'blog', 
    '博客落地页', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为博客落地页生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含博客主题关键词\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与博客内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为博客落地页生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO描述规则】\n1. 概括博客内容方向\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与博客内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为博客落地页生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映博客整体主题\n2. 包含品牌名、博客主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'blogCategory', 
    '博客合集', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为博客合集页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n核心关键词：{analyzed_keywords}\n\n【SEO标题规则】\n1. 核心关键词前置\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为博客合集页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 概括合集主题\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为博客合集页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n\n【要求】\n1. 关键词必须精准反映合集主题\n2. 包含合集主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'doc', 
    '文档', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下文档页面生成SEO标题。\n\n【文档信息】\n文档标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含文档核心主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与文档内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下文档页面生成SEO描述。\n\n【文档信息】\n文档标题：{page_title}\n\n【SEO描述规则】\n1. 概括文档内容\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与文档内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为文档页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【文档信息】\n文档标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映文档主题\n2. 包含品牌名、文档主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'docLibrary', 
    '文档库', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为文档库页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含文档库主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与文档库内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为文档库页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 概括文档库内容\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与文档库内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为文档库页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映文档库主题\n2. 包含品牌名、文档库主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'video', 
    '视频', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下视频页面生成SEO标题。\n\n【视频信息】\n视频标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含视频主题关键词\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与视频内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为以下视频页面生成SEO描述。\n\n【视频信息】\n视频标题：{page_title}\n\n【SEO描述规则】\n1. 概括视频内容\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA），如\"观看视频\"、\"立即播放\"\n5. 描述必须与视频内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为视频页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【视频信息】\n视频标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映视频主题\n2. 包含品牌名、视频主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'videoCategory', 
    '视频合集', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 30,
        "maxLength": 60,
        "promptTemplate": "你是一位专业的SEO文案专家。请为视频合集页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含合集主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 80,
        "maxLength": 160,
        "promptTemplate": "你是一位专业的SEO文案专家。请为视频合集页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 概括合集主题\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与合集内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为视频合集页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映合集主题\n2. 包含品牌名、合集主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'inquiry', 
    '询盘', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 25,
        "maxLength": 50,
        "promptTemplate": "你是一位专业的SEO文案专家。请为询盘页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含询盘/联系主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与询盘页面内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 60,
        "maxLength": 140,
        "promptTemplate": "你是一位专业的SEO文案专家。请为询盘页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 引导用户联系询盘\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA），如\"立即咨询\"、\"获取报价\"\n5. 描述必须与询盘页面内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为询盘页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映询盘主题\n2. 包含品牌名、询盘/联系主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
),
(
    NULL, 
    'policy', 
    '政策', 
    '{
      "seo_title": {
        "enabled": true,
        "required": true,
        "minLength": 25,
        "maxLength": 50,
        "promptTemplate": "你是一位专业的SEO文案专家。请为政策页面生成SEO标题。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【SEO标题规则】\n1. 包含政策主题\n2. 标题长度控制在{minLength}-{maxLength}个字符之间\n3. 标题必须与政策内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回标题文本。"
      },
      "seo_description": {
        "enabled": true,
        "required": true,
        "minLength": 60,
        "maxLength": 140,
        "promptTemplate": "你是一位专业的SEO文案专家。请为政策页面生成SEO描述。\n\n【页面信息】\n页面标题：{page_title}\n\n【SEO描述规则】\n1. 概括政策内容\n2. 长度控制在{minLength}-{maxLength}个字符之间\n3. 使用通顺、吸引人的完整句子\n4. 必须包含行动号召（CTA）\n5. 描述必须与政策内容匹配\n\n【输出要求】\n使用{target_language}语言输出，只返回描述文本。"
      },
      "seo_keywords": {
        "enabled": true,
        "required": false,
        "minCount": 1,
        "maxCount": 5,
        "promptTemplate": "你是一位专业的SEO关键词研究员。请为政策页面生成{minCount}-{maxCount}个精准的SEO关键词。\n\n【页面信息】\n页面标题：{page_title}\n品牌：{brand_name}\n\n【要求】\n1. 关键词必须精准反映政策主题\n2. 包含品牌名、政策主题词\n3. 关键词之间用英文逗号分隔\n4. 使用{target_language}语言\n5. 只返回关键词列表，不要包含任何额外说明"
      }
    }'
)

-- ============================================================
-- 12.5 默认管理员
-- ============================================================
INSERT INTO admin_users (id, email, name, "englishName", "passwordHash", "mustChangePassword", role, site_id)
SELECT
  '1',
  'admin@admin.com',
  '超级管理员',
  'Admin',
  '$2b$10$yDBubqffAuScFmQGQbw13uhqR4xrQ1j4scKcrihvzgfvv5AyLtm.S',
  false,
  'super',
  '000001'
WHERE NOT EXISTS (SELECT 1 FROM admin_users LIMIT 1);

-- ============================================================
-- 12.6 默认支付账户（2 条 T/T）
-- ============================================================
INSERT INTO payment_accounts (
    site_id, account_type, payment_type, payment_method,
    display_name_zh, display_name_en, currency,
    beneficiary_name, beneficiary_account, swift_code, country_region,
    beneficiary_address, beneficiary_bank, beneficiary_bank_address,
    bank_code, branch_code, attention,
    is_active, is_default, sort_order
) VALUES (
    '000001', 'global', 'bank_transfer', 'tt',
    '中国香港(花旗)', 'Hong Kong, China (CITI)', '["USD", "EUR", "HKD"]',
    'Shenzhen Feisman Technology Co., Ltd.', '3974000005387', 'CITIHKHX', 'Hong Kong',
    '20/F, TOWER ONE, TIMES SQUARE, 1 MATHESON STREET, CAUSEWAY BAY, HONG KONG',
    'CITIBANK N.A.HONG KONG BRANCH',
    'Champion Tower THREE Garden ROAD CENTRAL, HONG KONG',
    '006', '391',
    'Please pay attention to fill in the correct Beneficiary Account Number...',
    true, true, 1
) ON CONFLICT DO NOTHING;

INSERT INTO payment_accounts (
    site_id, account_type, payment_type, payment_method,
    display_name_zh, display_name_en, currency,
    beneficiary_name, beneficiary_account, swift_code, country_region,
    beneficiary_address, beneficiary_bank, beneficiary_bank_address,
    bank_code, branch_code,
    is_active, is_default, sort_order
) VALUES (
    '000001', 'global', 'bank_transfer', 'tt',
    '新加坡(摩根)', 'Singapore (JPM)', '["USD", "SGD"]',
    'ABC Trading Company Limited', '1234567890', 'CHASSGSG', 'Singapore',
    '8 Marina View, #12-01, Asia Square Tower 1, Singapore 018960',
    'JPMORGAN CHASE BANK, N.A., SINGAPORE BRANCH',
    '8 Marina View, #12-01, Asia Square Tower 1, Singapore 018960',
    '', '',
    true, false, 2
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 12.7 默认承运商（16 条）
-- ============================================================
INSERT INTO carriers (site_id, key, name_en, name_cn, name_hk, url, shipping_methods, logo, sort_order, is_active) VALUES
('000001', 'dhl',        'DHL Express',      '中外运敦豪',     'DHL',       'https://www.dhl.com',           '["快递", "空运"]', '/share/carriers/dhl.png',        1, true),
('000001', 'fedex',      'FedEx',            '联邦快递',       'FedEx',     'https://www.fedex.com',         '["快递", "空运"]', '/share/carriers/fedex.png',      2, true),
('000001', 'ups',        'UPS',              '联合包裹',       'UPS',       'https://www.ups.com',           '["快递", "空运"]', '/share/carriers/ups.png',        3, true),
('000001', 'tnt',        'TNT Express',      '天地快运',       'TNT',       'https://www.tnt.com',           '["快递", "空运"]', '/share/carriers/tnt.png',        4, true),
('000001', 'ems',        'EMS',              '中国邮政速递物流', 'EMS',     'https://www.ems.com.cn',        '["快递", "邮政"]', '/share/carriers/ems.png',        5, true),
('000001', 'sf',         'SF Express',       '顺丰速运',       '順豐速運',   'https://www.sf-express.com',    '["快递"]',         '/share/carriers/sf.png',         6, true),
('000001', 'yt',         'YTO Express',      '圆通速递',       '圓通速遞',   'https://www.yto.net.cn',        '["快递"]',         '/share/carriers/yto.png',        7, true),
('000001', 'sto',        'STO Express',      '申通快递',       '申通快遞',   'https://www.sto.cn',            '["快递"]',         '/share/carriers/sto.png',        8, true),
('000001', 'zto',        'ZTO Express',      '中通快递',       '中通快遞',   'https://www.zto.com',           '["快递"]',         '/share/carriers/zto.png',        9, true),
('000001', 'yunda',      'Yunda Express',    '韵达快递',       '韻達快遞',   'https://www.yundaex.com',       '["快递"]',         '/share/carriers/yunda.png',     10, true),
('000001', 'maersk',     'Maersk',           '马士基航运',     '馬士基航運', 'https://www.maersk.com',        '["海运"]',         '/share/carriers/maersk.png',    11, true),
('000001', 'msc',        'MSC',              '地中海航运',     '地中海航運', 'https://www.msc.com',           '["海运"]',         '/share/carriers/msc.png',       12, true),
('000001', 'cma',        'CMA CGM',          '达飞轮船',       '達飛輪船',   'https://www.cma-cgm.com',       '["海运"]',         '/share/carriers/cma.png',       13, true),
('000001', 'cosco',      'COSCO Shipping',   '中远海运',       '中遠海運',   'https://www.coscoshipping.com', '["海运"]',         '/share/carriers/cosco.png',     14, true),
('000001', 'china_post', 'China Post',       '中国邮政',       '中國郵政',   'https://www.chinapost.com.cn',  '["邮政"]',         '/share/carriers/china_post.png',15, true),
('000001', 'others',     'Others',           '其他',           '其他',       '',                              '["快递", "空运", "海运", "陆运", "邮政", "多式联运"]', '', 99, true)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 12.8 默认法律条款模板
-- ============================================================
INSERT INTO legal_templates (name, content, is_default, sort_order) VALUES
(
    '标准条款',
    '1. 付款方式：买方应在收到形式发票后3个工作日内支付全部款项。\n2. 交货时间：卖方应在收到预付款后15个工作日内安排发货。\n3. 质量标准：产品应符合双方确认的样品及规格书要求。\n4. 售后服务：卖方提供12个月的质量保证期。\n5. 争议解决：双方应友好协商解决争议，协商不成的，提交深圳国际仲裁院仲裁。',
    TRUE, 1
),
(
    '贸易条款',
    '1. 贸易术语：FOB Shenzhen\n2. 付款方式：30%预付款 + 70%尾款（发货前付清）\n3. 包装要求：标准出口包装，适合海运\n4. 文件要求：商业发票、装箱单、原产地证、提单\n5. 保险：由买方自行投保',
    FALSE, 2
);

-- ============================================================
-- 12.9 默认缓存版本
-- ============================================================
INSERT INTO cache_versions (key, version) VALUES ('pages', 1)
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 12.10 site_pages 初始化（✅ 新脚本补充，旧脚本有，必须补）
-- ============================================================

-- 12.10.1 布局模板
WITH layouts (id, title, type, template) AS (
  VALUES
    -- 产品相关
    ('product_layout', '产品详情页布局', 'product', 'default_product_published'),
    ('product_category_layout', '产品分类页布局', 'product_category', 'default_product_category_published'),
    ('product_line_layout', '产品线页布局', 'product_line', 'default_product_line_published'),
    ('product_line_PSU_layout', '工业电源产品线布局', 'product_line', 'default_product_line_psu_published'),
    -- 文档相关
    ('document_layout', '文档详情页布局', 'document', 'default_document_published'),
    ('document_library_layout', '文档库页布局', 'document_library', 'default_document_library_published'),
    -- 博客相关
    ('blog_layout', '博客列表页布局', 'blog', 'default_blog_published'),
    ('blog_post_layout', '博客详情页布局', 'blog_post', 'default_blog_post_published'),
    ('news_layout', '新闻频道布局', 'blog_collection', 'default_news_published'),
    -- 视频相关
    ('video_category_layout', '视频分类页布局', 'video_category', 'default_video_category_published'),
    ('video_layout', '视频详情页布局', 'video', 'default_video_published')
)
INSERT INTO site_pages (
    site_id, id, locale, title, type, preset, visible,
    template, template_data, template_hash, slug, created_at, updated_at
)
SELECT
    '000001', id, 'base', title, type, true, 'visible',
    template, NULL, NULL, id, NOW(), NOW()
FROM layouts
ON CONFLICT (site_id, id, locale) DO NOTHING;

-- 12.10.2 首页记录（zh / en）
WITH home_pages (locale, title, slug) AS (
  VALUES
    ('zh', '首页', 'home'),
    ('en', 'Home', 'home')
)
INSERT INTO site_pages (
    site_id, id, locale, title, type, preset, visible,
    template, template_data, template_hash, slug, created_at, updated_at
)
SELECT
    '000001', '10000001', locale, title, 'home', true, 'visible',
    'default_homepage_published', NULL, NULL, slug, NOW(), NOW()
FROM home_pages
ON CONFLICT (site_id, id, locale) DO NOTHING;

-- ============================================================
-- 完成
-- ============================================================
-- 脚本执行完毕。
-- 注意：seo_strategies 的 14 条默认策略请从原脚本粘贴（见 12.4 注释）。
-- ============================================================