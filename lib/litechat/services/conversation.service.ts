// lib/litechat/services/conversation.service.ts
import { supabase } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/admin-client';
import { getOrCreateChatCustomer } from './customer.service';
import { getAdminInfoById, getAdminOnlineStatus } from './admin.service';
import { Conversation, ConversationWithLastMessage } from '../types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const CHAT_SCHEMA = 'chat';

// ============================================================
// 内部辅助函数
// ============================================================

/**
 * 获取超级管理员（role = 'super'）
 * 如果存在多个，返回第一个
 */
async function getSuperAdmin(siteId: string = DEFAULT_SITE_ID) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('site_id', siteId)
    .eq('role', 'super')
    .maybeSingle();

  if (error) {
    console.error('查询超级管理员失败:', error);
    return null;
  }
  return data;
}

/**
 * 插入系统消息（发送者类型为 'system'）
 */
async function insertSystemMessage(conversationId: string, content: string) {
  const { error } = await supabase
    .schema(CHAT_SCHEMA)
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_type: 'system',
      content,
      content_type: 'text',
      is_read: false,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('插入系统消息失败:', error);
  }
}

/**
 * 自动发送欢迎语或离线回复
 * - 如果有超级管理员且在线 → 发送管理员欢迎语
 * - 如果有超级管理员但离线 → 发送管理员离线回复
 * - 如果没有超级管理员 → 发送默认消息
 */
async function sendAutoWelcomeMessage(conversationId: string, siteId: string) {
  try {
    // 1. 获取会话的管理员（如果有分配）
    const { data: conversation } = await supabase
      .schema(CHAT_SCHEMA)
      .from('conversations')
      .select('agent_id')
      .eq('id', conversationId)
      .single();

    // 2. 如果没有分配管理员，使用默认消息
    if (!conversation?.agent_id) {
      await insertSystemMessage(
        conversationId,
        '您好，感谢您的咨询！客服将会尽快回复您。'
      );
      return;
    }

    // 3. 获取管理员信息（含欢迎语、离线回复）
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
    // 不抛出错误，不影响会话创建
  }
}

// ============================================================
// 对外服务函数
// ============================================================

/**
 * 获取或创建会话（访客端）
 * - 如果客户已有未关闭的会话，返回现有的
 * - 否则创建新会话，并自动分配超级管理员
 * - 创建后自动发送欢迎语或离线回复
 */
export async function getOrCreateConversation(
  email: string,
  name?: string,
  siteId: string = DEFAULT_SITE_ID
) {
  // 1. 确保客户存在（自动创建）
  const customer = await getOrCreateChatCustomer(email, name, siteId);

  // 2. 查找该客户未关闭的会话
  const { data: existing, error: findError } = await supabase
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .select('*')
    .eq('site_id', siteId)
    .eq('customer_id', customer.id)
    .neq('status', 'closed')
    .order('last_message_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    console.error('查询会话失败:', findError);
    throw new Error('查询会话失败');
  }

  if (existing) {
    return existing;
  }

  // 3. 创建新会话
  const now = new Date().toISOString();

  // ===== 自动分配超级管理员 =====
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

  // 如果有超级管理员，自动分配
  if (agentId) {
    insertData.agent_id = agentId;
  }

  const { data: newConversation, error: insertError } = await supabase
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error('创建会话失败:', insertError);
    throw new Error('创建会话失败');
  }

  // 4. 自动发送欢迎语或离线回复
  await sendAutoWelcomeMessage(newConversation.id, siteId);

  return newConversation;
}

/**
 * 获取单个会话（用于验证权限）
 */
export async function getConversationById(
  conversationId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  const { data, error } = await supabase
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('site_id', siteId)
    .maybeSingle();

  if (error) {
    console.error('获取会话失败:', error);
    return null;
  }
  return data;
}

/**
 * 获取客户的所有会话（用于前台显示历史）
 */
export async function getCustomerConversations(
  customerId: string,
  siteId: string = DEFAULT_SITE_ID
) {
  const { data, error } = await supabase
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .select('*')
    .eq('site_id', siteId)
    .eq('customer_id', customerId)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('获取客户会话列表失败:', error);
    return [];
  }
  return data;
}

/**
 * 获取所有会话（管理员后台）
 * 使用 supabaseAdmin 绕过权限限制
 */
