// lib/litechat/services/conversation.service.ts
import sql from '@/lib/db/admin';
import { getOrCreateChatCustomer } from './customer.service';
import { getAdminInfoById, getAdminOnlineStatus } from './admin.service';
import { Conversation, ConversationWithLastMessage } from '../types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHAT_SCHEMA = 'chat';

// ============================================================
// 内部辅助函数
// ============================================================

async function getSuperAdmin(siteId: string = DEFAULT_SITE_ID) {
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.admin_users
      WHERE site_id = ${siteId}
        AND role = 'super'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('查询超级管理员失败:', error);
    return null;
  }
}

async function insertSystemMessage(conversationId: string, content: string) {
  try {
    await sql`
      INSERT INTO chat.messages (
        conversation_id, sender_type, content, content_type, is_read, created_at
      ) VALUES (
        ${conversationId}, 'system', ${content}, 'text', false, ${new Date().toISOString()}
      )
    `;
  } catch (error) {
    console.error('插入系统消息失败:', error);
  }
}

async function sendAutoWelcomeMessage(conversationId: string, siteId: string) {
  try {
    // 1. 获取会话的管理员
    const convRows = await sql<{ agent_id: string | null }[]>`
      SELECT agent_id FROM chat.conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `;
    const conversation = convRows[0];

    // 2. 如果没有分配管理员，使用默认消息
    if (!conversation?.agent_id) {
      await insertSystemMessage(
        conversationId,
        '您好，感谢您的咨询！客服将会尽快回复您。'
      );
      return;
    }

    // 3. 获取管理员信息
    const admin = await getAdminInfoById(conversation.agent_id);
    if (!admin) {
      await insertSystemMessage(
        conversationId,
        '您好，感谢您的咨询！客服将会尽快回复您。'
      );
      return;
    }

    // 4. 判断在线状态
    const onlineInfo = getAdminOnlineStatus(admin);

    // 5. 发送对应的消息
    let message = '';
    if (onlineInfo.isOnline) {
      message = admin.default_welcome || '您好，很高兴为您服务！请问有什么可以帮您的？';
    } else {
      message = admin.offline_reply || '您好，当前不在线，我们会尽快回复您。';
    }

    await insertSystemMessage(conversationId, message);
  } catch (error) {
    console.error('发送自动欢迎消息失败:', error);
  }
}

// ============================================================
// 对外服务函数
// ============================================================

export async function getOrCreateConversation(
  email: string,
  name?: string,
  siteId: string = DEFAULT_SITE_ID
) {
  // 1. 确保客户存在
  const customer = await getOrCreateChatCustomer(email, name, siteId);

  // 2. 查找该客户未关闭的会话
  const existingRows = await sql<any[]>`
    SELECT * FROM chat.conversations
    WHERE site_id = ${siteId}
      AND customer_id = ${customer.id}
      AND status != 'closed'
    ORDER BY last_message_at DESC
    LIMIT 1
  `;

  if (existingRows[0]) {
    return existingRows[0];
  }

  // 3. 创建新会话
  const now = new Date().toISOString();

  const superAdmin = await getSuperAdmin(siteId);
  const agentId = superAdmin?.id || null;

  const insertData: any = {
    site_id: siteId,
    customer_id: customer.id,
    customer_email: email,
    customer_name: name || customer.name || '访客',
    status: 'pending',
    last_message_at: now,
    created_at: now,
    updated_at: now,
  };

  if (agentId) {
    insertData.agent_id = agentId;
  }

  const newRows = await sql<any[]>`
    INSERT INTO chat.conversations ${sql(insertData)}
    RETURNING *
  `;

  if (!newRows[0]) {
    throw new Error('创建会话失败');
  }

  const newConversation = newRows[0];

  // 4. 自动发送欢迎语或离线回复
  await sendAutoWelcomeMessage(newConversation.id, siteId);

  return newConversation;
}

export async function getConversationById(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM chat.conversations
      WHERE id = ${conversationId}
        AND site_id = ${siteId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('获取会话失败:', error);
    return null;
  }
}

export async function getCustomerConversations(
  customerId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  try {
    return await sql<any[]>`
      SELECT * FROM chat.conversations
      WHERE site_id = ${siteId}
        AND customer_id = ${customerId}
      ORDER BY last_message_at DESC
    `;
  } catch (error) {
    console.error('获取客户会话列表失败:', error);
    return [];
  }
}

