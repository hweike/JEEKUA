'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  MessageCircle, User, Mail, Clock, 
  ChevronRight, Send, ArrowLeft, 
  Check, CheckCheck, WifiOff, RotateCw,
  Plus, Loader2, MessageSquare, UserPlus, UserCheck, ChevronDown, Users,
  Settings
} from 'lucide-react';
import { subscribeToAllMessages, subscribeToMessages } from '@/lib/litechat/realtime';
import type { ConversationWithLastMessage, Message } from '@/lib/litechat/types';
import QuickRepliesPanel from '@/components/litechat/QuickRepliesPanel';
import { detectUrls, isImageUrl, getProxyImageUrl } from '@/lib/litechat/utils';

export default function LiteChatAdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id');

  // 会话列表状态
  const [conversations, setConversations] = useState<ConversationWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 当前管理员信息
  const [adminInfo, setAdminInfo] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // 当前选中的会话
  const [selectedConversation, setSelectedConversation] = useState<ConversationWithLastMessage | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===== 分页相关状态 =====
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // ===== 常用回复语 =====
  const [showQuickReplies, setShowQuickReplies] = useState(false);

  // ===== 会话分配 =====
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [admins, setAdmins] = useState<any[]>([]);
  const [currentAdmin, setCurrentAdmin] = useState<any>(null);
  const [assignedAdmin, setAssignedAdmin] = useState<any>(null);

  // ===== 图片上传 =====
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ===== 工具：安全更新消息（去重） =====
  const updateMessages = useCallback((updater: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const newMessages = updater(prev);
      const uniqueMap = new Map<string, Message>();
      for (const msg of newMessages) {
        uniqueMap.set(msg.id, msg);
      }
      return Array.from(uniqueMap.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });
  }, []);

  // ===== 获取会话列表 =====
  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/admin/litechat/conversations');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '加载失败');
      }
      const data = await res.json();
      setConversations(data);
      setError(null);
      setIsConnected(true);

      if (selectedId) {
        const found = data.find((c: any) => c.id === selectedId);
        if (found) {
          setSelectedConversation(found);
          if (found.agent_id) {
            const adminRes = await fetch('/api/admin/litechat/admins');
            if (adminRes.ok) {
              const adminsData = await adminRes.json();
              const assigned = adminsData.find((a: any) => a.id === found.agent_id);
              if (assigned) setAssignedAdmin(assigned);
            }
          }
          // 加载消息时带分页参数
          loadMessages(selectedId);
        }
      } else if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0]);
        loadMessages(data[0].id);
        router.replace(`/admin/litechat?id=${data[0].id}`);
      }
    } catch (err: any) {
      console.error('加载会话列表失败:', err);
      setError(err.message || '加载失败，请刷新重试');
    } finally {
      setLoading(false);
    }
  };

 // ===== 加载消息（支持分页和自动重试/刷新） =====
