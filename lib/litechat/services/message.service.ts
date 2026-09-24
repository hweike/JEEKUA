// lib/litechat/services/message.service.ts
import sql from '@/lib/db/admin';
import { getConversationById } from './conversation.service';
import { Message } from '../types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHAT_SCHEMA = 'chat';

/**
 * 获取会话的所有消息（不分页，用于部分兼容场景）
 */
export async function getMessagesByConversation(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  const conversation = await getConversationById(conversationId, siteId);
  if (!conversation) {
    throw new Error('会话不存在或无权访问');
  }

  try {
    const rows = await sql`
      SELECT * FROM chat.messages
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;
    return rows;
  } catch (error) {
    console.error('获取消息失败:', error);
    throw new Error('获取消息失败');
  }
}

/**
 * 分页获取会话消息（支持时间范围和数量限制）
 */
export async function getMessagesWithPagination(
  conversationId: string,
  options: {
    limit?: number;
    before?: string;
    after?: string;
  },
  siteId: string = DEFAULT_SITE_ID
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const conversation = await getConversationById(conversationId, siteId);
  if (!conversation) {
    throw new Error('会话不存在或无权访问');
  }

  const { limit = 30, before, after } = options;

  // 动态 WHERE 条件
  const conditions: any[] = [sql`conversation_id = ${conversationId}`];
  if (before) conditions.push(sql`created_at < ${before}`);
  if (after) conditions.push(sql`created_at > ${after}`);

  const whereClause = conditions.reduce(
    (acc, cond, i) => (i === 0 ? cond : sql`${acc} AND ${cond}`),
    sql``
  );

  try {
    const rows = await sql<Message[]>`
      SELECT * FROM chat.messages
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit + 1}
    `;

    const hasMore = rows.length > limit;
    const messages = rows.slice(0, limit).reverse();
    return { messages, hasMore };
  } catch (error) {
    console.error('获取分页消息失败:', error);
    throw new Error('获取消息失败');
  }
}

export async function sendMessage(
  conversationId: string,
  content: string,
  senderType: 'visitor' | 'agent' | 'system',
  senderId?: string,
  senderEmail?: string,
  senderName?: string,
  contentType: 'text' | 'image' | 'link' = 'text',
  fileUrl?: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<Message> {
  // 验证会话存在
  const conversation = await getConversationById(conversationId, siteId);
  if (!conversation) {
    throw new Error('会话不存在或无权访问');
  }

  // 如果是管理员回复，自动更新会话状态
  if (senderType === 'agent') {
    await sql`
      UPDATE chat.conversations
      SET status = 'active',
          agent_id = ${senderId ?? null},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${conversationId}
    `;
  }

  // 插入消息
  const now = new Date().toISOString();
  const insertData = {
    conversation_id: conversationId,
    sender_type: senderType,
    sender_id: senderId || null,
    sender_email: senderEmail || null,
    sender_name: senderName || null,
    content: content || null,
    content_type: contentType || 'text',
    file_url: fileUrl || null,
    is_read: false,
    created_at: now,
  };

  console.log('[sendMessage] 插入数据:', JSON.stringify(insertData, null, 2));

  try {
    const rows = await sql<Message[]>`
      INSERT INTO chat.messages ${sql(insertData)}
      RETURNING *
    `;

    if (!rows[0]) {
      throw new Error('插入消息未返回数据');
    }

    // 更新会话最后活动时间
    await sql`
      UPDATE chat.conversations
      SET last_message_at = ${now}
      WHERE id = ${conversationId}
    `;

    return rows[0];
  } catch (error: any) {
    console.error('[sendMessage] 插入失败:', error);
    throw new Error(`发送消息失败: ${error.message || '未知错误'}`);
  }
}

export async function markMessagesAsRead(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  try {
    await sql`
      UPDATE chat.messages
      SET is_read = true
      WHERE conversation_id = ${conversationId}
        AND sender_type = 'visitor'
        AND is_read = false
    `;
  } catch (error) {
    console.error('标记已读失败:', error);
    throw new Error('标记已读失败');
  }
}

export async function getUnreadCount(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  try {
    const rows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count
      FROM chat.messages
      WHERE conversation_id = ${conversationId}
        AND sender_type = 'visitor'
        AND is_read = false
    `;
    return parseInt(rows[0]?.count || '0', 10);
  } catch (error) {
    console.error('获取未读消息数失败:', error);
    return 0;
  }
}