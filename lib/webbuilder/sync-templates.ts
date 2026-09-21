// lib/webbuilder/sync-templates.ts
import { supabase } from '@/lib/supabase/client';
import { createHash } from 'crypto';

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
): Promise<{ updated: number; skipped: number; failed: number }> {
  console.log(`[sync] 开始同步模板 ${templateId}，哈希 ${newHash}`);

  // ========== 1. 查询所有引用该模板的页面 ==========
  const { data: pages, error } = await supabase
    .from('site_pages')
    .select('id, locale, template_hash')
    .eq('site_id', SITE_ID)
    .eq('template', templateId);

  if (error) {
    console.error(`[sync] 查询页面失败:`, error);
    throw error;
  }

  // ========== 2. 有引用页面：一次批量 UPDATE ==========
  if (pages && pages.length > 0) {
    console.log(`[sync] 找到 ${pages.length} 个引用页面`);

    // 计算需要更新的数量（包含 NULL）
    const staleCount = pages.filter(
      row => row.template_hash === null || row.template_hash !== newHash
    ).length;
    const skippedCount = pages.length - staleCount;

    if (staleCount === 0) {
      console.log(`[sync] 所有页面哈希一致，无需更新`);
      return { updated: 0, skipped: skippedCount, failed: 0 };
    }

    const now = new Date().toISOString();

    // ✅ 一次 UPDATE，更新所有哈希不同或为 NULL 的记录
    const { error: updateError, count } = await supabase
      .from('site_pages')
      .update(
        {
          template_data: templateData,
          template_hash: newHash,
          updated_at: now,
        },
        { count: 'exact' }  // 显式请求 count
      )
      .eq('site_id', SITE_ID)
      .eq('template', templateId)
      .or(`template_hash.is.null,template_hash.neq.${newHash}`);  // ✅ 包含 NULL

    if (updateError) {
      console.error(`[sync] 批量更新失败:`, updateError);
      return { updated: 0, skipped: skippedCount, failed: staleCount };
    }

    const updatedCount = count ?? staleCount;
    console.log(
      `[sync] 同步完成: 更新 ${updatedCount} 项，跳过 ${skippedCount} 项`
    );
    return { updated: updatedCount, skipped: skippedCount, failed: 0 };
  }

  // ========== 3. 无引用页面：仅对需要布局的分类自动创建 ==========
  if (!category || !LAYOUT_CATEGORIES.includes(category as any)) {
    console.log(
      `[sync] 模板 ${templateId} 未被任何页面引用，分类 ${category} 不需要自动创建布局，跳过`
    );
    return { updated: 0, skipped: 0, failed: 0 };
  }

  console.log(`[sync] 未找到引用页面，尝试自动创建布局记录 (category: ${category})`);

  const layoutId = targetLayoutId || generateStableLayoutId(templateId, category);
  console.log(`[sync] 使用布局 ID: ${layoutId}`);

  const { data: existingLayout } = await supabase
    .from('site_pages')
    .select('id')
    .eq('site_id', SITE_ID)
    .eq('id', layoutId)
    .eq('locale', 'base')
    .maybeSingle();

  const now = new Date().toISOString();

  if (existingLayout) {
    console.log(`[sync] 布局 ${layoutId} 已存在，更新 template 关联及数据`);
    const { error: updateError } = await supabase
      .from('site_pages')
      .update({
        template: templateId,
        template_data: templateData,
        template_hash: newHash,
        updated_at: now,
      })
      .eq('site_id', SITE_ID)
      .eq('id', layoutId)
      .eq('locale', 'base');

    if (updateError) {
      console.error(`[sync] 更新布局 ${layoutId} 失败:`, updateError);
      return { updated: 0, skipped: 0, failed: 1 };
    }

    console.log(`[sync] 已更新布局 ${layoutId}`);
    return { updated: 1, skipped: 0, failed: 0 };
  }

  // 新建布局记录
  const { error: insertError } = await supabase
    .from('site_pages')
    .insert({
      site_id: SITE_ID,
      id: layoutId,
      locale: 'base',
      title: `${category} 布局 (${templateId})`,
      type: category,
      preset: true,
      visible: 'visible',
      template: templateId,
      template_data: templateData,
      template_hash: newHash,
      slug: layoutId,
      created_at: now,
      updated_at: now,
    });

  if (insertError) {
    console.error(`[sync] 自动创建布局 ${layoutId} 失败:`, insertError);
    return { updated: 0, skipped: 0, failed: 1 };
  }

  console.log(`[sync] 已自动创建布局 ${layoutId}`);
  return { updated: 1, skipped: 0, failed: 0 };
}