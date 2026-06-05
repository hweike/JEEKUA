import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 类型定义
export interface Conversation {
  id: string;
  site_id: string;
  contact: string;
  created_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_admin: boolean;
  created_at: number;
}

// 根据联系方式获取会话
export async function getConversationByContact(contact: string): Promise<Conversation | undefined> {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('contact', contact)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`getConversationByContact failed: ${error.message}`);
  return data || undefined;
}

// 创建新会话
export async function createConversation(contact: string, id?: string): Promise<Conversation> {
  const convId = id || crypto.randomUUID();
  const now = Date.now();
  const { data, error } = await supabase
    .from('conversations')
    .insert({
      id: convId,
      site_id: DEFAULT_SITE_ID,
      contact,
      created_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(`createConversation failed: ${error.message}`);
  return data as Conversation;
}

// 获取会话的所有消息
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`getMessages failed: ${error.message}`);
  return (data || []).map(item => ({
    id: item.id,
    conversation_id: item.conversation_id,
    content: item.content,
    is_admin: item.is_admin === 1,
    created_at: item.created_at,
  }));
}

// 添加消息
export async function addMessage(conversationId: string, content: string, isAdmin: boolean): Promise<Message> {
  const id = crypto.randomUUID();
  const now = Date.now();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      id,
      conversation_id: conversationId,
      content,
      is_admin: isAdmin ? 1 : 0,
      created_at: now,
    })
    .select()
    .single();
  if (error) throw new Error(`addMessage failed: ${error.message}`);
  return {
    id: data.id,
    conversation_id: data.conversation_id,
    content: data.content,
    is_admin: data.is_admin === 1,
    created_at: data.created_at,
  };
}

// 获取所有会话（按最近消息时间排序，用于后台）
export async function getAllConversations(): Promise<(Conversation & { last_message_at: number; last_message_preview: string })[]> {
  const { data: convs, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .order('created_at', { ascending: false });
  if (convError) throw new Error(`getAllConversations convError: ${convError.message}`);

  const result = [];
  for (const conv of convs || []) {
    const { data: lastMsg, error: msgError } = await supabase
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (msgError) console.error(`获取会话 ${conv.id} 最后消息失败:`, msgError);
    result.push({
      ...conv,
      last_message_at: lastMsg?.created_at || conv.created_at,
      last_message_preview: lastMsg?.content?.slice(0, 50) || '',
    });
  }
  result.sort((a, b) => b.last_message_at - a.last_message_at);
  return result;
}