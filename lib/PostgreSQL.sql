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
DROP TABLE IF EXISTS "products" CASCADE;
CREATE TABLE IF NOT EXISTS "products" (
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
    -- ========== 新增同步字段 ==========
    "source_locale"        TEXT,                     -- 来源语言（如 'en'）
    "source_product_id"    TEXT,                     -- 源产品ID（用于追溯）
    "source_content_hash"  TEXT,                     -- 源内容的哈希（用于判断变更）
    "last_sync_time"       TEXT,                     -- 最后同步时间（ISO字符串）
    "last_sync_operator"   TEXT,                     -- 操作人
    -- =====================================
    -- 全文搜索向量列（自动生成）
    "search_vector"        TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(product_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(sku, '')), 'B')
    ) STORED,
    PRIMARY KEY ("site_id", "productId", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- 原有索引
CREATE INDEX IF NOT EXISTS "idx_products_site_locale"          ON "products" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_products_site_productLine"    ON "products" ("site_id", "productLineId");
CREATE INDEX IF NOT EXISTS "idx_products_site_category"       ON "products" ("site_id", "categoryId");
CREATE INDEX IF NOT EXISTS "idx_products_site_parent"         ON "products" ("site_id", "parent_product_id");
CREATE INDEX IF NOT EXISTS "idx_products_site_status"         ON "products" ("site_id", "status");
CREATE INDEX IF NOT EXISTS "idx_products_site_updated"        ON "products" ("site_id", "updatedAt");

-- 复合索引
CREATE INDEX IF NOT EXISTS "idx_products_list" ON "products" 
    ("site_id", "locale", "parent_product_id", "status", "categoryId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_products_uncategorized" ON "products" 
    ("site_id", "locale", "categoryId") WHERE "categoryId" = '__UNCATEGORIZED__';

CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku");
CREATE INDEX IF NOT EXISTS "idx_products_parent_id" ON "products" ("parent_product_id");

CREATE INDEX IF NOT EXISTS "idx_products_lookup" 
ON "products" ("site_id", "locale", "productId");

-- ========== 新增：针对 searchProducts 的复合索引 ==========
-- 1. status='all' 时的通用查询（无 status 过滤，有 categoryId）
CREATE INDEX IF NOT EXISTS "idx_products_search_all" ON "products" 
    ("site_id", "locale", "parent_product_id", "categoryId", "updatedAt" DESC);

-- 2. 带 seriesId 的查询
CREATE INDEX IF NOT EXISTS "idx_products_search_series" ON "products" 
    ("site_id", "locale", "parent_product_id", "categoryId", "seriesId", "updatedAt" DESC);

-- 3. 带 status 的查询
CREATE INDEX IF NOT EXISTS "idx_products_search_status" ON "products" 
    ("site_id", "locale", "parent_product_id", "status", "categoryId", "updatedAt" DESC);

-- 4. 无 categoryId、无 seriesId、无 status 的通用列表（可选但推荐）
CREATE INDEX IF NOT EXISTS "idx_products_search_basic" ON "products" 
    ("site_id", "locale", "parent_product_id", "updatedAt" DESC);
-- ============================================================

-- 全文搜索 GIN 索引
CREATE INDEX IF NOT EXISTS "idx_products_search_vector" ON "products" USING GIN ("search_vector");

-- ========== 新增：同步状态查询索引 ==========
CREATE INDEX IF NOT EXISTS "idx_products_source" ON "products" ("source_locale", "source_product_id");

-- （可选）如果需要唯一 SKU 约束，可启用：
-- CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_sku_site_locale" ON "products" ("site_id", "locale", "sku");

-- ========== 产品保存异步任务表 ==========
CREATE TABLE IF NOT EXISTS product_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_product_tasks_status ON product_tasks(status);
CREATE INDEX IF NOT EXISTS idx_product_tasks_created_at ON product_tasks(created_at);

-- ========== 产品价格表（内部价格，非销售价格） ==========
CREATE TABLE product_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model TEXT NOT NULL UNIQUE,
    product_line TEXT,                          -- 产品线
    moq INTEGER,                                -- 最小起订量（整数）
    lpp_price NUMERIC(10,4),
    pp_price NUMERIC(10,4),
    exchange_rate NUMERIC(10,6),
    price_moq_20 NUMERIC(10,4),
    price_moq_100 NUMERIC(10,4),
    price_moq_500 NUMERIC(10,4),
    price_A NUMERIC(10,4),
    price_B NUMERIC(10,4),
    parent_model TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);


-- 索引（可按需添加）
CREATE INDEX idx_product_prices_model ON product_prices(model);
CREATE INDEX idx_product_prices_parent_model ON product_prices(parent_model);
CREATE INDEX idx_product_prices_product_line ON product_prices(product_line);
CREATE INDEX idx_product_prices_moq ON product_prices(moq);


-- ========== 产品价格表同步到Product表 ==========

UPDATE products p
SET 
    price_tiers = (
        SELECT jsonb_build_array(
            jsonb_build_object('min_qty', 20, 'max_qty', NULL, 'price', pp.price_moq_20),
            jsonb_build_object('min_qty', 100, 'max_qty', NULL, 'price', pp.price_moq_100),
            jsonb_build_object('min_qty', 500, 'max_qty', NULL, 'price', pp.price_moq_500)
        )
        FROM product_prices pp
        WHERE pp.model = p.sku
    ),
    min_order_quantity = 20
WHERE EXISTS (
    SELECT 1 FROM product_prices pp WHERE pp.model = p.sku
);

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


-- ============================================================
-- 文件名: 01_create_site_pages.sql
-- 用途: 全新建库时执行，包含表结构 + 索引 + 初始化数据
-- ============================================================

-- ========== 1. 网站页面表（复合主键，包含 template_hash） ==========
DROP TABLE IF EXISTS site_pages CASCADE;

CREATE TABLE site_pages (
  site_id          TEXT NOT NULL,
  id               TEXT NOT NULL,
  locale           TEXT NOT NULL,
  title            TEXT NOT NULL,
  type             TEXT,
  preset           BOOLEAN DEFAULT FALSE,
  visible          TEXT DEFAULT 'visible',
  template         TEXT,                       -- 关联的模板 ID
  template_hash    TEXT,                       -- 当前嵌入的模板数据哈希（用于快速比对版本）
  slug             TEXT NOT NULL,
  seo_keywords     TEXT,
  seo_title        TEXT,
  seo_description  TEXT,
  content          TEXT,
  template_data    JSONB,                      -- 嵌入的模板数据（完整 Puck 数据）
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (site_id, id, locale)
);

-- ========== 2. 索引 ==========

-- 唯一约束：同一站点、同一语言下 slug 唯一
CREATE UNIQUE INDEX idx_site_pages_site_locale_slug 
ON site_pages (site_id, locale, slug);

-- 索引：通过模板 ID 查找所有引用页面（模板同步时使用）
CREATE INDEX idx_site_pages_template 
ON site_pages (site_id, template);

-- 索引：按模板哈希查询（用于快速比对）
CREATE INDEX idx_site_pages_template_hash 
ON site_pages (template_hash);

-- 索引：按 site_id + locale + type 组合查询（加速固定页面布局查找）
CREATE INDEX idx_site_pages_site_locale_type 
ON site_pages (site_id, locale, type);

-- 说明：以下索引已删除，因为它们被主键或上面的索引覆盖：
-- idx_site_pages_locale  → 主键 (site_id, id, locale) 已覆盖
-- idx_site_pages_type    → idx_site_pages_site_locale_type 已覆盖


-- ========== 3. 初始化固定布局记录（仅 LAYOUT_CATEGORIES） ==========
-- 说明：
--   1. 仅初始化需要"共享布局"的分类（product / blog / document 等）
--   2. template_data 和 template_hash 初始为 NULL，等模板发布时由 syncTemplateToPages 填充
--   3. home / custom / page / policy 等"实例页面"不在此初始化，它们使用页面自身的 ID

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
    site_id,
    id,
    locale,
    title,
    type,
    preset,
    visible,
    template,
    template_data,      -- ✅ 初始为 NULL
    template_hash,      -- ✅ 初始为 NULL
    slug,
    created_at,
    updated_at
)
SELECT
    '000001',
    id,
    'base',
    title,
    type,
    true,
    'visible',
    template,
    NULL,               -- ✅ 初始为 NULL，等模板发布时填充
    NULL,               -- ✅ 初始为 NULL
    id,
    NOW(),
    NOW()
FROM layouts
ON CONFLICT (site_id, id, locale) DO NOTHING;


-- ========== 4. 初始化首页记录（zh / en 两个站点） ==========
-- 说明：
--   home 是"实例页面"，不是"布局类型"，使用页面自身的 ID（10000001）
--   每个语言一条记录，通过 locale 区分

WITH home_pages (locale, title, slug) AS (
  VALUES
    ('zh', '首页', 'home'),
    ('en', 'Home', 'home')
)
INSERT INTO site_pages (
    site_id,
    id,
    locale,
    title,
    type,
    preset,
    visible,
    template,
    template_data,
    template_hash,
    slug,
    created_at,
    updated_at
)
SELECT
    '000001',
    '10000001',             -- ✅ home 使用固定 ID
    locale,
    title,
    'home',
    true,                   -- preset = true，防止误删
    'visible',
    'default_homepage_published',  -- 关联首页模板
    NULL,                   -- ✅ 初始为 NULL
    NULL,
    slug,
    NOW(),
    NOW()
FROM home_pages
ON CONFLICT (site_id, id, locale) DO NOTHING;


-- ========== 5. 注释说明 ==========

