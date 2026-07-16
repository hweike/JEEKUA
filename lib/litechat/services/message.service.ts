// lib/litechat/services/message.service.ts
import { supabase } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
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

  const { data, error } = await supabase
    .schema(CHAT_SCHEMA)
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('获取消息失败:', error);
    throw new Error('获取消息失败');
  }
  return data || [];
}

/**
 * 分页获取会话消息（支持时间范围和数量限制）
 * @param conversationId 会话ID
 * @param options.limit 每页数量，默认30
 * @param options.before 获取此时间之前的消息（ISO字符串），用于加载更早的消息
 * @param options.after 获取此时间之后的消息（ISO字符串），用于初始加载（如最近7天）
 * @param siteId 站点ID
 * @returns { messages: Message[], hasMore: boolean }
 */
export async function getMessagesWithPagination(
  conversationId: string,
  options: {
    limit?: number;
    before?: string; // ISO 时间字符串
    after?: string;  // ISO 时间字符串
  },
  siteId: string = DEFAULT_SITE_ID
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const conversation = await getConversationById(conversationId, siteId);
  if (!conversation) {
    throw new Error('会话不存在或无权访问');
  }

  const { limit = 30, before, after } = options;
  let query = supabase
    .schema(CHAT_SCHEMA)
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // 多取一条判断是否有更多

  if (before) {
    query = query.lt('created_at', before);
  }
  if (after) {
    query = query.gt('created_at', after);
  }

  const { data, error } = await query;
  if (error) {
    console.error('获取分页消息失败:', error);
    throw new Error('获取消息失败');
  }

  const hasMore = (data?.length || 0) > limit;
  const messages = (data || []).slice(0, limit).reverse(); // 反转成正序（从旧到新）
  return { messages, hasMore };
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

  // 根据发送者类型选择客户端
  const client = senderType === 'agent' ? getSupabaseAdminClient() : supabase;

  // 如果是管理员回复，自动更新会话状态
  if (senderType === 'agent') {
    const adminClient = getSupabaseAdminClient();
    await adminClient
      .schema(CHAT_SCHEMA)
      .from('conversations')
      .update({
        status: 'active',
        agent_id: senderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
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

  const { data, error } = await client
    .schema(CHAT_SCHEMA)
    .from('messages')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[sendMessage] 插入失败:', JSON.stringify(error, null, 2));
    throw new Error(`发送消息失败: ${error.message || error.details || '未知错误'}`);
  }

  // 更新会话最后活动时间
  await supabase
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .update({ last_message_at: now })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesAsRead(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'visitor')
    .eq('is_read', false);

  if (error) {
    console.error('标记已读失败:', error);
    throw new Error('标记已读失败');
  }
}

export async function getUnreadCount(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { count, error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq('sender_type', 'visitor')
    .eq('is_read', false);

  if (error) {
    console.error('获取未读消息数失败:', error);
    return 0;
  }
  return count || 0;
}