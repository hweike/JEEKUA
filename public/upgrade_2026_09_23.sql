-- ============================================================
-- 建库脚本修正升级（最终版）2026-09-23
-- 包含：
--   - 前置初始化数据（tenants / sites / file_categories / language_settings）
--   - collected_products.site_id 类型修正（bigint → text）
--   - 7 处结构修正
-- 特性：幂等、可重复执行、失败自动回滚
-- ============================================================

BEGIN;

-- ============================================================
-- 补丁 0.1：默认租户
-- ============================================================
INSERT INTO tenants (tenant_id, name)
VALUES ('tenant_default', 'Default Tenant')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================
-- 补丁 0.2：默认站点
-- ============================================================
INSERT INTO sites (site_id, tenant_id, name, default_locale)
VALUES ('000001', 'tenant_default', 'Default Site', 'en')
ON CONFLICT (site_id) DO NOTHING;

-- ============================================================
-- 补丁 0.3：默认文件分类
-- ============================================================
INSERT INTO file_categories (id, site_id, name, slug, "order", description)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '000001',
  '未分类',
  'uncategorized',
  0,
  '系统默认分类，存放尚未分类的文件'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 补丁 0.4：默认语言设置
-- ============================================================
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
-- 修正 0.5：collected_products.site_id 类型修正（bigint → text）
-- ============================================================
-- 说明：你的 DB 里 collected_products.site_id 是 bigint，
--       其他表都是 text。表为空，直接改类型，无影响。
ALTER TABLE collected_products
  ALTER COLUMN site_id TYPE TEXT USING site_id::text;

ALTER TABLE collected_products
  ALTER COLUMN site_id SET DEFAULT '000001';

-- ============================================================
-- 修正 1：seo_strategies —— NULL 全局策略唯一约束失效
-- ============================================================
ALTER TABLE "seo_strategies"
  DROP CONSTRAINT IF EXISTS "seo_strategies_site_page_type_unique";

DROP INDEX IF EXISTS "seo_strategies_global_unique";
DROP INDEX IF EXISTS "seo_strategies_site_unique";

-- 清理重复的全局策略（保留最新一条）
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY page_type ORDER BY created_at DESC, id DESC) AS rn
  FROM "seo_strategies"
  WHERE "site_id" IS NULL
)
DELETE FROM "seo_strategies"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 清理重复的站点专属策略
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY site_id, page_type ORDER BY created_at DESC, id DESC) AS rn
  FROM "seo_strategies"
  WHERE "site_id" IS NOT NULL
)
DELETE FROM "seo_strategies"
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 创建两个部分唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "seo_strategies_global_unique"
  ON "seo_strategies" ("page_type")
  WHERE "site_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "seo_strategies_site_unique"
  ON "seo_strategies" ("site_id", "page_type")
  WHERE "site_id" IS NOT NULL;

-- ============================================================
-- 修正 2：admin_logs.action —— 添加 'update'
-- ============================================================
ALTER TABLE admin_logs DROP CONSTRAINT IF EXISTS admin_logs_action_check;
ALTER TABLE admin_logs
  ADD CONSTRAINT admin_logs_action_check
  CHECK (action IN ('add', 'update', 'delete'));

-- ============================================================
-- 修正 3：product_tasks —— 添加 site_id
-- ============================================================
ALTER TABLE product_tasks
  ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT '000001';

ALTER TABLE product_tasks DROP CONSTRAINT IF EXISTS fk_product_tasks_site;
ALTER TABLE product_tasks
  ADD CONSTRAINT fk_product_tasks_site
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_tasks_site ON product_tasks(site_id);

-- ============================================================
-- 修正 4：product_prices —— 添加 site_id
-- ============================================================
ALTER TABLE product_prices
  ADD COLUMN IF NOT EXISTS site_id TEXT NOT NULL DEFAULT '000001';

ALTER TABLE product_prices DROP CONSTRAINT IF EXISTS fk_product_prices_site;
ALTER TABLE product_prices
  ADD CONSTRAINT fk_product_prices_site
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_product_prices_site ON product_prices(site_id);

-- ============================================================
-- 修正 5：chat.conversations.agent_id —— 加外键
-- ============================================================
UPDATE chat.conversations
SET agent_id = NULL
WHERE agent_id IS NOT NULL
  AND agent_id NOT IN (SELECT id FROM admin_users);

ALTER TABLE chat.conversations DROP CONSTRAINT IF EXISTS fk_conversations_agent;
ALTER TABLE chat.conversations
  ADD CONSTRAINT fk_conversations_agent
  FOREIGN KEY (agent_id) REFERENCES admin_users(id) ON DELETE SET NULL;

-- ============================================================
-- 修正 6：crawler_configs / crawler_products —— 加 site_id 外键
-- ============================================================
DELETE FROM crawler_configs
WHERE site_id NOT IN (SELECT site_id FROM sites);

DELETE FROM crawler_products
WHERE site_id NOT IN (SELECT site_id FROM sites);

ALTER TABLE crawler_configs DROP CONSTRAINT IF EXISTS fk_crawler_configs_site;
ALTER TABLE crawler_configs
  ADD CONSTRAINT fk_crawler_configs_site
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;

ALTER TABLE crawler_products DROP CONSTRAINT IF EXISTS fk_crawler_products_site;
ALTER TABLE crawler_products
  ADD CONSTRAINT fk_crawler_products_site
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;

-- ============================================================
-- 修正 7：collected_products —— 加 site_id 外键
-- ============================================================
DELETE FROM collected_products
WHERE site_id NOT IN (SELECT site_id FROM sites);

ALTER TABLE collected_products DROP CONSTRAINT IF EXISTS fk_collected_products_site;
ALTER TABLE collected_products
  ADD CONSTRAINT fk_collected_products_site
  FOREIGN KEY (site_id) REFERENCES sites(site_id) ON DELETE CASCADE;

COMMIT;