// lib/litechat/realtime.ts
import { supabase } from '@/lib/supabase/client';
import { Message } from './types';

const CHAT_SCHEMA = 'chat';

// 存储所有活跃订阅
const subscriptionStore = new Map<string, {
  channel: any;
  callback: (message: Message) => void;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  isSubscribed: boolean;
}>();

function toMessageDomain(record: any): Message {
  return {
    id: record.id,
    conversation_id: record.conversation_id,
    sender_type: record.sender_type,
    sender_id: record.sender_id,
    sender_email: record.sender_email,
    sender_name: record.sender_name,
    content: record.content,
    content_type: record.content_type || 'text',
    file_url: record.file_url,
    is_read: record.is_read || false,
    created_at: record.created_at,
  };
}

export function subscribeToMessages(
  conversationId: string,
  onNewMessage: (message: Message) => void
): () => void {
  // 如果已有订阅，先取消
  if (subscriptionStore.has(conversationId)) {
    const existing = subscriptionStore.get(conversationId)!;
    if (existing.channel) {
      supabase.removeChannel(existing.channel);
    }
    subscriptionStore.delete(conversationId);
  }

  let isSubscribed = true;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  const createSubscription = () => {
    if (!isSubscribed) return;

    const channel = supabase
      .channel(`litechat:messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: CHAT_SCHEMA,
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          if (isSubscribed) {
            try {
              const message = toMessageDomain(payload.new);
              onNewMessage(message);
            } catch (err) {
              console.error('[Realtime] 处理消息失败:', err);
            }
          }
        }
      )
      .subscribe((status) => {
        // 连接状态日志（仅在开发环境输出）
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Realtime] 会话 ${conversationId} 状态:`, status);
        }

        if (status === 'SUBSCRIBED') {
          reconnectAttempts = 0;
          // 更新存储状态
          const store = subscriptionStore.get(conversationId);
          if (store) {
            store.reconnectAttempts = 0;
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // 连接失败，尝试重连
          if (isSubscribed && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            console.log(`[Realtime] 重连尝试 ${reconnectAttempts}/${maxReconnectAttempts}`);
            setTimeout(() => {
              if (isSubscribed) {
                // 清理旧订阅
                const store = subscriptionStore.get(conversationId);
                if (store && store.channel) {
                  supabase.removeChannel(store.channel);
                }
                // 重新创建
                createSubscription();
              }
            }, 2000 * reconnectAttempts);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            console.warn(`[Realtime] 会话 ${conversationId} 重连失败，请手动刷新`);
          }
        }
      });

    // 存储订阅
    subscriptionStore.set(conversationId, {
      channel,
      callback: onNewMessage,
      reconnectAttempts: 0,
      maxReconnectAttempts,
      isSubscribed: true,
    });
  };

  createSubscription();

  // 返回取消订阅函数
  return () => {
    isSubscribed = false;
    const store = subscriptionStore.get(conversationId);
    if (store) {
      store.isSubscribed = false;
      if (store.channel) {
        supabase.removeChannel(store.channel);
      }
      subscriptionStore.delete(conversationId);
    }
  };
}

export function subscribeToAllMessages(
  onNewMessage: (message: Message) => void
): () => void {
  let isSubscribed = true;

  const channel = supabase
    .channel('litechat:all-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: CHAT_SCHEMA,
        table: 'messages',
      },
      (payload) => {
        if (isSubscribed) {
          try {
            const message = toMessageDomain(payload.new);
            onNewMessage(message);
          } catch (err) {
            console.error('[Realtime] 处理消息失败:', err);
          }
        }
      }
    )
    .subscribe();

  return () => {
    isSubscribed = false;
    supabase.removeChannel(channel);
  };
}