const loadMessages = async (
  conversationId: string,
  before?: string,
  append: boolean = false,
  retries: number = 2
) => {
  try {
    const params = new URLSearchParams();
    params.set('limit', '30');

    if (before) {
      params.set('before', before);
    } else {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      params.set('after', sevenDaysAgo.toISOString());
    }

    const res = await fetch(
      `/api/litechat/conversations/${conversationId}/messages?${params.toString()}`
    );

    if (!res.ok) {
      // 如果是 401 或 403，直接刷新页面（认证失效）
      if (res.status === 401 || res.status === 403) {
        console.warn('[loadMessages] 认证失效，刷新页面');
        window.location.reload();
        return;
      }
      throw new Error(`加载消息失败 (${res.status})`);
    }

    const data = await res.json();

    if (append) {
      setMessages(prev => [...data.messages, ...prev]);
    } else {
      setMessages(data.messages || []);
    }
    setHasMore(data.hasMore || false);
    setIsConnected(true);
    if (!append) {
      markAsRead(conversationId);
    }
  } catch (err) {
    console.error('[loadMessages] 错误:', err);

    // 网络错误或 SSL 错误时，尝试重试
    if (retries > 0 && (err instanceof TypeError || err.message?.includes('fetch'))) {
      console.warn(`[loadMessages] 网络错误，剩余重试次数: ${retries}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return loadMessages(conversationId, before, append, retries - 1);
    }

    // 重试耗尽或非网络错误，刷新页面（兜底）
    console.warn('[loadMessages] 无法恢复，刷新页面');
    window.location.reload();
  }
};

  // ===== 加载更多历史消息 =====
  const loadMoreMessages = async () => {
    if (loadingMore || !hasMore || !selectedConversation || messages.length === 0) return;
    setLoadingMore(true);
    try {
      const oldestMsg = messages[0];
      await loadMessages(selectedConversation.id, oldestMsg.created_at, true);
    } catch (err) {
      console.error('加载更多失败:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // ===== 标记已读 =====
  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/admin/litechat/conversations/${conversationId}/read`, {
        method: 'POST',
      });
      setConversations(prev =>
        prev.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      );
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  // ===== 选择会话 =====
  const selectConversation = (conv: ConversationWithLastMessage) => {
    setSelectedConversation(conv);
    // 重置分页状态，加载新会话的消息
    setMessages([]);
    setHasMore(false);
    loadMessages(conv.id);
    router.replace(`/admin/litechat?id=${conv.id}`);
    setTimeout(() => inputRef.current?.focus(), 100);
    if (conv.agent_id) {
      fetch(`/api/admin/litechat/admins`)
        .then(res => res.json())
        .then(data => {
          const assigned = data.find((a: any) => a.id === conv.agent_id);
          if (assigned) setAssignedAdmin(assigned);
        })
        .catch(() => setAssignedAdmin(null));
    } else {
      setAssignedAdmin(null);
    }
  };

  // ===== 发送文本回复 =====
  const sendReply = async () => {
    if (!input.trim() || sending || !selectedConversation) return;

    const content = input.trim();
    setInput('');
    setSending(true);
    setErrorMsg(null);

    const tempId = `temp_${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversation_id: selectedConversation.id,
      sender_type: 'agent',
      sender_id: '',
      sender_email: '',
      sender_name: '我',
      content,
      content_type: 'text',
      file_url: undefined,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    updateMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/admin/litechat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('服务器返回了无效的响应'); }

      if (!res.ok) throw new Error(data.error || '发送失败');

      updateMessages(prev => prev.filter(m => m.id !== tempId).concat(data));
      
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, last_message_content: content, last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      console.error('发送回复失败:', err);
      updateMessages(prev => prev.filter(m => m.id !== tempId));
      setErrorMsg(err.message || '发送失败，请重试');
      setInput(content);
      setIsConnected(false);
    } finally {
      setSending(false);
    }
  };

  // ===== 上传图片 =====
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'litechat');
    const res = await fetch('/api/images', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || '上传失败');
    }
    const data = await res.json();
    return data.url;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('图片大小不能超过 5MB');
      return;
    }
    setUploading(true);
    setErrorMsg(null);
    try {
      const url = await uploadImage(file);
      const res = await fetch(`/api/admin/litechat/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: '📷 图片',
          contentType: 'image',
          fileUrl: url,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '发送图片失败');
      }
      const data = await res.json();
      updateMessages(prev => [...prev, data]);
      setConversations(prev =>
        prev.map(c =>
          c.id === selectedConversation.id
            ? { ...c, last_message_content: '📷 图片', last_message_at: new Date().toISOString() }
            : c
        )
      );
    } catch (err: any) {
      console.error('发送图片失败:', err);
      setErrorMsg(err.message || '发送图片失败，请重试');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // ===== 获取当前管理员信息 =====
  const loadCurrentAdmin = async () => {
    try {
      const res = await fetch('/api/admin/litechat/settings');
      if (res.ok) {
        const data = await res.json();
        setAdminInfo(data);
        setCurrentAdmin(data);
      }
    } catch (error) {
      console.error('获取管理员信息失败:', error);
    } finally {
      setLoadingAdmin(false);
    }
  };

  // ===== 获取所有管理员列表 =====
  const loadAdmins = async () => {
    try {
      const res = await fetch('/api/admin/litechat/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
    }
  };

  // ===== 分配会话 =====
  const handleAssign = async (agentId: string) => {
    if (!selectedConversation) return;
    try {
      const res = await fetch(`/api/admin/litechat/conversations/${selectedConversation.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSelectedConversation(prev => prev ? { ...prev, agent_id: agentId } : null);
        const assigned = admins.find((a: any) => a.id === agentId);
        setAssignedAdmin(assigned || null);
        setShowAssignPanel(false);
        await fetchConversations();
        const found = conversations.find(c => c.id === selectedConversation.id);
        if (!found) {
          setSelectedConversation(null);
          setMessages([]);
          router.replace('/admin/litechat');
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || '分配失败');
      }
    } catch (error: any) {
      console.error('分配失败:', error);
      setErrorMsg(error.message || '分配失败，请重试');
    }
  };

  const handleAssignToMe = async () => {
    if (!currentAdmin) return;
    await handleAssign(currentAdmin.id);
  };

  // ===== 插入常用语 =====
  const handleQuickReplySelect = (content: string) => {
    setInput(content);
    setShowQuickReplies(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // ===== 实时订阅 =====
  useEffect(() => {
    const unsubscribeAll = subscribeToAllMessages(() => {
      fetchConversations();
    });

    if (selectedConversation) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      const unsub = subscribeToMessages(selectedConversation.id, (newMsg) => {
        setIsConnected(true);
        updateMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          const tempIdx = prev.findIndex(m => 
            m.id.startsWith('temp_') && m.content === newMsg.content
          );
          if (tempIdx !== -1) {
            const newArr = [...prev];
            newArr[tempIdx] = newMsg;
            return newArr;
          }
          return [...prev, newMsg];
        });
        if (newMsg.sender_type === 'visitor') {
          markAsRead(selectedConversation.id);
        }
      });
      unsubscribeRef.current = unsub;
    }

    return () => {
      unsubscribeAll();
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [selectedConversation]);

  // ===== 连接状态检测 =====
  useEffect(() => {
    if (!selectedConversation) return;

    const checkConnection = () => {
      if (messages.length > 0 && !sending) {
        const lastMsg = messages[messages.length - 1];
        const timeSinceLastMsg = Date.now() - new Date(lastMsg.created_at).getTime();
        if (timeSinceLastMsg > 60000 && !lastMsg.id.startsWith('temp_')) {
          console.warn('[Admin] 检测到可能断连，尝试刷新...');
          setIsConnected(false);
          // 刷新最新消息
          loadMessages(selectedConversation.id);
        }
      }
    };

    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, [selectedConversation, messages, sending]);

  // ===== 初始加载 =====
  useEffect(() => {
    fetchConversations();
    loadCurrentAdmin();
    loadAdmins();
  }, []);

  // ===== 滚动到底部 =====
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ===== 键盘事件 =====
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // ===== 格式化时间（分组用） =====
  const formatTimeLabel = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60 * 1000) return '刚刚';
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString('zh-CN', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  // ===== 消息状态图标 =====
  const MessageStatus = ({ msg }: { msg: Message }) => {
    if (msg.id.startsWith('temp_')) {
      return <Clock size={12} className="inline-flex flex-shrink-0" style={{ color: '#9CA3AF' }} />;
    }
    if (msg.sender_type === 'agent') {
      if (msg.is_read) {
        return <CheckCheck size={12} className="inline-flex flex-shrink-0" style={{ color: '#3B82F6' }} />;
      }
      return <Check size={12} className="inline-flex flex-shrink-0" style={{ color: '#9CA3AF' }} />;
    }
    if (msg.sender_type === 'visitor') {
      if (msg.is_read) {
        return <CheckCheck size={12} className="inline-flex flex-shrink-0" style={{ color: '#3B82F6' }} />;
      }
      return <Check size={12} className="inline-flex flex-shrink-0" style={{ color: '#9CA3AF' }} />;
    }
    return null;
  };

  // ===== 渲染图片 =====
  const renderImage = (url: string) => {
    const proxyUrl = getProxyImageUrl(url);
    return (
      <div className="max-w-full overflow-hidden">
        <img
          src={proxyUrl}
          alt="图片"
          className="max-w-full max-h-[200px] rounded object-contain cursor-pointer hover:opacity-90 transition bg-gray-100"
          loading="lazy"
          referrerPolicy="no-referrer"
          onClick={() => window.open(proxyUrl, '_blank')}
        />
      </div>
    );
  };

  // ===== 渲染消息内容 =====
  const renderContent = (msg: Message) => {
    if (msg.content_type === 'image' && msg.file_url) {
      return renderImage(msg.file_url);
    }

    const parts = detectUrls(msg.content);
    return parts.map((part, idx) => {
      if (part.url && isImageUrl(part.url)) {
        return <span key={idx}>{renderImage(part.url)}</span>;
      }
      if (part.url) {
        return (
          <a
            key={idx}
            href={part.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline break-all"
          >
            {part.text}
          </a>
        );
      }
      return <span key={idx} className="whitespace-pre-wrap break-words">{part.text}</span>;
    });
  };

  // ===== 渲染消息列表 =====
  const renderMessages = () => {
    if (messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400 text-sm">
          暂无消息
        </div>
      );
    }

    // 去重排序
    const uniqueMessages = Array.from(
      new Map(messages.map(msg => [msg.id, msg])).values()
    ).sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    // 按5分钟分组
    const groups: { time: Date; messages: Message[] }[] = [];
    let lastTime: Date | null = null;
    let currentGroup: Message[] = [];

    uniqueMessages.forEach((msg) => {
      const msgTime = new Date(msg.created_at);
      if (!lastTime || (msgTime.getTime() - lastTime.getTime()) > 5 * 60 * 1000) {
        if (currentGroup.length > 0) {
          groups.push({ time: lastTime!, messages: currentGroup });
        }
        currentGroup = [msg];
        lastTime = msgTime;
      } else {
        currentGroup.push(msg);
      }
    });
    if (currentGroup.length > 0) {
      groups.push({ time: lastTime!, messages: currentGroup });
    }

    return (
      <>
        {/* ✅ 加载更多按钮（显示在消息列表顶部） */}
        {hasMore && (
          <div className="flex justify-center my-3">
            <button
              onClick={loadMoreMessages}
              disabled={loadingMore}
              className="px-4 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition disabled:opacity-50"
            >
              {loadingMore ? (
                <>
                  <Loader2 size={14} className="inline animate-spin mr-1" />
                  加载中...
                </>
              ) : (
                '加载更早的消息'
              )}
            </button>
          </div>
        )}

        {groups.map((group, idx) => (
          <div key={idx}>
            {/* 时间分组标签 */}
            <div className="flex justify-center my-3">
              <span className="px-3 py-1 text-xs text-gray-500 bg-gray-100 rounded-full">
                {formatTimeLabel(group.time)}
              </span>
            </div>
            {group.messages.map((msg) => {
              const isAgent = msg.sender_type === 'agent';
              const isSystem = msg.sender_type === 'system';
              const isAgentOrSystem = isAgent || isSystem;

              // 客户显示名称：优先使用会话的 display_name
              let customerDisplayName = '匿名';
              if (msg.sender_type === 'visitor') {
                customerDisplayName = selectedConversation?.display_name || msg.sender_name || '匿名';
              }

              // 发送者显示名称（客服/系统）
              let senderDisplayName = '客服';
              if (isAgent) {
                senderDisplayName = msg.sender_name || '客服';
              } else if (isSystem) {
                senderDisplayName = '客服';
              }

              return (
                <div
                  key={msg.id}
                  className={`flex ${isAgentOrSystem ? 'justify-end' : 'justify-start'} mb-2`}
                >
                  {/* 客户头像（仅访客消息） */}
                  {msg.sender_type === 'visitor' && (
                    <div className="flex-shrink-0 mr-2 mt-1">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <User size={16} />
                      </div>
                    </div>
                  )}

                  <div className={`max-w-[70%] min-w-0 ${isAgentOrSystem ? '' : 'mr-auto'}`}>
                    {/* 发送者名称 */}
                    {isAgentOrSystem && (
                      <div className="text-xs text-gray-500 mb-0.5 ml-1 text-right">
                        {senderDisplayName}
                      </div>
                    )}
                    {!isAgentOrSystem && (
                      <div className="text-xs text-gray-500 mb-0.5 ml-1">
                        {customerDisplayName}
                      </div>
                    )}

                    {/* 消息气泡 */}
                    <div
                      className={`rounded-lg px-4 py-2.5 ${
                        isSystem
                          ? 'bg-gray-100 text-gray-800'
                          : isAgent
                            ? 'bg-blue-50 text-gray-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-start gap-1">
                        <span className="text-sm break-words whitespace-pre-wrap overflow-wrap-anywhere flex-1 min-w-0">
                          {renderContent(msg)}
                        </span>
                        {/* 状态图标：仅管理员消息显示，与内容同行 */}
                        {isAgent && (
                          <span className="flex-shrink-0 text-xs self-end mt-0.5">
                            <MessageStatus msg={msg} />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </>
    );
  };

  // ===== 获取状态颜色 =====
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'away': return 'bg-orange-500';
      default: return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
          <button onClick={fetchConversations} className="ml-4 text-blue-600 hover:underline">重试</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] bg-white rounded-lg shadow overflow-hidden">
      {/* ===== 左侧：会话列表 ===== */}
      <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* 管理员信息卡片 + 刷新按钮（右上角） */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {adminInfo?.avatar_url ? (
                <img 
                  src={adminInfo.avatar_url} 
                  alt="头像" 
                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
                  {adminInfo?.nickname?.charAt(0)?.toUpperCase() || 
                   adminInfo?.name?.charAt(0)?.toUpperCase() || 
                   'A'}
                </div>
              )}
              <div>
                <div className="font-medium text-sm text-gray-800">
                  {adminInfo?.nickname || adminInfo?.name || '管理员'}
                </div>
                <div className="text-xs text-gray-500">
                  在线状态：{
                    adminInfo?.online_status === 'online' ? '在线' :
                    adminInfo?.online_status === 'busy' ? '忙碌' :
                    adminInfo?.online_status === 'away' ? '离开' : '离线'
                  }
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { fetchConversations(); setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 500); }}
                className="text-gray-400 hover:text-gray-600 transition"
                title="刷新列表"
              >
                <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
              <Link 
                href="/admin/litechat/settings" 
                className="text-gray-400 hover:text-gray-600 transition"
                title="个人设置"
              >
                <Settings size={18} />
              </Link>
            </div>
          </div>
        </div>

        {/* 会话列表 */}
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              暂无会话
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv)}
                className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${
                  selectedConversation?.id === conv.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">
                        {conv.display_name || '匿名'}
                      </div>
                      <div className="text-xs text-gray-400 truncate">
                        {conv.customer_email || '无邮箱'}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0 ml-2">
                    <span className="text-xs text-gray-400">
                      {new Date(conv.last_message_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {(conv.unread_count ?? 0) > 0 && (
                      <span className="mt-1 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
                {conv.last_message_content && (
                  <div className="text-xs text-gray-400 truncate mt-1 ml-10">
                    {conv.last_message_content}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ===== 右侧：聊天内容 ===== */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>选择一个会话开始聊天</p>
            </div>
          </div>
        ) : (
          <>
            {/* 聊天头部 */}
            <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {selectedConversation.display_name || '匿名'}
                    </span>
                    {selectedConversation.customer_id && (
                      <Link
                        href={`/admin/crm/${selectedConversation.customer_id}/edit`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        编辑
                      </Link>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-2">
                    {selectedConversation.customer_email || '无邮箱'}
                    {selectedConversation.status === 'pending' && (
                      <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                        待处理
                      </span>
                    )}
                    {!isConnected && (
                      <span className="flex items-center gap-1 text-yellow-600">
                        <WifiOff size={12} />
                        连接断开
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { if (selectedConversation) loadMessages(selectedConversation.id); }}
                  className="text-gray-400 hover:text-gray-600 transition"
                  title="刷新消息"
                >
                  <RotateCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                {/* 会话分配按钮 */}
                <div className="relative">
                  {assignedAdmin ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(assignedAdmin.online_status || 'online')}`} />
                      <span className="text-sm text-gray-700">{assignedAdmin.nickname || assignedAdmin.name || '管理员'}</span>
                      <button
                        onClick={() => setShowAssignPanel(!showAssignPanel)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAssignPanel(!showAssignPanel)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                    >
                      <UserPlus size={14} />
                      分配
                    </button>
                  )}
                  {showAssignPanel && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-10">
                      {currentAdmin && (
                        <button
                          onClick={handleAssignToMe}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UserCheck size={14} /> 分配给自己
                        </button>
                      )}
                      {admins.filter(a => a.id !== currentAdmin?.id).map((admin) => (
                        <button
                          key={admin.id}
                          onClick={() => handleAssign(admin.id)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Users size={14} /> {admin.nickname || admin.name || admin.email}
                        </button>
                      ))}
                      {admins.length === 0 && (
                        <div className="px-4 py-2 text-sm text-gray-400">暂无其他管理员</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50">
              {renderMessages()}
            </div>

            {/* 输入区 */}
            <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
              {errorMsg && <div className="mb-2 text-xs text-red-500">{errorMsg}</div>}
              <div className="flex gap-2 items-center">
                <button
                  onClick={triggerFileInput}
                  disabled={uploading}
                  className="flex-shrink-0 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center disabled:opacity-50"
                  style={{ width: '32px', height: '32px' }}
                  title="上传图片"
                >
                  {uploading ? (
                    <Loader2 size={18} className="animate-spin text-gray-400" />
                  ) : (
                    <Plus size={18} className="text-gray-600" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  multiple={false}
                />
                <button
                  onClick={() => setShowQuickReplies(!showQuickReplies)}
                  className="flex-shrink-0 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center"
                  style={{ width: '32px', height: '32px' }}
                  title="常用回复"
                >
                  <MessageSquare size={18} className="text-gray-600" />
                </button>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isConnected ? "输入回复..." : "连接中..."}
                  rows={2}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  style={{ minHeight: '44px', maxHeight: '56px' }}
                  disabled={sending || !isConnected}
                />
                <button
                  onClick={sendReply}
                  disabled={sending || !input.trim() || !isConnected}
                  className="flex-shrink-0 rounded-lg text-white transition disabled:opacity-50 flex items-center justify-center"
                  style={{ backgroundColor: '#3B82F6', minWidth: '44px', minHeight: '44px' }}
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 常用语面板 */}
      {showQuickReplies && (
        <QuickRepliesPanel
          onSelect={handleQuickReplySelect}
          onClose={() => setShowQuickReplies(false)}
        />
      )}
    </div>
  );
}