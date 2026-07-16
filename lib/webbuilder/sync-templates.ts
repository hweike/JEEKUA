// lib/webbuilder/sync-templates.ts
import { supabase } from '@/lib/supabase/client';
import { readPage, writePage } from '@/lib/pages/storage';
import { PageData } from '@/types/page';
import { createHash } from 'crypto';
import { updateTemplateSyncStatus } from './services/template.service';

const SITE_ID = '000001';

function computeTemplateHash(data: any): string {
  return createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

/**
 * 同步模板数据到所有引用的页面
 * 不再需要 taskId，状态直接更新到模板文件
 */
export async function syncTemplateToPages(
  templateId: string,
  templateData: any,
  newHash: string
): Promise<void> {
  console.log(`[sync] 开始同步模板 ${templateId}，哈希 ${newHash}`);

  const { data: pages, error } = await supabase
    .from('site_pages')
    .select('id, locale, template_hash')
    .eq('site_id', SITE_ID)
    .eq('template', templateId);

  if (error) {
    console.error(`[sync] 查询页面失败:`, error);
    await updateTemplateSyncStatus(templateId, 'error');
    throw error;
  }

  if (!pages || pages.length === 0) {
    console.log(`[sync] 模板 ${templateId} 未被任何页面引用，无需同步`);
    await updateTemplateSyncStatus(templateId, 'done');
    return;
  }

  console.log(`[sync] 找到 ${pages.length} 个引用页面`);

  let updatedCount = 0;
  let hasError = false;

  for (const row of pages) {
    const { id: pageId, locale, template_hash: oldHash } = row;
    if (oldHash === newHash) {
      continue;
    }

    try {
      const page = await readPage(locale, pageId);
      if (!page) {
        console.warn(`[sync] 页面 ${locale}/${pageId} 不存在，跳过`);
        continue;
      }

      const updatedPage: PageData = {
        ...page,
        templateData: templateData,
        templateHash: newHash,
        updatedAt: new Date().toISOString(),
      };

      await writePage(locale, updatedPage);
      updatedCount++;
      console.log(`[sync] 已更新页面 ${locale}/${pageId}`);
    } catch (err) {
      console.error(`[sync] 更新页面 ${locale}/${pageId} 失败:`, err);
      hasError = true;
    }
  }

  console.log(`[sync] 同步完成: 更新 ${updatedCount}，总计 ${pages.length}`);

  // 根据同步结果更新模板状态
  if (hasError) {
    await updateTemplateSyncStatus(templateId, 'error');
  } else {
    await updateTemplateSyncStatus(templateId, 'done');
  }
}