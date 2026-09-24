// lib/litechat/services/quick-reply.service.ts
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHAT_SCHEMA = 'chat';

export interface QuickReply {
  id: string;
  site_id: string;
  title: string;
  content: string;
  created_by: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuickReplyWithOwner extends QuickReply {
  is_owner: boolean;
}

/**
 * 获取所有常用回复语
 */
export async function getQuickReplies(
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReplyWithOwner[]> {
  try {
    const data = await sql<QuickReply[]>`
      SELECT * FROM chat.quick_replies
      WHERE site_id = ${siteId}
      ORDER BY sort_order ASC, created_at ASC
    `;

    // 按创建者排序：自己的排前面
    const sorted = data.sort((a, b) => {
      const aSelf = a.created_by === adminId ? 0 : 1;
      const bSelf = b.created_by === adminId ? 0 : 1;
      if (aSelf !== bSelf) return aSelf - bSelf;
      return a.sort_order - b.sort_order || (a.created_at < b.created_at ? -1 : 1);
    });

    return sorted.map(item => ({
      ...item,
      is_owner: item.created_by === adminId,
    }));
  } catch (error) {
    console.error('获取常用回复语失败:', error);
    throw error;
  }
}

/**
 * 创建常用回复语
 */
export async function createQuickReply(
  title: string,
  content: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReply> {
  try {
    const rows = await sql<QuickReply[]>`
      INSERT INTO chat.quick_replies (site_id, title, content, created_by, sort_order)
      VALUES (${siteId}, ${title.trim()}, ${content.trim()}, ${adminId}, 0)
      RETURNING *
    `;
    if (!rows[0]) throw new Error('创建常用回复语未返回数据');
    return rows[0];
  } catch (error) {
    console.error('创建常用回复语失败:', error);
    throw error;
  }
}

/**
 * 更新常用回复语（仅创建者）
 */
export async function updateQuickReply(
  id: string,
  title: string,
  content: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<QuickReply> {
  // 1. 检查是否是创建者
  const existing = await sql<{ created_by: string }[]>`
    SELECT created_by FROM chat.quick_replies
    WHERE id = ${id} AND site_id = ${siteId}
    LIMIT 1
  `;

  if (!existing[0]) {
    throw new Error('常用回复语不存在');
  }

  if (existing[0].created_by !== adminId) {
    throw new Error('无权编辑此常用回复语');
  }

  // 2. 更新
  try {
    const rows = await sql<QuickReply[]>`
      UPDATE chat.quick_replies
      SET title = ${title.trim()},
          content = ${content.trim()},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${id} AND site_id = ${siteId}
      RETURNING *
    `;
    if (!rows[0]) throw new Error('更新常用回复语未返回数据');
    return rows[0];
  } catch (error) {
    console.error('更新常用回复语失败:', error);
    throw error;
  }
}

/**
 * 删除常用回复语（仅创建者）
 */
export async function deleteQuickReply(
  id: string,
  adminId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<void> {
  // 1. 检查是否是创建者
  const existing = await sql<{ created_by: string }[]>`
    SELECT created_by FROM chat.quick_replies
    WHERE id = ${id} AND site_id = ${siteId}
    LIMIT 1
  `;

  if (!existing[0]) {
    throw new Error('常用回复语不存在');
  }

  if (existing[0].created_by !== adminId) {
    throw new Error('无权删除此常用回复语');
  }

  // 2. 删除
  try {
    await sql`
      DELETE FROM chat.quick_replies
      WHERE id = ${id} AND site_id = ${siteId}
    `;
  } catch (error) {
    console.error('删除常用回复语失败:', error);
    throw error;
  }
}