export async function getAllConversationsForAdmin(
  siteId: string = DEFAULT_SITE_ID,
  agentId?: string
): Promise<ConversationWithLastMessage[]> {
  // 1. 查询会话
  let convs: any[];
  if (agentId) {
    convs = await sql<any[]>`
      SELECT * FROM chat.conversations
      WHERE site_id = ${siteId}
        AND (agent_id IS NULL OR agent_id = ${agentId})
      ORDER BY last_message_at DESC
    `;
  } else {
    convs = await sql<any[]>`
      SELECT * FROM chat.conversations
      WHERE site_id = ${siteId}
      ORDER BY last_message_at DESC
    `;
  }

  if (!convs || convs.length === 0) {
    return [];
  }

  // 2. 批量获取客户信息
  const customerIds = convs.map(c => c.customer_id).filter(Boolean);
  let customerInfoMap: Record<string, { first_name?: string; last_name?: string; name?: string; source?: string }> = {};

  if (customerIds.length > 0) {
    try {
      const customers = await sql<any[]>`
        SELECT id, first_name, last_name, name, source
        FROM public.customers
        WHERE site_id = ${siteId}
          AND id IN ${sql(customerIds)}
      `;
      customerInfoMap = customers.reduce((map, c) => {
        map[c.id] = {
          first_name: c.first_name,
          last_name: c.last_name,
          name: c.name,
          source: c.source,
        };
        return map;
      }, {} as Record<string, any>);
    } catch (err) {
      console.warn('获取客户信息失败:', err);
    }
  }

  // 3. 批量获取消息（优化：一次查询所有会话的消息）
  const conversationIds = convs.map(c => c.id);
  let messagesByConv: Record<string, any[]> = {};

  if (conversationIds.length > 0) {
    try {
      const allMessages = await sql<any[]>`
        SELECT conversation_id, content, content_type, is_read, sender_type, created_at
        FROM chat.messages
        WHERE conversation_id IN ${sql(conversationIds)}
        ORDER BY created_at ASC
      `;
      messagesByConv = allMessages.reduce((map, m) => {
        if (!map[m.conversation_id]) map[m.conversation_id] = [];
        map[m.conversation_id].push(m);
        return map;
      }, {} as Record<string, any[]>);
    } catch (err) {
      console.warn('批量获取消息失败:', err);
    }
  }

  // 4. 组装结果
  const result: ConversationWithLastMessage[] = [];
  for (const conv of convs) {
    const msgs = messagesByConv[conv.id] || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const unreadCount = msgs.filter(
      (m: any) => m.sender_type === 'visitor' && !m.is_read
    ).length;

    const customerInfo = customerInfoMap[conv.customer_id] || {};
    let displayName = '匿名';

    if (customerInfo.name && customerInfo.name.trim()) {
      displayName = customerInfo.name.trim();
    } else {
      const firstName = customerInfo.first_name || '';
      const lastName = customerInfo.last_name || '';
      const combined = [firstName, lastName].filter(Boolean).join('_');
      if (combined && combined.trim()) {
        displayName = combined;
      }
    }

    if (customerInfo.source === 'chat') {
      displayName += '（访客）';
    }

    result.push({
      ...conv,
      source: customerInfo.source || 'unknown',
      display_name: displayName,
      last_message_content: lastMsg?.content || '',
      last_message_type: lastMsg?.content_type || '',
      unread_count: unreadCount,
    });
  }

  return result;
}

export async function updateConversationStatus(
  conversationId: string,
  status: 'pending' | 'active' | 'closed',
  siteId: string = DEFAULT_SITE_ID
) {
  try {
    await sql`
      UPDATE chat.conversations
      SET status = ${status},
          updated_at = ${new Date().toISOString()}
      WHERE id = ${conversationId}
        AND site_id = ${siteId}
    `;
  } catch (error) {
    console.error('更新会话状态失败:', error);
    throw new Error('更新会话状态失败');
  }
}

export async function assignConversation(
  conversationId: string,
  agentId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<Conversation> {
  // 1. 验证会话存在
  const convRows = await sql<any[]>`
    SELECT * FROM chat.conversations
    WHERE id = ${conversationId}
      AND site_id = ${siteId}
    LIMIT 1
  `;
  if (!convRows[0]) {
    throw new Error('会话不存在');
  }

  // 2. 验证管理员存在
  const adminRows = await sql<{ id: string }[]>`
    SELECT id FROM public.admin_users
    WHERE id = ${agentId}
    LIMIT 1
  `;
  if (!adminRows[0]) {
    throw new Error('管理员不存在');
  }

  // 3. 更新会话
  const updatedRows = await sql<any[]>`
    UPDATE chat.conversations
    SET agent_id = ${agentId},
        status = 'active',
        updated_at = ${new Date().toISOString()}
    WHERE id = ${conversationId}
      AND site_id = ${siteId}
    RETURNING *
  `;

  if (!updatedRows[0]) {
    throw new Error('分配会话失败');
  }

  return updatedRows[0];
}