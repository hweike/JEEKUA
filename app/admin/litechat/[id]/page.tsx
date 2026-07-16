'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Send, User, Mail, Clock, 
  MessageSquare, UserPlus, UserCheck, ChevronDown, Users,
  Plus, Loader2  // 新增 Plus 和 Loader2
} from 'lucide-react';
import { subscribeToMessages } from '@/lib/litechat/realtime';
import type { Message, Conversation } from '@/lib/litechat/types';
import QuickRepliesPanel from '@/components/litechat/QuickRepliesPanel';

export default function ConversationDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // ===== 加载数据 =====
  const loadData = async () => {
    try {
      // 获取消息
      const msgRes = await fetch(`/api/litechat/conversations/${id}/messages`);
      if (!msgRes.ok) {
        const text = await msgRes.text();
        let errorMsg = '加载消息失败';
        try {
          const data = JSON.parse(text);
          errorMsg = data.error || errorMsg;
        } catch {
          // 忽略 JSON 解析错误
        }
        throw new Error(errorMsg);
      }
      const msgData = await msgRes.json();
      setMessages(msgData.messages || []);

      // 获取会话信息（通过会话列表 API）
      const convRes = await fetch('/api/admin/litechat/conversations');
      if (convRes.ok) {
        const convs = await convRes.json();
        const found = convs.find((c: any) => c.id === id);
        if (found) {
          setConversation(found);
          if (found.agent_id) {
            await loadAdmins(found.agent_id);
          }
        }
      }

      await loadCurrentAdmin();
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  // ===== 获取当前管理员信息 =====
  const loadCurrentAdmin = async () => {
    try {
      const res = await fetch('/api/admin/litechat/settings');
      if (res.ok) {
        const data = await res.json();
        setCurrentAdmin(data);
      }
    } catch (error) {
      console.error('获取当前管理员信息失败:', error);
    }
  };

  // ===== 获取所有管理员列表 =====
  const loadAdmins = async (selectedId?: string) => {
    try {
      const res = await fetch('/api/admin/litechat/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
        if (selectedId) {
          const found = data.find((a: any) => a.id === selectedId);
          if (found) setAssignedAdmin(found);
        }
      }
    } catch (error) {
      console.error('获取管理员列表失败:', error);
    }
  };

  // ===== 标记已读 =====
  const markAsRead = async () => {
    try {
      await fetch(`/api/admin/litechat/conversations/${id}/read`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('标记已读失败:', err);
    }
  };

  // ===== 发送文本回复 =====
  const sendReply = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/litechat/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error('服务器返回了无效的响应'); }
      if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);

      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });

      if (conversation) {
        setConversation({
          ...conversation,
          status: 'active',
          last_message_at: data.created_at,
        });
      }
    } catch (err: any) {
      console.error('发送回复失败:', err);
      setError(err.message || '发送失败，请重试');
      setInput(content);
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

  // ===== 处理图片选择 =====
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('图片大小不能超过 5MB');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file);
      // 发送图片消息
      const res = await fetch(`/api/admin/litechat/conversations/${id}/messages`, {
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
      setMessages(prev => {
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      if (conversation) {
        setConversation({
          ...conversation,
          status: 'active',
          last_message_at: data.created_at,
        });
      }
    } catch (err: any) {
      console.error('发送图片失败:', err);
      setError(err.message || '发送图片失败，请重试');
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

  // ===== 分配会话 =====
  const handleAssign = async (agentId: string) => {
    try {
      const res = await fetch(`/api/admin/litechat/conversations/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        setAssignedAdmin(data.assigned_to);
        setShowAssignPanel(false);
        await loadData(); // 刷新
        // 返回列表页（因为会话已被分配，从列表中消失）
        router.push('/admin/litechat');
      } else {
        const err = await res.json();
        throw new Error(err.error || '分配失败');
      }
    } catch (error: any) {
      console.error('分配失败:', error);
      setError(error.message || '分配失败，请重试');
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
    if (!id) return;
    loadData();
    const unsubscribe = subscribeToMessages(id as string, (newMsg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    markAsRead();
    return () => unsubscribe();
  }, [id]);

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

  // ===== 格式化时间 =====
  const formatTime = (time: string) => {
    return new Date(time).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          {error}
          <button onClick={loadData} className="ml-4 text-blue-600 hover:underline">
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* 头部：返回 + 会话信息 + 分配按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/litechat"
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {conversation?.customer_name || '匿名访客'}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {conversation?.customer_email || '无邮箱'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {conversation && formatTime(conversation.last_message_at)}
              </span>
              {conversation?.status === 'pending' && (
                <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                  待处理
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 分配按钮 */}
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

          {/* 分配面板 */}
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

      {/* 消息列表 */}
      <div className="bg-white rounded-lg shadow flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              暂无消息
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'agent' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-3 ${
                    msg.sender_type === 'agent'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-blue-500 text-white'
                  }`}
                >
                  {msg.sender_type === 'agent' && (
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      {msg.sender_name || '客服'}
                    </div>
                  )}
                  {msg.content_type === 'image' && msg.file_url ? (
                    <img
                      src={msg.file_url}
                      alt="图片"
                      className="max-w-[200px] max-h-[150px] rounded object-contain"
                    />
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap">{msg.content}</p>
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      msg.sender_type === 'agent' ? 'text-gray-400' : 'text-blue-100'
                    }`}
                  >
                    {formatTime(msg.created_at)}
                    {msg.sender_type === 'agent' && ' · 已读'}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区 */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex gap-2 items-end">
            {/* + 按钮（图片上传） */}
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

            {/* 常用语按钮 */}
            <button
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className="flex-shrink-0 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center"
              style={{ width: '32px', height: '32px' }}
              title="常用回复"
            >
              <MessageSquare size={18} className="text-gray-600" />
            </button>

            {/* 输入框 */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入回复..."
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ minHeight: '44px', maxHeight: '56px' }}
              disabled={sending}
            />

            {/* 发送按钮 */}
            <button
              onClick={sendReply}
              disabled={sending || !input.trim()}
              className="flex-shrink-0 rounded-lg text-white transition disabled:opacity-50 flex items-center justify-center"
              style={{ backgroundColor: '#3B82F6', minWidth: '44px', minHeight: '44px' }}
            >
              {sending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} />
              )}
            </button>
          </div>
          {error && <div className="mt-2 text-xs text-red-500">{error}</div>}
        </div>
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