COMMENT ON TABLE site_pages IS '网站页面表 - 存储所有页面的元数据、SEO 和布局配置';
COMMENT ON COLUMN site_pages.locale IS '语言代码（如 en/zh/base），base 表示全局布局模板（不区分语言）';
COMMENT ON COLUMN site_pages.type IS '页面类型: page | product | product_category | product_line | document | document_library | blog | blog_post | blog_collection | video_category | video | home | custom | policy';
COMMENT ON COLUMN site_pages.preset IS '是否为系统预设页面（true 时不可删除）';
COMMENT ON COLUMN site_pages.template IS '关联的模板 ID（来自 webbuilder/templates）';
COMMENT ON COLUMN site_pages.template_hash IS '当前嵌入模板数据的哈希值，用于快速比对版本变化';
COMMENT ON COLUMN site_pages.template_data IS '完整的 Puck 布局数据（JSONB），存储页面组件的完整配置';


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
    PRIMARY KEY ("site_id", "id", "locale"),  -- 修改为三字段复合主键
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale" ON "blog_posts" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale_slug" ON "blog_posts" ("site_id", "locale", "slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_locale_title" ON "blog_posts" ("site_id", "locale", "title");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_category" ON "blog_posts" ("site_id", "category_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_visibility" ON "blog_posts" ("site_id", "visibility");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_site_updated" ON "blog_posts" ("site_id", "updated_at");


-- ========== 文档表 ==========
-- 文档主表，存储所有元数据和排序/层级信息
-- site_id 无默认值，由应用代码在插入/查询时显式指定
CREATE TABLE IF NOT EXISTS "documents" (
    "site_id"         TEXT NOT NULL,
    "id"              TEXT NOT NULL,
    "lib_id"          TEXT NOT NULL,
    "locale"          TEXT NOT NULL,
    "title"           TEXT NOT NULL,
    "slug"            TEXT NOT NULL,
    "parent_id"       TEXT,                -- 父级文档 ID，NULL 表示一级
    "order_index"     INTEGER NOT NULL,
    "file"            TEXT NOT NULL,        -- Markdown 文件名
    "template_id"     TEXT,
    "seo_title"       TEXT,
    "seo_description" TEXT,
    "seo_keywords"    TEXT,
    "created_at"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    "updated_at"      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY ("site_id", "id", "locale")
);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_documents_lib_locale" ON "documents" ("lib_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_documents_parent" ON "documents" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_documents_site" ON "documents" ("site_id");

-- 可选唯一约束（如需 slug 唯一）
-- CREATE UNIQUE INDEX IF NOT EXISTS "idx_documents_lib_locale_slug" ON "documents" ("lib_id", "locale", "slug");


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
    PRIMARY KEY ("site_id", "id", "locale"),  -- 修改为三字段复合主键，支持相同 id 不同 locale
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_videos_site_locale" ON "videos" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_videos_site_category" ON "videos" ("site_id", "category_key");
CREATE INDEX IF NOT EXISTS "idx_videos_site_title" ON "videos" ("site_id", "title");
CREATE INDEX IF NOT EXISTS "idx_videos_site_visible" ON "videos" ("site_id", "visible");



-- ============================================================
-- 1. 客户表（整合 CRM + 客户认证）
-- ============================================================
DROP TABLE IF EXISTS "customers" CASCADE;
CREATE TABLE "customers" (
    "site_id"          TEXT NOT NULL,
    "id"               TEXT NOT NULL,
    -- 用户信息
    "first_name"       TEXT DEFAULT '',
    "last_name"        TEXT DEFAULT '',
    "name"             TEXT DEFAULT '',                -- 别名/全名，管理员专用
    "country"          TEXT DEFAULT '',                -- 国家名称（兼容旧数据，未来废弃）
    "country_code"     TEXT DEFAULT '',                -- ISO 国家代码（主要字段）
    "email"            TEXT NOT NULL DEFAULT '',
    "phone"            TEXT DEFAULT '',
    "whatsapp"         TEXT DEFAULT '',
    "company_name"     TEXT DEFAULT '',
    "address"          TEXT DEFAULT '',                -- 默认地址（兼容旧字段）
    -- 认证相关
    "email_verified"   BOOLEAN DEFAULT FALSE,
    "last_login"       TIMESTAMP,
    "password_hash"    TEXT DEFAULT '',                -- 可选
    "auth_uid"         UUID,                           -- Supabase Auth 用户 ID（关联 auth.users）
    "role"             TEXT DEFAULT 'customer',        -- 'customer' 或 'admin'
    -- CRM 原有字段
    "stage"            TEXT,
    "importance"       INTEGER,
    "scale"            TEXT,
    "notes"            TEXT DEFAULT '',
    "website"          TEXT DEFAULT '',
    "flag"             TEXT DEFAULT '',
    "email_subscribed" TEXT DEFAULT '未订阅',
    -- 新增：客户来源（必填）
    "source"           TEXT NOT NULL,                  -- 'manual'、'register' 或 'anonymous'
    -- 时间戳
    "created_at"       TIMESTAMP DEFAULT NOW(),
    "updated_at"       TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY ("site_id", "id")
);

-- 普通索引
CREATE INDEX "idx_customers_site_email" ON "customers" ("site_id", "email");
CREATE INDEX "idx_customers_site_company" ON "customers" ("site_id", "company_name");
CREATE INDEX "idx_customers_site_stage" ON "customers" ("site_id", "stage");
CREATE INDEX "idx_customers_site_created" ON "customers" ("site_id", "created_at");
CREATE INDEX "idx_customers_auth_uid" ON "customers" ("auth_uid");  -- 关联 Supabase Auth

-- 唯一约束：同一站点下，同一邮箱 + 同一来源只能有一条记录
CREATE UNIQUE INDEX "idx_customers_site_email_source" ON "customers" ("site_id", "email", "source");



-- ============================================================
-- 2. 地址表（每个客户支持多个地址）
-- ============================================================
DROP TABLE IF EXISTS "addresses" CASCADE;
CREATE TABLE "addresses" (
    "id"             SERIAL PRIMARY KEY,
    "site_id"        TEXT NOT NULL,
    "customer_id"    TEXT NOT NULL,
    "recipient"      TEXT NOT NULL,           -- 收货人全名（由 first_name + last_name 合并）
    "phone"          TEXT NOT NULL,           -- 完整电话号码（含区号，如 '+86 13800138000'）
    "country_code"   TEXT NOT NULL,           -- ISO 国家代码
    "company"        TEXT DEFAULT '',         -- 公司名称（新增）
    "province"       TEXT DEFAULT '',
    "city"           TEXT DEFAULT '',
    "district"       TEXT DEFAULT '',          -- 区/县
    "detail"         TEXT NOT NULL,           -- 详细地址（含公寓/门牌）
    "is_default"     BOOLEAN DEFAULT FALSE,
    "created_at"     TIMESTAMP DEFAULT NOW(),
    "updated_at"     TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY ("site_id", "customer_id") REFERENCES "customers" ("site_id", "id") ON DELETE CASCADE
);

CREATE INDEX "idx_addresses_site_customer" ON "addresses" ("site_id", "customer_id");
CREATE INDEX "idx_addresses_site_default" ON "addresses" ("site_id", "is_default");

-- ============================================================
-- 2. 询盘表（主表）
-- ============================================================
DROP TABLE IF EXISTS "inquiries" CASCADE;
CREATE TABLE "inquiries" (
    "id"                SERIAL PRIMARY KEY,
    "site_id"           TEXT NOT NULL,
    
    -- 询盘编号（6位数字，由应用生成并保证唯一）
    "inquiry_number"    TEXT NOT NULL UNIQUE,
    
    -- 关联客户（外键：直接使用 site_id + customer_id 引用 customers 表）
    "customer_id"       TEXT,
    FOREIGN KEY ("site_id", "customer_id") 
        REFERENCES "customers" ("site_id", "id") ON DELETE SET NULL,
    
    -- 客户联系信息（保留 email 作为关键字段）
    "name"              TEXT NOT NULL,
    "email"             TEXT NOT NULL,
    "phone"             TEXT DEFAULT '',
    "company"           TEXT DEFAULT '',
    
    -- 询盘内容
    "subject"           TEXT DEFAULT '',          -- 邮件主题（如 'Inquiry No.: #000001-Vic huang'）
    "message"           TEXT NOT NULL,
    "product_id"        TEXT,
    "product_locale"    TEXT,                     -- 产品所属语言（如 'zh', 'en'）
    "product_slug"      TEXT,                     -- 产品在该语言下的友好 URL 名称
    
    -- 状态（应用层管理有效值）
    "status"            TEXT DEFAULT '待处理' 
        CHECK (status IN ('待处理', '处理中', '已回复', '已关闭')),
    
    -- 时间戳
    "created_at"        TIMESTAMP DEFAULT NOW(),
    "updated_at"        TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- 索引
CREATE INDEX "idx_inquiries_site_email" ON "inquiries" ("site_id", "email");
CREATE INDEX "idx_inquiries_site_status" ON "inquiries" ("site_id", "status");
CREATE INDEX "idx_inquiries_site_created" ON "inquiries" ("site_id", "created_at");
CREATE INDEX "idx_inquiries_customer" ON "inquiries" ("site_id", "customer_id");
CREATE INDEX "idx_inquiries_number" ON "inquiries" ("inquiry_number");
-- 新增索引：按 product_locale 和 product_slug 查询（可选）
CREATE INDEX "idx_inquiries_product_locale" ON "inquiries" ("product_locale");
CREATE INDEX "idx_inquiries_product_slug" ON "inquiries" ("product_slug");

-- ============================================================
-- 3. 询盘回复表（对话记录）
-- ============================================================
DROP TABLE IF EXISTS "inquiry_replies" CASCADE;
CREATE TABLE "inquiry_replies" (
    "id"                SERIAL PRIMARY KEY,
    "inquiry_id"        INT NOT NULL REFERENCES "inquiries"("id") ON DELETE CASCADE,
    "site_id"           TEXT NOT NULL,                     -- 冗余站点，便于按站点查询
    
    -- 发送者类型（应用层校验）
    "sender_type"       VARCHAR(20) NOT NULL 
        CHECK (sender_type IN ('admin', 'user', 'system')),
    "sender_email"      VARCHAR(255) NOT NULL,
    "sender_name"       VARCHAR(255),
    
    -- 管理员ID（假设有admins表，此处不强制外键）
    "admin_id"          INT,
    -- 客户ID（冗余，便于关联）
    "customer_id"       TEXT,
    
    -- 回复内容
    "content"           TEXT NOT NULL,
    "is_internal"       BOOLEAN DEFAULT FALSE,       -- 内部备注
    
    -- 邮件追踪
    "message_id"        VARCHAR(255),
    "in_reply_to"       VARCHAR(255),
    
    "created_at"        TIMESTAMP DEFAULT NOW()
);

-- 索引（包含 site_id + inquiry_id 复合索引，提高查询效率）
CREATE INDEX "idx_replies_inquiry" ON "inquiry_replies" ("inquiry_id");
CREATE INDEX "idx_replies_site_inquiry" ON "inquiry_replies" ("site_id", "inquiry_id");
CREATE INDEX "idx_replies_created" ON "inquiry_replies" ("created_at");
CREATE INDEX "idx_replies_sender" ON "inquiry_replies" ("sender_type");

-- ============================================================
-- 4. 验证码表
-- ============================================================
DROP TABLE IF EXISTS "verification_codes" CASCADE;
CREATE TABLE "verification_codes" (
    "id"         SERIAL PRIMARY KEY,
    "email"      TEXT NOT NULL,
    "code"       TEXT NOT NULL,
    "type"       TEXT NOT NULL,  -- 'login'（统一使用）
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX "idx_verification_codes_email" ON "verification_codes" ("email");


-- ========== 组件文本表 ==========
-- 原表已有 site_id，且唯一约束已包含 site_id，直接添加外键并调整索引即可
-- 这个表已经放弃了，不需要了
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

-- ========== 1. sites 表（假设已存在，此处仅作为外键依赖声明） ==========
-- CREATE TABLE IF NOT EXISTS sites (
--     site_id TEXT PRIMARY KEY,
--     name TEXT,
--     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ========== 1. 创建 pages 表 ==========
DROP TABLE IF EXISTS "pages" CASCADE;
CREATE TABLE IF NOT EXISTS "pages" (
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

-- ========== 2. 索引优化（加速筛选、排序、搜索） ==========
-- 基础查询索引（站点 + 语言）
CREATE INDEX IF NOT EXISTS "idx_pages_site_locale" ON "pages" ("site_id", "locale");

-- 类型筛选索引（类型 + 站点）
CREATE INDEX IF NOT EXISTS "idx_pages_type_site" ON "pages" ("type", "site_id");

-- URL 查询索引
CREATE INDEX IF NOT EXISTS "idx_pages_url_site" ON "pages" ("url", "site_id");

-- 翻译/同步相关索引
CREATE INDEX IF NOT EXISTS "idx_pages_source" ON "pages" ("source_locale", "source_content_hash");
CREATE INDEX IF NOT EXISTS "idx_pages_id_source_locale" ON "pages" ("id", "source_locale") WHERE source_locale IS NOT NULL;

-- 复合索引：加速分页查询（最常用查询：site_id + locale + type + updatedAt 排序）
CREATE INDEX IF NOT EXISTS "idx_pages_site_locale_type_updated" 
ON "pages" ("site_id", "locale", "type", "updatedAt" DESC);

-- 标题全文搜索（使用 pg_trgm）
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE INDEX IF NOT EXISTS "idx_pages_title_trgm" 
ON "pages" USING GIN ("title" gin_trgm_ops);



-- ========== 3. page_contents 表 ==========
DROP TABLE IF EXISTS "page_contents" CASCADE;
CREATE TABLE IF NOT EXISTS "page_contents" (
    "id"            SERIAL PRIMARY KEY,
    "page_id"       TEXT NOT NULL,
    "site_id"       TEXT NOT NULL,
    "locale"        TEXT NOT NULL,
    "full_content"  TEXT,
    "content_hash"  TEXT,          -- 可选冗余字段，用于校验内容完整性
    "updatedAt"     TEXT NOT NULL,
    UNIQUE ("page_id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_contents_page_site" ON "page_contents" ("page_id", "site_id", "locale");

-- ========== 4. sync_logs 表（增强版） ==========
DROP TABLE IF EXISTS "sync_logs" CASCADE;
CREATE TABLE IF NOT EXISTS "sync_logs" (
    "id"              SERIAL PRIMARY KEY,
    "site_id"         TEXT NOT NULL,
    "sync_type"       TEXT NOT NULL,          -- 'page', 'config'
    "source_id"       TEXT NOT NULL,          -- 源页面/配置的ID
    "source_locale"   TEXT NOT NULL,          -- 源语言代码
    "target_locale"   TEXT NOT NULL,          -- 目标语言代码
    "target_id"       TEXT NOT NULL,          -- 目标页面/配置的ID（通常与 source_id 相同）
    "source_hash"     TEXT,                   -- 同步时源内容的哈希
    "status"          TEXT DEFAULT 'success', -- success, failed, pending
    "error_message"   TEXT,                   -- 错误信息
    "operator"        TEXT,                   -- 操作人
    "created_at"      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- 索引优化
CREATE INDEX IF NOT EXISTS "idx_sync_logs_site" ON "sync_logs" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_sync_logs_source" ON "sync_logs" ("source_id", "source_locale");
CREATE INDEX IF NOT EXISTS "idx_sync_logs_target" ON "sync_logs" ("target_id", "target_locale");
CREATE INDEX IF NOT EXISTS "idx_sync_logs_created" ON "sync_logs" ("created_at");

-- 可选：防止同一源页面、同一目标语言、相同源哈希的重复同步（根据业务需要决定是否启用）
-- CREATE UNIQUE INDEX idx_sync_logs_unique ON sync_logs (source_id, source_locale, target_locale, source_hash);


-- ========== 完整文件管理表结构 ==========

-- 1. 文件分类表
CREATE TABLE IF NOT EXISTS file_categories (
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

-- 2. 文件主表（已包含 site_id 和 category_id）
CREATE TABLE IF NOT EXISTS media_files (
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

-- 3. 文件引用关系表
CREATE TABLE IF NOT EXISTS file_references (
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

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_media_files_hash ON media_files(file_hash);
CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_files_source_url ON media_files(source_url);
CREATE INDEX IF NOT EXISTS idx_media_files_category ON media_files(category_id);
CREATE INDEX IF NOT EXISTS idx_media_files_site_id ON media_files(site_id);
CREATE INDEX IF NOT EXISTS idx_file_categories_parent ON file_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_file_categories_order ON file_categories("order");
CREATE INDEX IF NOT EXISTS idx_file_categories_site ON file_categories(site_id);
CREATE INDEX IF NOT EXISTS idx_file_ref_target ON file_references(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_file_ref_file ON file_references(file_id);
CREATE INDEX IF NOT EXISTS idx_file_ref_site ON file_references(site_id);

-- 5. 插入默认分类（注意 site_id）
INSERT INTO file_categories (id, site_id, name, slug, "order", description)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '000001',
  '未分类',
  'uncategorized',
  0,
  '系统默认分类，存放尚未分类的文件'
) ON CONFLICT (id) DO NOTHING;

-- 6. 将现有未分类的文件关联到默认分类
UPDATE media_files 
SET category_id = '00000000-0000-0000-0000-000000000000'
WHERE category_id IS NULL;



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

-- 复合索引：按 site_id, locale, id 顺序，用于批量查询多个语言的菜单
CREATE INDEX IF NOT EXISTS "idx_site_configs_lookup" ON "site_configs" ("site_id", "locale", "id");

-- 保留原有索引（site_id, locale），覆盖其他查询场景
CREATE INDEX IF NOT EXISTS "idx_configs_site_locale" ON "site_configs" ("site_id", "locale");

-- ========== 已开通语言站点设置表 ==========

-- 创建语言设置表（只有一行记录）
CREATE TABLE IF NOT EXISTS language_settings (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled JSON NOT NULL,
    default_language TEXT NOT NULL DEFAULT 'zh',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 插入初始数据（所有语言启用，默认中文）
INSERT INTO language_settings (enabled, default_language)
VALUES (
    (SELECT json_object_agg(code, true) FROM unnest(ARRAY['en','zh','es','de','ja','fr','ar','ko','pt','it','nl','pl','ru','tr','id','vi','th','he','sv','no','da','fi','el','cs','hu','ro','bg','hr','sk','sl','lt','lv','et','ms','hi','ta','uk','sr','mk','sq','ca','eu']) AS code),
    'zh'
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- SEO 智能生成系统 - 完整建库脚本
-- 修正：确保 seo_strategies 表有 (site_id, page_type) 唯一约束
-- =====================================================

-- =====================================================
-- 1. seo_strategies（包含唯一约束）
-- =====================================================
DROP TABLE IF EXISTS "seo_strategies" CASCADE;
CREATE TABLE "seo_strategies" (
    "id"                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "site_id"              TEXT,
    "page_type"            TEXT NOT NULL,
    "label"                TEXT NOT NULL,
    "use_global_context"   BOOLEAN DEFAULT TRUE,
    "fields"               JSONB NOT NULL,
    "created_at"           TIMESTAMPTZ DEFAULT NOW(),
    "updated_at"           TIMESTAMPTZ DEFAULT NOW(),
    -- 🔑 关键唯一约束：确保每个 (site_id, page_type) 只有一条记录
    CONSTRAINT "seo_strategies_site_page_type_unique" 
        UNIQUE ("site_id", "page_type")
);

CREATE INDEX "idx_seo_strategies_site" ON "seo_strategies" ("site_id");
CREATE INDEX "idx_seo_strategies_page_type" ON "seo_strategies" ("page_type");

-- =====================================================
-- 2. page_seo_data
-- =====================================================
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
    CONSTRAINT "page_seo_data_site_page_locale_unique" 
        UNIQUE ("site_id", "page_id", "locale")
);
CREATE INDEX "idx_page_seo_data_site_page" ON "page_seo_data" ("site_id", "page_id");
CREATE INDEX "idx_page_seo_data_site_locale" ON "page_seo_data" ("site_id", "locale");
CREATE INDEX "idx_page_seo_data_site_status" ON "page_seo_data" ("site_id", "generation_status");
CREATE INDEX "idx_page_seo_data_site_source" ON "page_seo_data" ("site_id", "source_locale");
CREATE INDEX "idx_page_seo_data_page_type" ON "page_seo_data" ("page_type");

-- =====================================================
-- 3. seo_batch_jobs
-- =====================================================
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
CREATE INDEX "idx_seo_batch_jobs_created" ON "seo_batch_jobs" ("created_at" DESC);

-- =====================================================
-- 4. 清理重复数据（先删除重复记录，再创建约束）
-- =====================================================
-- 删除重复的 (site_id, page_type) 记录，保留最新的一条
WITH duplicates AS (
    SELECT 
        id,
        site_id,
        page_type,
        ROW_NUMBER() OVER (
            PARTITION BY site_id, page_type 
            ORDER BY created_at DESC
        ) AS rn
    FROM seo_strategies
)
DELETE FROM seo_strategies
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- =====================================================
-- 5. 插入默认策略（仅当不存在时）
-- =====================================================
-- =====================================================
-- 插入所有页面类型的默认策略
-- =====================================================
-- 如果策略已存在，先删除（谨慎操作）
DELETE FROM "seo_strategies" WHERE site_id IS NULL;

-- 插入所有页面类型的默认策略（seo_keywords 已启用，标题30-60，描述80-160）
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
ON CONFLICT (site_id, page_type) DO NOTHING;


-- =====================================================
-- 6. 验证唯一约束
-- =====================================================
-- 运行以下查询确认约束存在：
-- SELECT conname, contype, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'seo_strategies'::regclass AND contype = 'u';


-- ============================================================
-- 管理员表（含聊天个人设置字段）
-- ============================================================
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
  site_id TEXT NOT NULL DEFAULT '000001',
  -- ========== 聊天个人设置字段 ==========
  avatar_url TEXT,                                      -- 头像URL
  nickname TEXT,                                        -- 昵称（显示用）
  online_status TEXT DEFAULT 'online' CHECK (online_status IN ('online', 'offline', 'busy', 'away')),
  default_welcome TEXT DEFAULT 'Hello, how can I help you?', -- 默认欢迎语（海外客户可见）
  offline_reply TEXT DEFAULT 'Sorry, we are currently offline. We will get back to you soon.', -- 离线回复（海外客户可见）
  online_start_time TIME DEFAULT '09:00:00',            -- 在线开始时间
  online_end_time TIME DEFAULT '21:00:00',              -- 在线结束时间
  -- ========== 系统字段 ==========
  updated_at TIMESTAMPTZ DEFAULT NOW()                  -- 更新时间（用于记录最后修改时间）
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_api_token ON admin_users(api_token);
CREATE INDEX IF NOT EXISTS idx_admin_users_site_id ON admin_users(site_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_site_email ON admin_users(site_id, email);

-- 字段注释（中文，便于维护）
COMMENT ON COLUMN admin_users.avatar_url IS '管理员头像图片地址';
COMMENT ON COLUMN admin_users.nickname IS '聊天显示的昵称';
COMMENT ON COLUMN admin_users.online_status IS '在线状态：online（在线）、offline（离线）、busy（忙碌）、away（离开）';
COMMENT ON COLUMN admin_users.default_welcome IS '客户发起聊天时的默认欢迎语（海外客户可见，建议英文）';
COMMENT ON COLUMN admin_users.offline_reply IS '管理员离线时的自动回复内容（海外客户可见，建议英文）';
COMMENT ON COLUMN admin_users.online_start_time IS '每日在线开始时间（如：09:00）';
COMMENT ON COLUMN admin_users.online_end_time IS '每日在线结束时间（如：21:00）';
COMMENT ON COLUMN admin_users.updated_at IS '记录最后更新时间';

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


-- ========== 站点基本设置表 ==========
CREATE TABLE IF NOT EXISTS sites_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL DEFAULT '000001',
  site_name TEXT NOT NULL,
  website_url TEXT NOT NULL,
  default_locale TEXT DEFAULT 'en',
  target_audience TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  company_name TEXT,
  country TEXT DEFAULT 'China',
  registered_address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  brand JSONB DEFAULT '[]'::jsonb,
  social_share_image TEXT,                           -- 社交分享图片
  logo TEXT,                                         -- 企业 Logo
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为 site_id 创建唯一索引，确保每个站点只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_settings_site_id ON sites_settings (site_id);

-- 可选：添加注释说明
COMMENT ON COLUMN sites_settings.logo IS '企业Logo图片URL';
COMMENT ON COLUMN sites_settings.social_share_image IS '社交媒体分享图片URL（建议尺寸1200×628px）';





-- ========== admin_logs 表 ==========
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


-- ========== 即时聊天相关表 ==========

-- ============================================================
-- 1. 删除已存在的表（谨慎操作）
-- ============================================================
DROP TABLE IF EXISTS chat.messages;
DROP TABLE IF EXISTS chat.conversations;

-- ============================================================
-- 2. 创建 schema（如果不存在）
-- ============================================================
CREATE SCHEMA IF NOT EXISTS chat;

-- ============================================================
-- 3. 创建会话表
-- ============================================================
CREATE TABLE chat.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,                           -- 租户隔离
  customer_id TEXT NOT NULL,                       -- 关联 customers.id
  customer_email TEXT NOT NULL,                    -- 冗余字段，方便查询
  customer_name TEXT,                              -- 客户姓名（冗余）
  agent_id TEXT,                                   -- 关联 admin_users.id（处理此会话的管理员）
  status TEXT DEFAULT 'pending',                   -- pending, active, closed
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. 创建消息表
-- ============================================================
CREATE TABLE chat.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat.conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,                       -- 'visitor' | 'agent' | 'system'
  sender_id TEXT,                                  -- 如果是 visitor → customers.id；如果是 agent → admin_users.id
  sender_email TEXT,                               -- 冗余字段，方便显示
  sender_name TEXT,                                -- 冗余字段，方便显示
  content TEXT,
  content_type TEXT DEFAULT 'text',                -- text, image, link
  file_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 5. 创建索引（优化查询性能）
-- ============================================================
-- 会话表索引
CREATE INDEX idx_conversations_site_id ON chat.conversations(site_id);
CREATE INDEX idx_conversations_customer_id ON chat.conversations(customer_id);
CREATE INDEX idx_conversations_customer_email ON chat.conversations(customer_email);
CREATE INDEX idx_conversations_status ON chat.conversations(status);
CREATE INDEX idx_conversations_last_message ON chat.conversations(last_message_at);

-- 消息表索引
CREATE INDEX idx_messages_conversation_id ON chat.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON chat.messages(created_at);
CREATE INDEX idx_messages_sender_type ON chat.messages(sender_type);

-- ============================================================
-- 6. 禁用 RLS（不使用 Supabase Auth）
-- ============================================================
ALTER TABLE chat.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat.messages DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. 为 Realtime 准备（消息实时推送）
-- ============================================================
ALTER TABLE chat.messages REPLICA IDENTITY FULL;

-- ============================================================
-- 8. 提示
-- ============================================================
-- 1. 请在 Supabase Dashboard → Database → Replication 中为 chat.messages 表开启 Realtime。
-- 2. 本方案不依赖 Supabase Auth，完全使用自定义 JWT 体系。
-- 3. customer_id 关联 customers.id，agent_id 关联 admin_users.id。
-- 4. site_id 用于多租户隔离（目前写死为 '000001'，未来可扩展）。
-- 5. 访客首次聊天时会自动在 customers 表中创建记录（source = 'chat'）。

-- 授予所有相关角色对 chat schema 的访问权限  Supabase 的 Data API 用户（authenticator）访问 chat schema 的权限
GRANT USAGE ON SCHEMA chat TO authenticator, anon, authenticated, service_role;

-- 授予对所有表的 CRUD 权限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA chat 
  TO authenticator, anon, authenticated, service_role;

-- 设置默认权限（未来新建表自动授权）
ALTER DEFAULT PRIVILEGES IN SCHEMA chat 
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES 
  TO authenticator, anon, authenticated, service_role;


-- ============================================================
-- 聊天常用回复语表（含创建者字段）
-- ============================================================
CREATE TABLE IF NOT EXISTS chat.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id TEXT NOT NULL,
  title TEXT NOT NULL,                    -- 快捷标题（如"问候语"）
  content TEXT NOT NULL,                  -- 回复内容
  created_by TEXT NOT NULL,               -- 创建者 ID（关联 admin_users.id）
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- 外键约束：关联管理员表
  CONSTRAINT fk_quick_replies_created_by 
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_quick_replies_site_id ON chat.quick_replies(site_id);
CREATE INDEX idx_quick_replies_created_by ON chat.quick_replies(created_by);

-- 授予权限
GRANT SELECT, INSERT, UPDATE, DELETE ON chat.quick_replies 
  TO anon, authenticated, service_role;



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


-- ============================================================
-- 以下为产品采集相关表（crawler_configs、crawler_products）
-- ============================================================

-- ============================================================
-- 1. crawler_configs 表（选择器配置）
-- ============================================================
CREATE TABLE IF NOT EXISTS crawler_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id TEXT NOT NULL DEFAULT '000001',
    config JSONB NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by TEXT,
    UNIQUE(site_id)
);

-- ============================================================
-- 2. crawler_products 表（采集数据临时表）
-- ============================================================
CREATE TABLE IF NOT EXISTS crawler_products (
    -- ========== 主键和基础字段 ==========
    crawler_id TEXT PRIMARY KEY,
    site_id TEXT NOT NULL DEFAULT '000001',
    locale TEXT NOT NULL DEFAULT 'en',

    -- ========== 商品核心字段 ==========
    product_id TEXT NOT NULL,
    product_line_id TEXT,              -- ✅ 允许为空
    category_id TEXT,                  -- ✅ 允许为空（采集时无法自动归类）
    series_id TEXT,                    -- ✅ 允许为空
    parent_product_id TEXT,
    sku TEXT NOT NULL,
    product_name TEXT NOT NULL,
    brand TEXT,
    price_tiers JSONB,
    currency TEXT DEFAULT 'USD',
    availability TEXT DEFAULT 'in_stock',
    min_order_quantity INTEGER DEFAULT 1,
    main_image_url TEXT,
    additional_images JSONB,
    description TEXT,
    short_description TEXT,
    attributes JSONB,
    spec_text TEXT,
    slug TEXT,
    status TEXT DEFAULT 'draft',
    template_id TEXT DEFAULT '',
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT,

    -- ========== 变体列表 ==========
    sku_list JSONB DEFAULT '[]'::jsonb,

    -- ========== 采集来源 ==========
    platform TEXT NOT NULL,
    source_url TEXT NOT NULL,
    source_product_id TEXT,
    source_locale TEXT DEFAULT 'en',

    -- ========== 采集元数据 ==========
    collected_at TIMESTAMP WITH TIME ZONE,
    collected_by TEXT,

    -- ========== 导入状态 ==========
    import_status TEXT DEFAULT 'pending',
    imported_at TIMESTAMP WITH TIME ZONE,
    import_error TEXT,

    -- ========== 时间戳 ==========
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(site_id, source_url)
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_crawler_products_site ON crawler_products(site_id);
CREATE INDEX IF NOT EXISTS idx_crawler_products_platform ON crawler_products(platform);
CREATE INDEX IF NOT EXISTS idx_crawler_products_import_status ON crawler_products(import_status);
CREATE INDEX IF NOT EXISTS idx_crawler_products_collected_at ON crawler_products(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawler_products_source_url ON crawler_products(source_url);

-- ============================================================
-- 添加注释（便于维护）
-- ============================================================
COMMENT ON TABLE crawler_products IS '产品采集数据临时表，存放从各平台采集的商品数据';
COMMENT ON COLUMN crawler_products.import_status IS '导入状态: pending-待导入, imported-已导入, skipped-已跳过, failed-导入失败';
COMMENT ON COLUMN crawler_products.sku_list IS '变体列表（SKU组合）';


-- ============================================================
-- 1. 订单表（完整版）- 新增 shipping_records 字段
-- ============================================================
CREATE TABLE IF NOT EXISTS "orders" (
    "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"            TEXT NOT NULL,
    "order_no"           TEXT NOT NULL UNIQUE,              -- 系统订单号（UUID），唯一
    "contract_no"        TEXT,                             -- 合同号（客户可见），用户可编辑
    "customer_id"        TEXT,                             -- CRM客户ID，用于关联订单与客户
    
    -- 买家信息
    "buyer_name"         TEXT NOT NULL,
    "buyer_email"        TEXT NOT NULL,
    "buyer_company"      TEXT DEFAULT '',
    "buyer_country"      TEXT DEFAULT '',
    "buyer_phone"        TEXT DEFAULT '',
    "buyer_address"      TEXT DEFAULT '',
    
    -- 支付方式
    "payment_method"     TEXT DEFAULT 'bank_transfer',     -- bank_transfer | qr_code | online_payment
    "selected_account_ids" JSONB DEFAULT '[]'::jsonb,      -- 选中的收款账号ID列表，JSON数组格式
    
    -- 订单金额
    "currency"           TEXT DEFAULT 'USD',
    "sub_total"          DECIMAL(15,2) DEFAULT 0,
    "discount"           DECIMAL(15,2) DEFAULT 0,
    "shipping_fee"       DECIMAL(15,2) DEFAULT 0,
    "tax"                DECIMAL(15,2) DEFAULT 0,
    "total_amount"       DECIMAL(15,2) DEFAULT 0,
    
    -- ============================================================
    -- 发货信息
    -- ============================================================
    "shipping_method"    TEXT DEFAULT '',                   -- 运输方式：快递/海运/空运等
    "shipping_date_type" TEXT DEFAULT '',                   -- deposit | balance | fixed
    "shipping_date"      DATE,                              -- 指定发货日期（fixed时使用）
    "shipping_days"      INTEGER DEFAULT 0,                 -- 到账后发货天数（deposit/balance时使用）
    "trade_term"         TEXT DEFAULT 'FOB',                -- EXW | FCA | FAS | FOB | CFR | CIF | CPT | CIP | DAT | DAP | DDP
    
    -- ============================================================
    -- 物流追踪信息（旧字段保留兼容，新逻辑使用 shipping_records）
    -- ============================================================
    "tracking_number"    TEXT DEFAULT '',                   -- 【已废弃，请使用 shipping_records】物流单号
    "carrier"            TEXT DEFAULT '',                   -- 【已废弃，请使用 shipping_records】物流承运商（key）
    "carrier_name"       TEXT DEFAULT '',                   -- 【已废弃，请使用 shipping_records】承运商英文名称（用于客户显示）
    "tracking_image"     TEXT DEFAULT '',                   -- 【已废弃，请使用 shipping_records】物流凭证（运单图片地址）
    
    -- ✅ 新增：发货记录列表（JSONB数组），支持多次发货
    "shipping_records"   JSONB DEFAULT '[]'::jsonb,         -- 发货记录列表
    
    -- ============================================================
    -- 账单信息
    -- ============================================================
    "expiry_date"        TIMESTAMP,                         -- 订单过期时间
    "legal_terms"        TEXT DEFAULT '',
    "postscript"         TEXT DEFAULT '',
    "remark"             TEXT DEFAULT '',                   -- 备注（仅内部可见）
    
    -- ============================================================
    -- 支付信息（PayPal）
    -- ============================================================
    "paypal_order_id"    TEXT,
    "paypal_payer_id"    TEXT,
    "paypal_payment_id"  TEXT,
    "payment_status"     TEXT DEFAULT 'pending',
    "paid_at"            TIMESTAMP,
    
    -- ============================================================
    -- 预付款信息
    -- ============================================================
    "deposit_amount"     DECIMAL(15,2) DEFAULT 0,           -- 预付款金额
    
    -- ============================================================
    -- 订单状态
    -- ============================================================
    "status"             TEXT DEFAULT 'draft',              -- draft | formal | paid | completed | cancelled
    "sent_status"        TEXT DEFAULT 'unsent',             -- 发送状态: sent-已发送 | unsent-未发送
    "share_token"        TEXT,
    "share_view_count"   INTEGER DEFAULT 0,
    
    -- ============================================================
    -- 操作记录
    -- ============================================================
    "created_by"         TEXT,
    "sent_at"            TIMESTAMP,
    "cancelled_at"       TIMESTAMP,
    "expired_at"         TIMESTAMP,
    
    "created_at"         TIMESTAMP DEFAULT NOW(),
    "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- 订单索引
-- ============================================================
CREATE INDEX IF NOT EXISTS "idx_orders_site" ON "orders" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_orders_site_status" ON "orders" ("site_id", "status");
CREATE INDEX IF NOT EXISTS "idx_orders_site_customer" ON "orders" ("site_id", "customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_order_no" ON "orders" ("order_no");
CREATE INDEX IF NOT EXISTS "idx_orders_contract_no" ON "orders" ("contract_no");
CREATE INDEX IF NOT EXISTS "idx_orders_paypal_order_id" ON "orders" ("paypal_order_id");
CREATE INDEX IF NOT EXISTS "idx_orders_site_created" ON "orders" ("site_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_orders_site_status_expiry" ON "orders" ("site_id", "status", "expiry_date");
CREATE INDEX IF NOT EXISTS "idx_orders_share_token" ON "orders" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_orders_payment_method" ON "orders" ("payment_method");
CREATE INDEX IF NOT EXISTS "idx_orders_selected_account_ids" ON "orders" USING GIN ("selected_account_ids");
CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_orders_sent_status" ON "orders" ("sent_status");
-- ✅ 新增：shipping_records 索引（JSONB 数组查询）
CREATE INDEX IF NOT EXISTS "idx_orders_shipping_records" ON "orders" USING GIN ("shipping_records");

-- ============================================================
-- 字段注释（新增 shipping_records 注释）
-- ============================================================
COMMENT ON COLUMN "orders"."order_no" IS '系统订单号（UUID），唯一不可重复';
COMMENT ON COLUMN "orders"."contract_no" IS '合同号（客户可见），用户可编辑，格式如 PI-20260901-0001';
COMMENT ON COLUMN "orders"."customer_id" IS 'CRM客户ID，用于关联订单与客户';
COMMENT ON COLUMN "orders"."buyer_country" IS '买家国家/地区';
COMMENT ON COLUMN "orders"."payment_method" IS '支付方式: bank_transfer | qr_code | online_payment';
COMMENT ON COLUMN "orders"."selected_account_ids" IS '选中的收款账号ID列表，JSON数组格式，支持多选支付方式';
COMMENT ON COLUMN "orders"."shipping_method" IS '运输方式: 快递/海运/空运/陆运/邮政/多式联运';
COMMENT ON COLUMN "orders"."shipping_date_type" IS '发货日期类型: deposit(预付款到账后) | balance(尾款到账后) | fixed(指定日期)';
COMMENT ON COLUMN "orders"."shipping_date" IS '指定发货日期（shipping_date_type = fixed 时使用）';
COMMENT ON COLUMN "orders"."shipping_days" IS '发货天数（shipping_date_type = deposit 或 balance 时使用），表示到账后多少天发货';
COMMENT ON COLUMN "orders"."trade_term" IS '贸易术语: EXW | FCA | FAS | FOB | CFR | CIF | CPT | CIP | DAT | DAP | DDP';
COMMENT ON COLUMN "orders"."tracking_number" IS '【已废弃，请使用 shipping_records】物流单号，保留仅用于兼容旧数据';
COMMENT ON COLUMN "orders"."carrier" IS '【已废弃，请使用 shipping_records】物流承运商（key），保留仅用于兼容旧数据';
COMMENT ON COLUMN "orders"."carrier_name" IS '【已废弃，请使用 shipping_records】承运商英文名称，保留仅用于兼容旧数据';
COMMENT ON COLUMN "orders"."tracking_image" IS '【已废弃，请使用 shipping_records】物流凭证（运单图片地址），保留仅用于兼容旧数据';
COMMENT ON COLUMN "orders"."shipping_records" IS '发货记录列表（JSONB数组），支持多次发货。结构: [{"id":"xxx","carrier_key":"sf-express","carrier_name_cn":"顺丰速运","carrier_name_en":"SF Express","tracking_number":"SF123","tracking_image":"url","shipping_method":"快递","created_at":"2026-09-06T10:00:00Z"}]';
COMMENT ON COLUMN "orders"."expiry_date" IS '订单过期时间，用于自动过期判断';
COMMENT ON COLUMN "orders"."remark" IS '备注（仅内部可见）';
COMMENT ON COLUMN "orders"."deposit_amount" IS '预付款金额';
COMMENT ON COLUMN "orders"."status" IS '订单状态: draft(草稿) | formal(正式订单) | paid(已付款) | completed(已完成) | cancelled(已取消)';
COMMENT ON COLUMN "orders"."sent_status" IS '发送状态: sent(已发送) | unsent(未发送)';

-- ============================================================
-- 增量升级脚本（仅新增字段，不删除旧字段）
-- ============================================================
-- 说明：如果 orders 表已存在，执行以下 ALTER 语句
-- 
-- ALTER TABLE "orders" 
-- ADD COLUMN IF NOT EXISTS "shipping_records" JSONB DEFAULT '[]'::jsonb;
-- 
-- CREATE INDEX IF NOT EXISTS "idx_orders_shipping_records" 
-- ON "orders" USING GIN ("shipping_records");

-- ============================================================
-- 数据迁移脚本（将现有物流数据迁移到 shipping_records）
-- ============================================================
-- 说明：如果存在旧物流数据，执行以下迁移
-- 
-- UPDATE "orders" 
-- SET "shipping_records" = JSONB_BUILD_ARRAY(
--   JSONB_BUILD_OBJECT(
--     'id', gen_random_uuid()::text,
--     'carrier_key', COALESCE("carrier", ''),
--     'carrier_name_cn', '',
--     'carrier_name_en', COALESCE("carrier_name", ''),
--     'tracking_number', COALESCE("tracking_number", ''),
--     'tracking_image', COALESCE("tracking_image", ''),
--     'shipping_method', COALESCE("shipping_method", ''),
--     'created_at', COALESCE("updated_at", "created_at", NOW())::text
--   )
-- )
-- WHERE "tracking_number" IS NOT NULL 
--   AND "tracking_number" != ''
--   AND ("shipping_records" IS NULL OR "shipping_records" = '[]'::jsonb);

-- ============================================================
-- 2. 订单商品明细表
-- ============================================================
CREATE TABLE IF NOT EXISTS "order_items" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id"          UUID NOT NULL,
    "product_id"        TEXT,
    "locale"            TEXT DEFAULT 'zh',
    
    "product_name"      TEXT NOT NULL,
    "product_image"     TEXT DEFAULT '',
    "category"          TEXT DEFAULT '',
    "specification"     TEXT DEFAULT '',
    "sku"               TEXT DEFAULT '',
    
    "price"             DECIMAL(15,2) NOT NULL,
    "quantity"          INTEGER NOT NULL DEFAULT 1,
    "unit"              TEXT DEFAULT 'pcs',
    "total"             DECIMAL(15,2) NOT NULL,
    
    "sort_order"        INTEGER DEFAULT 0,
    
    "created_at"        TIMESTAMP DEFAULT NOW(),
    "updated_at"        TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_order_items_order" ON "order_items" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_items_product" ON "order_items" ("product_id");

-- ============================================================
-- 3. 订单状态日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS "order_status_logs" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "order_id"          UUID NOT NULL,
    "from_status"       TEXT,
    "to_status"         TEXT NOT NULL,
    "operator"          TEXT,
    "note"              TEXT DEFAULT '',
    "created_at"        TIMESTAMP DEFAULT NOW(),
    
    FOREIGN KEY ("order_id") REFERENCES "orders" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_order_status_logs_order" ON "order_status_logs" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_order_status_logs_created" ON "order_status_logs" ("created_at" DESC);

-- ============================================================
-- 4. 支付账户表（完整版）
-- ============================================================
CREATE TABLE IF NOT EXISTS "payment_accounts" (
    "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"           TEXT NOT NULL,
    
    -- ===== 账号分类 =====
    "account_type"      TEXT,                              -- NULL 表示预设账号（微信/支付宝/PayPal）
    
    -- ===== 支付类型 =====
    -- 'bank_transfer' | 'qr_code' | 'online_payment'
    "payment_type"      TEXT NOT NULL,
    
    -- 'tt' | 'wechat' | 'alipay' | 'paypal' | 'credit_card'
    "payment_method"    TEXT NOT NULL,
    
    -- ===== 显示名称（中英文拆分） =====
    "display_name_zh"   TEXT NOT NULL,
    "display_name_en"   TEXT NOT NULL,
    
    -- ===== 货币（多选，JSONB数组） =====
    "currency"          JSONB NOT NULL DEFAULT '[]',
    
    -- ===== 状态 =====
    "is_active"         BOOLEAN DEFAULT TRUE,
    "is_default"        BOOLEAN DEFAULT FALSE,
    "sort_order"        INTEGER DEFAULT 0,
    
    -- ============================================================
    -- TT银行字段（payment_method = 'tt'）
    -- ============================================================
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
    
    -- ============================================================
    -- 微信/支付宝字段（payment_method = 'wechat' | 'alipay'）
    -- ============================================================
    "account_holder"            TEXT,                      -- 收款户名
    "account_identifier"        TEXT,                      -- 账号标识（支付宝：邮箱/手机号）
    "qr_code_image"             TEXT,                      -- 收款码图片URL
    "remark"                    TEXT,                      -- 备注
    
    -- ============================================================
    -- PayPal字段（payment_method = 'paypal'）
    -- ============================================================
    "paypal_email"              TEXT,
    "paypal_client_id"          TEXT,
    "paypal_client_secret"      TEXT,
    "paypal_webhook_id"         TEXT,
    "is_verified"               BOOLEAN DEFAULT FALSE,    -- PayPal API 验证状态
    
    -- ============================================================
    -- 信用卡（预留）
    -- ============================================================
    "stripe_secret_key"         TEXT,
    "stripe_publishable_key"    TEXT,
    "stripe_webhook_secret"     TEXT,
    
    -- ============================================================
    -- 分享与扩展
    -- ============================================================
    "share_token"               TEXT,
    "details"                   JSONB,
    
    "created_at"        TIMESTAMP DEFAULT NOW(),
    "updated_at"        TIMESTAMP DEFAULT NOW()
);

-- 支付账户索引
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_site" ON "payment_accounts" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_account_type" ON "payment_accounts" ("account_type");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_type_method" ON "payment_accounts" ("payment_type", "payment_method");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_currency" ON "payment_accounts" USING GIN ("currency");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_default" ON "payment_accounts" ("site_id", "is_default");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_share_token" ON "payment_accounts" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_display_name" ON "payment_accounts" ("display_name_zh", "display_name_en");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_payment_method" ON "payment_accounts" ("payment_method");
CREATE INDEX IF NOT EXISTS "idx_payment_accounts_is_verified" ON "payment_accounts" ("is_verified");

-- ============================================================
-- 5. PayPal Webhook日志表
-- ============================================================
CREATE TABLE IF NOT EXISTS "paypal_webhook_logs" (
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

CREATE INDEX IF NOT EXISTS "idx_paypal_webhook_logs_event_id" ON "paypal_webhook_logs" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_paypal_webhook_logs_order" ON "paypal_webhook_logs" ("order_id");
CREATE INDEX IF NOT EXISTS "idx_paypal_webhook_logs_processed" ON "paypal_webhook_logs" ("processed");

-- ============================================================
-- 6. 初始化示例数据
-- ============================================================

-- 6.1 T/T银行 - 花旗银行(香港)
INSERT INTO "payment_accounts" (
    "site_id", 
    "account_type",
    "payment_type", 
    "payment_method", 
    "display_name_zh", 
    "display_name_en",
    "currency",
    "beneficiary_name", 
    "beneficiary_account", 
    "swift_code", 
    "country_region", 
    "beneficiary_address", 
    "beneficiary_bank",
    "beneficiary_bank_address", 
    "bank_code", 
    "branch_code", 
    "attention",
    "is_active", 
    "is_default", 
    "sort_order"
) VALUES (
    '000001',
    'global',
    'bank_transfer', 
    'tt', 
    '中国香港(花旗)',
    'Hong Kong, China (CITI)',
    '["USD", "EUR", "HKD"]',
    'Shenzhen Feisman Technology Co., Ltd.',
    '3974000005387',
    'CITIHKHX',
    'Hong Kong',
    '20/F, TOWER ONE, TIMES SQUARE, 1 MATHESON STREET, CAUSEWAY BAY, HONG KONG',
    'CITIBANK N.A.HONG KONG BRANCH',
    'Champion Tower THREE Garden ROAD CENTRAL, HONG KONG',
    '006',
    '391',
    'Please pay attention to fill in the correct Beneficiary Account Number...',
    true,
    true,
    1
) ON CONFLICT DO NOTHING;

-- 6.2 T/T银行 - 摩根大通(新加坡)
INSERT INTO "payment_accounts" (
    "site_id", 
    "account_type",
    "payment_type", 
    "payment_method", 
    "display_name_zh", 
    "display_name_en",
    "currency",
    "beneficiary_name", 
    "beneficiary_account", 
    "swift_code", 
    "country_region", 
    "beneficiary_address", 
    "beneficiary_bank",
    "beneficiary_bank_address", 
    "bank_code", 
    "branch_code", 
    "is_active", 
    "is_default", 
    "sort_order"
) VALUES (
    '000001',
    'global',
    'bank_transfer', 
    'tt', 
    '新加坡(摩根)',
    'Singapore (JPM)',
    '["USD", "SGD"]',
    'ABC Trading Company Limited',
    '1234567890',
    'CHASSGSG',
    'Singapore',
    '8 Marina View, #12-01, Asia Square Tower 1, Singapore 018960',
    'JPMORGAN CHASE BANK, N.A., SINGAPORE BRANCH',
    '8 Marina View, #12-01, Asia Square Tower 1, Singapore 018960',
    '',
    '',
    true,
    false,
    2
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. 添加字段注释
-- ============================================================
COMMENT ON COLUMN "orders"."order_no" IS '系统订单号（UUID），唯一不可重复';
COMMENT ON COLUMN "orders"."contract_no" IS '合同号（客户可见），用户可编辑，格式如 PI-20260901-0001';
COMMENT ON COLUMN "orders"."buyer_country" IS '买家国家/地区';
COMMENT ON COLUMN "orders"."payment_method" IS '支付方式: bank_transfer | qr_code | online_payment';
COMMENT ON COLUMN "orders"."selected_account_ids" IS '选中的收款账号ID列表，JSON数组格式，支持多选支付方式';
COMMENT ON COLUMN "orders"."shipping_method" IS '运输方式: 快递/海运/空运/陆运/邮政/多式联运';
COMMENT ON COLUMN "orders"."shipping_date_type" IS '发货日期类型: deposit(预付款到账后) | balance(尾款到账后) | fixed(指定日期)';
COMMENT ON COLUMN "orders"."shipping_date" IS '指定发货日期';
COMMENT ON COLUMN "orders"."trade_term" IS '贸易术语: EXW | FCA | FAS | FOB | CFR | CIF | CPT | CIP | DAT | DAP | DDP';
COMMENT ON COLUMN "orders"."remark" IS '备注（仅内部可见）';

COMMENT ON COLUMN "payment_accounts"."account_type" IS '账号类型: global | local | domestic，NULL 表示预设账号（微信/支付宝/PayPal）';
COMMENT ON COLUMN "payment_accounts"."payment_type" IS '支付类型: bank_transfer | qr_code | online_payment';
COMMENT ON COLUMN "payment_accounts"."payment_method" IS '支付方式: tt | wechat | alipay | paypal | credit_card';
COMMENT ON COLUMN "payment_accounts"."display_name_zh" IS '中文显示名称';
COMMENT ON COLUMN "payment_accounts"."display_name_en" IS '英文显示名称';
COMMENT ON COLUMN "payment_accounts"."account_holder" IS '收款户名（微信/支付宝）';
COMMENT ON COLUMN "payment_accounts"."account_identifier" IS '账号标识（支付宝：邮箱/手机号）';
COMMENT ON COLUMN "payment_accounts"."qr_code_image" IS '收款码图片URL（微信/支付宝）';
COMMENT ON COLUMN "payment_accounts"."remark" IS '备注（微信/支付宝）';
COMMENT ON COLUMN "payment_accounts"."is_verified" IS 'PayPal API 验证状态: true=已验证, false=未验证';
COMMENT ON COLUMN "payment_accounts"."paypal_client_id" IS 'PayPal REST API Client ID';
COMMENT ON COLUMN "payment_accounts"."paypal_client_secret" IS 'PayPal REST API Client Secret';
COMMENT ON COLUMN "payment_accounts"."paypal_webhook_id" IS 'PayPal Webhook ID';

-- ============================================================
-- 8. 创建法律条款模板表
-- ============================================================
CREATE TABLE IF NOT EXISTS legal_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id VARCHAR(20) NOT NULL DEFAULT '000001',
    name VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_by VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX idx_legal_templates_site_id ON legal_templates(site_id);
CREATE INDEX idx_legal_templates_is_default ON legal_templates(is_default);
CREATE INDEX idx_legal_templates_deleted_at ON legal_templates(deleted_at);
CREATE INDEX idx_legal_templates_sort_order ON legal_templates(sort_order);

-- 插入默认模板数据（使用 gen_random_uuid() 自动生成 UUID）
INSERT INTO legal_templates (name, content, is_default, sort_order) VALUES 
(
    '标准条款',
    '1. 付款方式：买方应在收到形式发票后3个工作日内支付全部款项。\n2. 交货时间：卖方应在收到预付款后15个工作日内安排发货。\n3. 质量标准：产品应符合双方确认的样品及规格书要求。\n4. 售后服务：卖方提供12个月的质量保证期。\n5. 争议解决：双方应友好协商解决争议，协商不成的，提交深圳国际仲裁院仲裁。',
    TRUE,
    1
),
(
    '贸易条款',
    '1. 贸易术语：FOB Shenzhen\n2. 付款方式：30%预付款 + 70%尾款（发货前付清）\n3. 包装要求：标准出口包装，适合海运\n4. 文件要求：商业发票、装箱单、原产地证、提单\n5. 保险：由买方自行投保',
    FALSE,
    2
);

-- 添加注释
COMMENT ON TABLE legal_templates IS '法律条款模板表';
COMMENT ON COLUMN legal_templates.id IS '模板ID (UUID)';
COMMENT ON COLUMN legal_templates.site_id IS '站点ID';
COMMENT ON COLUMN legal_templates.name IS '模板名称';
COMMENT ON COLUMN legal_templates.content IS '模板内容';
COMMENT ON COLUMN legal_templates.description IS '模板描述';
COMMENT ON COLUMN legal_templates.is_default IS '是否默认模板';
COMMENT ON COLUMN legal_templates.sort_order IS '排序顺序';
COMMENT ON COLUMN legal_templates.created_by IS '创建人';
COMMENT ON COLUMN legal_templates.deleted_at IS '软删除时间';


-- ============================================================
-- 9. 快递公司信息表（公共信息，所有租户共享）
-- ============================================================
CREATE TABLE IF NOT EXISTS "carriers" (
    "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "site_id"            TEXT,                              -- ✅ 可选，NULL 表示公共数据
    "key"                TEXT NOT NULL UNIQUE,              -- 唯一标识，如 dhl, fedex
    "name_en"            TEXT NOT NULL,                     -- 英文名称
    "name_cn"            TEXT NOT NULL,                     -- 中文名称
    "name_hk"            TEXT,                              -- 香港名称（可选）
    "url"                TEXT,                              -- 官网地址
    "shipping_methods"   JSONB DEFAULT '[]'::jsonb,         -- 适用运输方式: ["快递", "空运"]
    "logo"               TEXT,                              -- Logo图片URL
    "sort_order"         INTEGER DEFAULT 0,
    "is_active"          BOOLEAN DEFAULT TRUE,
    "created_at"         TIMESTAMP DEFAULT NOW(),
    "updated_at"         TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS "idx_carriers_site" ON "carriers" ("site_id");
CREATE INDEX IF NOT EXISTS "idx_carriers_key" ON "carriers" ("key");
CREATE INDEX IF NOT EXISTS "idx_carriers_shipping_methods" ON "carriers" USING GIN ("shipping_methods");
CREATE INDEX IF NOT EXISTS "idx_carriers_is_active" ON "carriers" ("is_active");

-- 字段注释
COMMENT ON COLUMN "carriers"."site_id" IS '站点ID，NULL表示公共数据，所有租户共享';
COMMENT ON COLUMN "carriers"."key" IS '唯一标识，如 dhl, fedex, ups';
COMMENT ON COLUMN "carriers"."name_en" IS '英文名称';
COMMENT ON COLUMN "carriers"."name_cn" IS '中文名称';
COMMENT ON COLUMN "carriers"."name_hk" IS '香港名称（繁体）';
COMMENT ON COLUMN "carriers"."url" IS '官网地址';
COMMENT ON COLUMN "carriers"."shipping_methods" IS '适用运输方式: ["快递", "空运", "海运", "陆运", "邮政", "多式联运"]';
COMMENT ON COLUMN "carriers"."logo" IS 'Logo图片URL';

-- ============================================================
-- 初始化示例数据
-- ============================================================
INSERT INTO "carriers" ("site_id", "key", "name_en", "name_cn", "name_hk", "url", "shipping_methods", "logo", "sort_order", "is_active") VALUES
('000001', 'dhl', 'DHL Express', '中外运敦豪', 'DHL', 'https://www.dhl.com', '["快递", "空运"]', '/share/carriers/dhl.png', 1, true),
('000001', 'fedex', 'FedEx', '联邦快递', 'FedEx', 'https://www.fedex.com', '["快递", "空运"]', '/share/carriers/fedex.png', 2, true),
('000001', 'ups', 'UPS', '联合包裹', 'UPS', 'https://www.ups.com', '["快递", "空运"]', '/share/carriers/ups.png', 3, true),
('000001', 'tnt', 'TNT Express', '天地快运', 'TNT', 'https://www.tnt.com', '["快递", "空运"]', '/share/carriers/tnt.png', 4, true),
('000001', 'ems', 'EMS', '中国邮政速递物流', 'EMS', 'https://www.ems.com.cn', '["快递", "邮政"]', '/share/carriers/ems.png', 5, true),
('000001', 'sf', 'SF Express', '顺丰速运', '順豐速運', 'https://www.sf-express.com', '["快递"]', '/share/carriers/sf.png', 6, true),
('000001', 'yt', 'YTO Express', '圆通速递', '圓通速遞', 'https://www.yto.net.cn', '["快递"]', '/share/carriers/yto.png', 7, true),
('000001', 'sto', 'STO Express', '申通快递', '申通快遞', 'https://www.sto.cn', '["快递"]', '/share/carriers/sto.png', 8, true),
('000001', 'zto', 'ZTO Express', '中通快递', '中通快遞', 'https://www.zto.com', '["快递"]', '/share/carriers/zto.png', 9, true),
('000001', 'yunda', 'Yunda Express', '韵达快递', '韻達快遞', 'https://www.yundaex.com', '["快递"]', '/share/carriers/yunda.png', 10, true),
('000001', 'maersk', 'Maersk', '马士基航运', '馬士基航運', 'https://www.maersk.com', '["海运"]', '/share/carriers/maersk.png', 11, true),
('000001', 'msc', 'MSC', '地中海航运', '地中海航運', 'https://www.msc.com', '["海运"]', '/share/carriers/msc.png', 12, true),
('000001', 'cma', 'CMA CGM', '达飞轮船', '達飛輪船', 'https://www.cma-cgm.com', '["海运"]', '/share/carriers/cma.png', 13, true),
('000001', 'cosco', 'COSCO Shipping', '中远海运', '中遠海運', 'https://www.coscoshipping.com', '["海运"]', '/share/carriers/cosco.png', 14, true),
('000001', 'china_post', 'China Post', '中国邮政', '中國郵政', 'https://www.chinapost.com.cn', '["邮政"]', '/share/carriers/china_post.png', 15, true),
('000001', 'others', 'Others', '其他', '其他', '', '["快递", "空运", "海运", "陆运", "邮政", "多式联运"]', '', 99, true)
ON CONFLICT (key) DO NOTHING;


-- ==========================================================
-- content_templates 表
-- 用于存储"内容模板"（系统模板 + 用户模板）
-- ==========================================================

CREATE TABLE content_templates (
  id            TEXT PRIMARY KEY,
  site_id       TEXT NOT NULL DEFAULT '000001',
  locale        TEXT NOT NULL,
  name          TEXT NOT NULL,
  content       TEXT NOT NULL,
  is_system     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 索引：按站点 + 语言查询
CREATE INDEX idx_content_templates_site_locale 
ON content_templates(site_id, locale);

-- 索引：按系统/用户模板筛选
CREATE INDEX idx_content_templates_is_system 
ON content_templates(is_system);


-- ==========================================================
-- 注释
-- ==========================================================

COMMENT ON TABLE content_templates IS '内容模板表 - 存储系统预设和用户自定义的内容模板';
COMMENT ON COLUMN content_templates.id IS '模板 ID，系统模板以 sys_ 开头，用户模板以 user_ 开头';
COMMENT ON COLUMN content_templates.locale IS '语言代码';
COMMENT ON COLUMN content_templates.name IS '模板名称';
COMMENT ON COLUMN content_templates.content IS '模板内容（HTML）';
COMMENT ON COLUMN content_templates.is_system IS '是否为系统模板（true 时不可删除、不可修改）';


-- ==========================================================
-- 初始化系统模板（每个语言一份）
-- ==========================================================

INSERT INTO content_templates (id, site_id, locale, name, content, is_system) VALUES
-- 中文系统模板
('sys_intro_zh', '000001', 'zh', '公司简介', 
'<h2>公司简介</h2><p>我们是一家专注于XXX领域的公司，成立于XXXX年，致力于为客户提供优质的产品和服务。</p><h3>我们的使命</h3><p>为客户创造价值，为员工提供发展平台，为社会贡献力量。</p><h3>我们的优势</h3><ul><li>专业的技术团队</li><li>完善的服务体系</li><li>丰富的行业经验</li></ul>', 
true),
('sys_product_intro_zh', '000001', 'zh', '产品介绍', 
'<h2>产品介绍</h2><p>本产品采用先进的技术和优质的材料，具有以下特点：</p><h3>产品特点</h3><ul><li>高效节能</li><li>稳定可靠</li><li>易于维护</li></ul><h3>应用场景</h3><p>广泛应用于工业自动化、电力系统、通信设备等领域。</p>', 
true),
('sys_faq_zh', '000001', 'zh', '常见问题', 
'<h2>常见问题</h2><h3>Q1: 产品保修期是多久？</h3><p>A: 我们的产品提供2年质保服务，终身技术支持。</p><h3>Q2: 如何联系售后服务？</h3><p>A: 您可以通过以下方式联系我们：<br>电话：400-XXX-XXXX<br>邮箱：support@example.com</p><h3>Q3: 支持定制服务吗？</h3><p>A: 是的，我们提供定制服务，请与销售团队联系。</p>', 
true),
('sys_policy_zh', '000001', 'zh', '隐私政策', 
'<h2>隐私政策</h2><p>我们非常重视您的隐私保护。本政策说明我们如何收集、使用和保护您的个人信息。</p><h3>1. 信息收集</h3><p>我们可能收集您的姓名、邮箱、电话等信息，用于提供服务和沟通。</p><h3>2. 信息使用</h3><p>您的信息仅用于订单处理、客户服务和产品改进。</p><h3>3. 信息保护</h3><p>我们采取严格的安全措施保护您的个人信息，不会向第三方出售或泄露。</p>', 
true),

-- 英文系统模板
('sys_intro_en', '000001', 'en', 'Company Introduction', 
'<h2>Company Introduction</h2><p>We are a company specializing in XXX, founded in XXXX, committed to providing customers with quality products and services.</p><h3>Our Mission</h3><p>Create value for customers, provide development opportunities for employees, and contribute to society.</p><h3>Our Advantages</h3><ul><li>Professional technical team</li><li>Comprehensive service system</li><li>Rich industry experience</li></ul>', 
true),
('sys_product_intro_en', '000001', 'en', 'Product Introduction', 
'<h2>Product Introduction</h2><p>This product uses advanced technology and quality materials with the following features:</p><h3>Features</h3><ul><li>Energy efficient</li><li>Stable and reliable</li><li>Easy to maintain</li></ul><h3>Applications</h3><p>Widely used in industrial automation, power systems, communication equipment and other fields.</p>', 
true),
('sys_faq_en', '000001', 'en', 'FAQ', 
'<h2>FAQ</h2><h3>Q1: How long is the warranty?</h3><p>A: We provide 2-year warranty and lifetime technical support.</p><h3>Q2: How to contact after-sales service?</h3><p>A: You can contact us via:<br>Phone: 400-XXX-XXXX<br>Email: support@example.com</p><h3>Q3: Do you support customization?</h3><p>A: Yes, we provide customization services. Please contact our sales team.</p>', 
true),
('sys_policy_en', '000001', 'en', 'Privacy Policy', 
'<h2>Privacy Policy</h2><p>We take your privacy very seriously. This policy explains how we collect, use and protect your personal information.</p><h3>1. Information Collection</h3><p>We may collect your name, email, phone and other information to provide services and communication.</p><h3>2. Information Use</h3><p>Your information is only used for order processing, customer service and product improvement.</p><h3>3. Information Protection</h3><p>We take strict security measures to protect your personal information and will not sell or disclose it to third parties.</p>', 
true)
ON CONFLICT (id) DO NOTHING;