export async function getAllConversationsForAdmin(
  siteId: string = DEFAULT_SITE_ID,
  agentId?: string
): Promise<ConversationWithLastMessage[]> {
  const supabaseAdmin = getSupabaseAdminClient();

  let query = supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .select('*')
    .eq('site_id', siteId);

  if (agentId) {
    query = query.or(`agent_id.is.null,agent_id.eq.${agentId}`);
  }

  const { data: convs, error: convError } = await query
    .order('last_message_at', { ascending: false });

  if (convError) {
    console.error('获取会话列表失败:', convError);
    throw convError;
  }

  if (!convs || convs.length === 0) {
    return [];
  }

  // 获取客户信息（first_name, last_name, name, source）
  const customerIds = convs.map(c => c.customer_id).filter(Boolean);
  let customerInfoMap: Record<string, { first_name?: string; last_name?: string; name?: string; source?: string }> = {};
  if (customerIds.length > 0) {
    const { data: customers, error: custError } = await supabaseAdmin
      .from('customers')
      .select('id, first_name, last_name, name, source')
      .eq('site_id', siteId)
      .in('id', customerIds);
    if (!custError && customers) {
      customerInfoMap = customers.reduce((map, c) => {
        map[c.id] = { first_name: c.first_name, last_name: c.last_name, name: c.name, source: c.source };
        return map;
      }, {} as Record<string, any>);
    }
  }

  // 批量获取每个会话的消息（用于计算未读和预览）
  const result: ConversationWithLastMessage[] = [];
  for (const conv of convs) {
    const { data: msgs, error: msgError } = await supabaseAdmin
      .schema(CHAT_SCHEMA)
      .from('messages')
      .select('content, content_type, is_read, sender_type, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.warn(`获取会话 ${conv.id} 消息失败:`, msgError);
      result.push({
        ...conv,
        source: customerInfoMap[conv.customer_id]?.source || 'unknown',
        display_name: '匿名',
        last_message_content: '',
        last_message_type: '',
        unread_count: 0,
      });
      continue;
    }

    const lastMsg = msgs && msgs.length > 0 ? msgs[msgs.length - 1] : null;
    const unreadCount = msgs
      ? msgs.filter((m: any) => m.sender_type === 'visitor' && !m.is_read).length
      : 0;

    // 计算 display_name
    const customerInfo = customerInfoMap[conv.customer_id] || {};
    let displayName = '匿名';

    // 第1层：优先使用 name（用户填写的姓名）
    if (customerInfo.name && customerInfo.name.trim()) {
      displayName = customerInfo.name.trim();
    } else {
      // 第2层：使用 first_name + last_name（用下划线连接）
      const firstName = customerInfo.first_name || '';
      const lastName = customerInfo.last_name || '';
      const combined = [firstName, lastName].filter(Boolean).join('_');
      if (combined && combined.trim()) {
        displayName = combined;
      }
      // 否则保持 '匿名'
    }

    // 第3层：如果 source === 'chat'，追加 '（访客）' 标签
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

/**
 * 更新会话状态（管理员操作）
 * 使用 supabaseAdmin
 */
export async function updateConversationStatus(
  conversationId: string,
  status: 'pending' | 'active' | 'closed',
  siteId: string = DEFAULT_SITE_ID
) {
  const supabaseAdmin = getSupabaseAdminClient();
  const { error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('site_id', siteId);

  if (error) {
    console.error('更新会话状态失败:', error);
    throw new Error('更新会话状态失败');
  }
}

/**
 * 分配会话给指定管理员
 */
export async function assignConversation(
  conversationId: string,
  agentId: string,
  siteId: string = DEFAULT_SITE_ID
): Promise<Conversation> {
  const supabaseAdmin = getSupabaseAdminClient();
  
  // 验证会话是否存在
  const { data: conv, error: findError } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('site_id', siteId)
    .single();

  if (findError || !conv) {
    throw new Error('会话不存在');
  }

  // 验证管理员是否存在
  const { data: admin, error: adminError } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', agentId)
    .single();

  if (adminError || !admin) {
    throw new Error('管理员不存在');
  }

  // 更新会话
  const { data, error } = await supabaseAdmin
    .schema(CHAT_SCHEMA)
    .from('conversations')
    .update({
      agent_id: agentId,
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('site_id', siteId)
    .select()
    .single();

  if (error) {
    console.error('分配会话失败:', error);
    throw error;
  }

  return data;
}