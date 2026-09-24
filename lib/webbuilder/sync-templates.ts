// lib/webbuilder/sync-templates.ts
import sql from '@/lib/db/admin';
import { createHash } from 'crypto';
import { bumpVersion } from '@/lib/cache/cache-version';

const SITE_ID = '000001';

const LAYOUT_CATEGORIES = [
  'product',
  'product_category',
  'product_line',
  'document',
  'document_library',
  'blog',
  'blog_post',
  'blog_collection',
  'video_category',
  'video',
] as const;

function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function generateStableLayoutId(templateId: string, category: string): string {
  const prefix = `default_${category}_`;
  if (templateId.startsWith(prefix) && templateId.endsWith('_published')) {
    const suffix = templateId.slice(prefix.length, -10);
    if (suffix) {
      return `${category}_${suffix}_layout`;
    }
    return `${category}_layout`;
  }
  const base = templateId.replace(/_(published|draft)$/, '');
  return `${category}_${base}_layout`;
}

export async function syncTemplateToPages(
  templateId: string,
  templateData: any,
  newHash: string,
  category?: string,
  targetLayoutId?: string
): Promise<{
  updated: number;
  skipped: number;
  failed: number;
  affectedPages: Array<{ locale: string; slug: string }>;
}> {
  console.log(`[sync] 开始同步模板 ${templateId}，哈希 ${newHash}`);

  // ========== 1. 查询所有引用该模板的页面 ==========
  let pages: Array<{ id: string; locale: string; slug: string; template_hash: string | null }> = [];
  try {
    pages = await sql<{ id: string; locale: string; slug: string; template_hash: string | null }[]>`
      SELECT id, locale, slug, template_hash FROM public.site_pages
      WHERE site_id = ${SITE_ID}
        AND template = ${templateId}
    `;
  } catch (error) {
    console.error(`[sync] 查询页面失败:`, error);
    throw error;
  }

  // ========== 2. 有引用页面：批量 UPDATE ==========
  if (pages && pages.length > 0) {
    console.log(`[sync] 找到 ${pages.length} 个引用页面`);

    const stalePages = pages.filter(
      row => row.template_hash === null || row.template_hash !== newHash
    );
    const skippedCount = pages.length - stalePages.length;

    if (stalePages.length === 0) {
      console.log(`[sync] 所有页面哈希一致，无需更新`);
      return { updated: 0, skipped: skippedCount, failed: 0, affectedPages: [] };
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    try {
      const result = await sql`
        UPDATE public.site_pages
        SET template_data = ${sql.json(templateData)},
            template_hash = ${newHash},
            updated_at = ${now}
        WHERE site_id = ${SITE_ID}
          AND template = ${templateId}
          AND (template_hash IS NULL OR template_hash != ${newHash})
      `;
      updatedCount = result.count;
    } catch (error: any) {
      console.error(`[sync] 批量更新失败:`, error);
      return { updated: 0, skipped: skippedCount, failed: stalePages.length, affectedPages: [] };
    }

    console.log(`[sync] 同步完成: 更新 ${updatedCount} 项，跳过 ${skippedCount} 项`);
    await bumpVersion('pages');
    console.log(`[sync] ✅ 已递增 pages 版本号`);

    const affectedPages = stalePages.map(p => ({ locale: p.locale, slug: p.slug }));
    return { updated: updatedCount, skipped: skippedCount, failed: 0, affectedPages };
  }

  // ========== 3. 无引用页面：自动创建布局 ==========
  if (!category || !LAYOUT_CATEGORIES.includes(category as any)) {
    console.log(
      `[sync] 模板 ${templateId} 未被任何页面引用，分类 ${category} 不需要自动创建布局，跳过`
    );
    return { updated: 0, skipped: 0, failed: 0, affectedPages: [] };
  }

  console.log(`[sync] 未找到引用页面，尝试自动创建布局记录 (category: ${category})`);

  const layoutId = targetLayoutId || generateStableLayoutId(templateId, category);
  console.log(`[sync] 使用布局 ID: ${layoutId}`);

  // 检查布局是否存在
  let existingLayout: { id: string; slug: string } | undefined;
  try {
    const rows = await sql<{ id: string; slug: string }[]>`
      SELECT id, slug FROM public.site_pages
      WHERE site_id = ${SITE_ID}
        AND id = ${layoutId}
        AND locale = 'base'
      LIMIT 1
    `;
    existingLayout = rows[0];
  } catch (error) {
    console.error(`[sync] 查询布局失败:`, error);
  }

  const now = new Date().toISOString();

  if (existingLayout) {
    console.log(`[sync] 布局 ${layoutId} 已存在，更新 template 关联及数据`);
    try {
      await sql`
        UPDATE public.site_pages
        SET template = ${templateId},
            template_data = ${sql.json(templateData)},
            template_hash = ${newHash},
            updated_at = ${now}
        WHERE site_id = ${SITE_ID}
          AND id = ${layoutId}
          AND locale = 'base'
      `;
    } catch (error: any) {
      console.error(`[sync] 更新布局 ${layoutId} 失败:`, error);
      return { updated: 0, skipped: 0, failed: 1, affectedPages: [] };
    }

    await bumpVersion('pages');
    console.log(`[sync] ✅ 已更新布局 ${layoutId}，递增 pages 版本号`);

    return {
      updated: 1,
      skipped: 0,
      failed: 0,
      affectedPages: existingLayout.slug ? [{ locale: 'base', slug: existingLayout.slug }] : [],
    };
  }

  // 新建布局记录
  try {
    await sql`
      INSERT INTO public.site_pages (
        site_id, id, locale, title, type, preset, visible,
        template, template_data, template_hash, slug, created_at, updated_at
      ) VALUES (
        ${SITE_ID}, ${layoutId}, 'base',
        ${`${category} 布局 (${templateId})`},
        ${category}, true, 'visible',
        ${templateId}, ${sql.json(templateData)}, ${newHash},
        ${layoutId}, ${now}, ${now}
      )
    `;
  } catch (error: any) {
    console.error(`[sync] 自动创建布局 ${layoutId} 失败:`, error);
    return { updated: 0, skipped: 0, failed: 1, affectedPages: [] };
  }

  await bumpVersion('pages');
  console.log(`[sync] ✅ 已自动创建布局 ${layoutId}，递增 pages 版本号`);

  return {
    updated: 1,
    skipped: 0,
    failed: 0,
    affectedPages: [{ locale: 'base', slug: layoutId }],
  };
}