// lib/litechat/types.ts

/**
 * 会话数据结构
 */
export interface Conversation {
  id: string;
  site_id: string;
  customer_id: string;
  customer_email: string;
  customer_name?: string;
  agent_id?: string;
  status: 'pending' | 'active' | 'closed';
  last_message_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 消息数据结构
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'visitor' | 'agent' | 'system';
  sender_id?: string;
  sender_email?: string;
  sender_name?: string;
  content: string;
  content_type: 'text' | 'image' | 'link';
  file_url?: string;
  is_read: boolean;
  created_at: string;
}

/**
 * 管理员后台使用的会话扩展
 */
export interface ConversationWithLastMessage extends Conversation {
  last_message_content?: string;
  last_message_type?: string;
  unread_count?: number;
  source?: string;  // 新增：客户来源
  display_name?: string;  // 新增
}

/**
 * 创建会话时的参数
 */
export interface CreateConversationParams {
  site_id: string;
  customer_id: string;
  customer_email: string;
  customer_name?: string;
  status?: 'pending' | 'active' | 'closed';
}

/**
 * 创建消息时的参数
 */
export interface CreateMessageParams {
  conversation_id: string;
  sender_type: 'visitor' | 'agent' | 'system';
  sender_id?: string;
  sender_email?: string;
  sender_name?: string;
  content: string;
  content_type?: 'text' | 'image' | 'link';
  file_url?: string;
}