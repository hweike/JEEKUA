// components/litechat/ChatWidget.tsx
'use client';

import { useEffect, useState, useRef, useCallback, lazy, Suspense } from 'react';
import { Minimize2, X } from 'lucide-react';
import type { Message, Conversation } from '@/lib/litechat/types';
import { subscribeToMessages } from '@/lib/litechat/realtime';
import ChatForm from './ChatForm';
import ChatWindow from './ChatWindow';

// 动态加载图片预览（非首屏必须）
const ImagePreview = lazy(() => import('./ImagePreview'));

interface ChatWidgetProps {
  siteId?: string;
  brandColor?: string;
  welcomeMessage?: string;
}

export default function ChatWidget({
  siteId = process.env.NEXT_PUBLIC_SITE_ID || '000001',
  brandColor = '#3B82F6',
  welcomeMessage = '您好，欢迎咨询！请留下您的邮箱，我们会尽快回复。',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [showForm, setShowForm] = useState(true);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [visitorId, setVisitorId] = useState('');

  // ✅ 分页相关状态
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const unsubscribeRef = useRef<(() => void) | null>(null);
  const failedImagesRef = useRef<Set<string>>(new Set());
  const hasLoadedRef = useRef<boolean>(false);

  // ===== 截取 visitor_id 用于显示（短格式） =====
  const getShortVisitorId = (vid: string): string => {
    if (!vid) return '访客';
    if (!vid.startsWith('visitor_')) return vid;
    return vid;
  };

  // ===== 初始化 visitor_id =====
  useEffect(() => {
    let vid = localStorage.getItem('litechat_visitor_id');
    if (!vid) {
      const shortUuid = crypto.randomUUID().substring(0, 8);
      vid = `visitor_${shortUuid}`;
      localStorage.setItem('litechat_visitor_id', vid);
    }
    setVisitorId(vid);
  }, []);

  // ===== 更新消息（去重排序） =====
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const newMessages = updater(prev);
      const uniqueMap = new Map<string, Message>();
      for (const msg of newMessages) {
        uniqueMap.set(msg.id, msg);
      }
      return Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  // ===== 加载消息（支持分页和追加） =====
  const loadMessages = useCallback(async (
    conversationId: string,
    before?: string,
    append: boolean = false
  ) => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '30');

      if (before) {
        params.set('before', before);
      } else {
        // 初始加载：只取最近 7 天
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        params.set('after', sevenDaysAgo.toISOString());
      }

      const res = await fetch(
        `/api/litechat/conversations/${conversationId}/messages?${params.toString()}`
      );
      if (!res.ok) throw new Error('加载消息失败');
      const data = await res.json();

      if (append) {
        // 加载更多：将旧消息添加到列表前面
        setMessages(prev => [...data.messages, ...prev]);
      } else {
        // 初始加载：直接设置
        setMessages(data.messages || []);
      }
      setHasMore(data.hasMore || false);
      setIsConnected(true);
      return data;
    } catch (err) {
      console.error('加载消息失败:', err);
      setIsConnected(false);
      if (!append) {
        // 初始加载失败时重置状态
        localStorage.removeItem('litechat_conversation_id');
        setShowForm(true);
        setConversation(null);
      }
      throw err;
    }
  }, [updateMessages]);

  // ===== 加载更多历史消息 =====
  const loadMoreMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !conversation || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestMsg = messages[0];
      await loadMessages(conversation.id, oldestMsg.created_at, true);
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, conversation, messages, loadMessages]);

  // ===== ✅ 恢复会话（不加载消息） =====
  useEffect(() => {
    const savedEmail = localStorage.getItem('litechat_email');
    const savedConvId = localStorage.getItem('litechat_conversation_id');
    if (savedEmail && savedConvId) {
      setEmail(savedEmail);
      setShowForm(false);
      setConversation({
        id: savedConvId,
        site_id: siteId,
        customer_id: '',
        customer_email: savedEmail,
        customer_name: '',
        status: 'pending',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Conversation);
    }
  }, [siteId]);

  // ===== ✅ 打开窗口时加载消息（仅第一次） =====
  useEffect(() => {
    if (!isOpen || !conversation) {
      // 关闭窗口时取消订阅
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // 仅当该会话尚未加载过消息时，才加载
    if (!hasLoadedRef.current) {
      loadMessages(conversation.id);
      hasLoadedRef.current = true;
    }

    // 建立订阅（如果尚未订阅）
    if (!unsubscribeRef.current) {
      const unsubscribe = subscribeToMessages(conversation.id, (newMsg) => {
        setIsConnected(true);
        updateMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const tempIdx = prev.findIndex(m => m.id.startsWith('temp_') && m.content === newMsg.content);
          if (tempIdx !== -1) {
            const newArr = [...prev];
            newArr[tempIdx] = newMsg;
            return newArr;
          }
          return [...prev, newMsg];
        });
      });
      unsubscribeRef.current = unsubscribe;
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [isOpen, conversation, loadMessages, updateMessages]);

  // ===== 创建会话 =====
  const startChat = async (emailValue: string, nameValue: string) => {
    setLoading(true);
    setError(null);

    const displayName = nameValue.trim() || visitorId || '访客';

    try {
      const res = await fetch('/api/litechat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailValue.trim(),
          name: displayName
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '创建会话失败');
      }
      const conv = await res.json();
      setConversation(conv);
      setShowForm(false);
      localStorage.setItem('litechat_email', emailValue);
      localStorage.setItem('litechat_conversation_id', conv.id);

      // ✅ 新会话，重置加载状态并立即加载消息
      hasLoadedRef.current = false;
      await loadMessages(conv.id);
      hasLoadedRef.current = true;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ===== 发送消息（通用） =====
  const sendMessageContent = useCallback(async (
    content: string,
    contentType: 'text' | 'image' | 'link' = 'text',
    fileUrl?: string
  ): Promise<boolean> => {
    let currentConversation = conversation;
    if (!currentConversation) {
      const savedConvId = localStorage.getItem('litechat_conversation_id');
      const savedEmail = localStorage.getItem('litechat_email');
      if (savedConvId && savedEmail) {
        currentConversation = {
          id: savedConvId,
          site_id: siteId,
          customer_id: '',
          customer_email: savedEmail,
          customer_name: '',
          status: 'pending',
          last_message_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Conversation;
        setConversation(currentConversation);
      } else {
        setError('会话已过期，请重新开始聊天');
        setShowForm(true);
        return false;
      }
    }
    if (!content && contentType !== 'image') return false;

    const senderDisplayName = name.trim() || getShortVisitorId(visitorId) || '访客';

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const tempMessage: Message = {
      id: tempId,
      conversation_id: currentConversation.id,
      sender_type: 'visitor',
      sender_id: '',
      sender_email: email || currentConversation.customer_email,
      sender_name: senderDisplayName,
      content: content || '📷 图片',
      content_type: contentType,
      file_url: fileUrl,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    updateMessages(prev => [...prev, tempMessage]);

    try {
      const body: any = {
        content: content || '📷 图片',
        senderType: 'visitor',
        contentType,
        email: email || currentConversation.customer_email,
      };
      if (fileUrl) body.fileUrl = fileUrl;

      const res = await fetch(`/api/litechat/conversations/${currentConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('服务器返回了无效的响应'); }
      if (!res.ok) throw new Error(data.error || `发送失败 (${res.status})`);

      updateMessages(prev => prev.filter(m => m.id !== tempId).concat(data));
      return true;
    } catch (err: any) {
      console.error('发送失败:', err);
      updateMessages(prev => prev.filter(m => m.id !== tempId));
      setError(err.message || '发送失败，请重试');
      return false;
    }
  }, [conversation, email, name, visitorId, siteId, updateMessages]);

  // ===== 关闭 =====
  const closeChat = () => setIsOpen(false);
  const toggleMinimize = () => setIsMinimized(!isMinimized);

  // ===== 连接状态检测（保留） =====
  useEffect(() => {
    if (!conversation || !isOpen) return;
    const checkConnection = () => {
      if (messages.length > 0 && !loading) {
        const lastMsg = messages[messages.length - 1];
        const timeSinceLastMsg = Date.now() - new Date(lastMsg.created_at).getTime();
        if (timeSinceLastMsg > 60000 && !lastMsg.id.startsWith('temp_')) {
          console.warn('[ChatWidget] 检测到可能断连，尝试刷新...');
          setIsConnected(false);
          // 断连时刷新最新消息（不改变分页状态）
          loadMessages(conversation.id, undefined, false);
        }
      }
    };
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [conversation, messages, loading, isOpen, loadMessages]);

  // ===== 渲染 =====
  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
          style={{ backgroundColor: brandColor }}
          aria-label="打开聊天"
        >
          <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
          </svg>
        </button>
      )}

      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50 transition-all duration-300 ${
            isMinimized ? 'w-72 h-14' : 'w-96 h-[540px]'
          }`}
        >
          <div
            className="flex items-center justify-between px-4 py-3 rounded-t-xl text-white flex-shrink-0"
            style={{ backgroundColor: brandColor }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">在线客服</span>
              <span
                className={`w-2 h-2 rounded-full inline-block ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                }`}
              />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={toggleMinimize} className="p-1 hover:bg-white/20 rounded transition">
                <Minimize2 size={14} />
              </button>
              <button onClick={closeChat} className="p-1 hover:bg-white/20 rounded transition">
                <X size={16} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {showForm ? (
                <ChatForm
                  email={email}
                  name={name}
                  setEmail={setEmail}
                  setName={setName}
                  onStart={startChat}
                  loading={loading}
                  error={error}
                  welcomeMessage={welcomeMessage}
                  brandColor={brandColor}
                  visitorId={getShortVisitorId(visitorId)}
                />
              ) : (
                <ChatWindow
                  conversationId={conversation?.id || ''}
                  messages={messages}
                  isConnected={isConnected}
                  onSendMessage={sendMessageContent}
                  onImagePreview={setPreviewImage}
                  brandColor={brandColor}
                  customerEmail={email}
                  customerName={name}
                  siteId={siteId}
                  failedImagesRef={failedImagesRef}
                  hasMore={hasMore}
                  loadingMore={loadingMore}
                  onLoadMore={loadMoreMessages}
                />
              )}
            </div>
          )}
        </div>
      )}

      {previewImage && (
        <Suspense fallback={null}>
          <ImagePreview
            src={previewImage}
            onClose={() => setPreviewImage(null)}
          />
        </Suspense>
      )}
    </>
  );
}