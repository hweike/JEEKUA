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
    "site_id"         TEXT NOT NULL,
    "productId"       TEXT NOT NULL,
    "locale"          TEXT NOT NULL,          -- 新增 locale 作为主键的一部分
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
    -- 复合主键：支持同一产品多语言版本
    PRIMARY KEY ("site_id", "productId", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- ========== 索引（保持不变） ==========
CREATE INDEX IF NOT EXISTS "idx_products_site_locale" ON "products" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_products_site_productLine" ON "products" ("site_id", "productLineId");
CREATE INDEX IF NOT EXISTS "idx_products_site_category" ON "products" ("site_id", "categoryId");
CREATE INDEX IF NOT EXISTS "idx_products_site_parent" ON "products" ("site_id", "parent_product_id");
CREATE INDEX IF NOT EXISTS "idx_products_site_status" ON "products" ("site_id", "status");
CREATE INDEX IF NOT EXISTS "idx_products_site_updated" ON "products" ("site_id", "updatedAt");

-- ========== 复合索引（优化查询） ==========
CREATE INDEX IF NOT EXISTS "idx_products_list" ON "products" 
    ("site_id", "locale", "parent_product_id", "status", "categoryId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "idx_products_uncategorized" ON "products" 
    ("site_id", "locale", "categoryId") WHERE "categoryId" = '__UNCATEGORIZED__';

CREATE INDEX IF NOT EXISTS "idx_products_sku" ON "products" ("sku");
CREATE INDEX IF NOT EXISTS "idx_products_parent_id" ON "products" ("parent_product_id");

-- （可选）如果需要唯一 SKU 约束，可启用：
-- CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_sku_site_locale" ON "products" ("site_id", "locale", "sku");



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


-- ========== 网站页面表（复合主键，包含 template_hash） ==========
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

-- 唯一约束：同一站点、同一语言下 slug 唯一
CREATE UNIQUE INDEX idx_site_pages_site_locale_slug ON site_pages (site_id, locale, slug);

-- 索引：按语言查询
CREATE INDEX idx_site_pages_locale ON site_pages (locale);

-- 索引：通过模板 ID 查找所有引用页面（模板同步时使用）
CREATE INDEX idx_site_pages_template ON site_pages (template);

-- 索引：按模板哈希查询（用于快速比对，可选，但可加速某些场景）
CREATE INDEX idx_site_pages_template_hash ON site_pages (template_hash);


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

-- ========== 2. pages 表 ==========
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
    "updatedAt"            TEXT NOT NULL,   -- 注意列名是混合大小写
    "createdAt"            TEXT DEFAULT (CURRENT_TIMESTAMP)::TEXT,
    PRIMARY KEY ("id", "site_id", "locale"),
    FOREIGN KEY ("site_id") REFERENCES "sites"("site_id") ON DELETE CASCADE
);

-- ========== 索引优化 ==========
-- 基础索引
CREATE INDEX IF NOT EXISTS "idx_pages_site_locale" ON "pages" ("site_id", "locale");
CREATE INDEX IF NOT EXISTS "idx_pages_type_site" ON "pages" ("type", "site_id");
CREATE INDEX IF NOT EXISTS "idx_pages_url_site" ON "pages" ("url", "site_id");
CREATE INDEX IF NOT EXISTS "idx_pages_source" ON "pages" ("source_locale", "source_content_hash");
CREATE INDEX IF NOT EXISTS "idx_pages_id_source_locale" ON "pages" ("id", "source_locale") WHERE source_locale IS NOT NULL;

-- 新增复合索引：加速分页查询（注意列名加双引号保持大小写一致）
CREATE INDEX IF NOT EXISTS "idx_pages_site_locale_type_updated" 
ON "pages" ("site_id", "locale", "type", "updatedAt" DESC);

-- 新增 GIN 索引：加速标题模糊搜索
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


-- ========== 文件管理表 ==========
-- 1. 创建文件主表（移除 file_hash 的唯一约束）
CREATE TABLE media_files (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key   TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size          BIGINT NOT NULL,
  file_hash     TEXT NOT NULL,                -- 已移除 UNIQUE 约束，变为普通字段
  width         INT,
  height        INT,
  source_url    TEXT,                         -- 原始图片URL（外部导入时记录）
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- 2. 创建文件引用关系表
CREATE TABLE file_references (
  id             SERIAL PRIMARY KEY,
  file_id        UUID NOT NULL REFERENCES media_files(id) ON DELETE CASCADE,
  reference_type VARCHAR(50) NOT NULL,
  reference_id   VARCHAR(255) NOT NULL,
  alt_text       TEXT,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(file_id, reference_type, reference_id)
);

-- 索引（保持性能）
CREATE INDEX idx_media_files_hash ON media_files(file_hash);
CREATE INDEX idx_media_files_created ON media_files(created_at DESC);
CREATE INDEX idx_media_files_source_url ON media_files(source_url);  -- 加速基于 source_url 的去重查询
CREATE INDEX idx_file_ref_target ON file_references(reference_type, reference_id);
CREATE INDEX idx_file_ref_file ON file_references(file_id);



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
-- 为 site_configs 表创建索引（保持原有）
CREATE INDEX IF NOT EXISTS "idx_configs_site_locale" ON "site_configs" ("site_id", "locale");



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




-- ========== 网站基本设置表 ==========

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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 为 site_id 创建唯一索引，确保每个站点只有一条记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_sites_settings_site_id ON sites_settings (site_id);





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