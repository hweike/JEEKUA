// components/litechat/ChatWindow.tsx
'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { WifiOff, Loader2, Image, User } from 'lucide-react';
import MessageList from './MessageList';
import InputBar from './InputBar';
import type { Message } from '@/lib/litechat/types';

interface ChatWindowProps {
  conversationId: string;
  messages: Message[];
  isConnected: boolean;
  onSendMessage: (content: string, type: 'text' | 'image' | 'link', fileUrl?: string) => Promise<boolean>;
  onImagePreview: (url: string) => void;
  brandColor: string;
  customerEmail: string;
  customerName: string;
  siteId: string;
  failedImagesRef: React.MutableRefObject<Set<string>>;
  // ✅ 分页相关 props
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function ChatWindow({
  conversationId,
  messages,
  isConnected,
  onSendMessage,
  onImagePreview,
  brandColor,
  customerEmail,
  customerName,
  siteId,
  failedImagesRef,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: ChatWindowProps) {
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== 管理员信息 =====
  const [adminInfo, setAdminInfo] = useState<{
    admin: any;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    statusText: string;
  } | null>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  // ===== 获取管理员信息 =====
  useEffect(() => {
    if (!conversationId) return;

    const fetchAdminInfo = async () => {
      try {
        const res = await fetch(`/api/litechat/conversations/${conversationId}/admin`);
        if (res.ok) {
          const data = await res.json();
          setAdminInfo(data);
        } else {
          // 降级：显示默认信息
          setAdminInfo({
            admin: null,
            displayName: '客服团队',
            avatarUrl: null,
            isOnline: true,
            statusText: '在线',
          });
        }
      } catch (error) {
        console.error('获取管理员信息失败:', error);
        setAdminInfo({
          admin: null,
          displayName: '客服团队',
          avatarUrl: null,
          isOnline: true,
          statusText: '在线',
        });
      } finally {
        setLoadingAdmin(false);
      }
    };

    fetchAdminInfo();
  }, [conversationId]);

  // ===== 获取管理员显示名称（供消息渲染使用） =====
  const getAdminDisplayName = (adminId: string): string => {
    if (!adminInfo?.admin) return '客服';
    // ✅ 优先使用 nickname，否则使用 name
    return adminInfo.admin.nickname || adminInfo.admin.name || '客服';
  };

  // ===== 发送文本消息 =====
  const handleSendText = async (text: string) => {
    if (sending || !text.trim()) return;
    setSending(true);
    setError(null);
    const ok = await onSendMessage(text.trim(), 'text');
    setSending(false);
    return ok;
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
      await onSendMessage('📷 图片', 'image', url);
    } catch (err: any) {
      console.error('上传图片失败:', err);
      setError(err.message || '上传图片失败，请重试');
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

  // 获取头像首字母（用于无头像时显示）
  const getAvatarLetter = (name: string): string => {
    if (!name) return '客';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ===== 管理员信息头部 ===== */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
        {/* 头像 */}
        {adminInfo?.avatarUrl ? (
          <img
            src={adminInfo.avatarUrl}
            alt="客服"
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-medium text-sm">
            {adminInfo?.displayName ? getAvatarLetter(adminInfo.displayName) : '客'}
          </div>
        )}
        {/* 名称 + 状态 */}
        <div>
          <div className="font-medium text-sm text-gray-800">
            {adminInfo?.displayName || '客服团队'}
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                adminInfo?.isOnline
                  ? 'bg-green-500'
                  : adminInfo?.statusText === '忙碌'
                  ? 'bg-yellow-500'
                  : 'bg-gray-400'
              }`}
            />
            <span className="text-gray-500">
              {adminInfo?.statusText || '在线'}
            </span>
          </div>
        </div>
      </div>

      {!isConnected && (
        <div className="px-4 py-1.5 bg-yellow-50 border-b border-yellow-200 text-yellow-600 text-xs flex items-center justify-center gap-1.5 flex-shrink-0">
          <WifiOff size={12} />
          <span>连接断开，正在恢复...</span>
        </div>
      )}

      {/* ✅ 消息列表容器 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 bg-gray-50">
        <MessageList
          messages={messages}
          onImagePreview={onImagePreview}
          failedImagesRef={failedImagesRef}
          adminInfo={adminInfo}
          hasMore={hasMore}
          loadingMore={loadingMore}
          onLoadMore={onLoadMore}
        />
      </div>

      <div className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
        {error && <div className="mb-2 text-xs text-red-500">{error}</div>}
        <InputBar
          onSend={handleSendText}
          disabled={sending || !isConnected}
          placeholder={isConnected ? "输入消息..." : "连接中..."}
          brandColor={brandColor}
          onImageUpload={triggerFileInput}
          uploading={uploading}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
          multiple={false}
        />
      </div>
    </div>
  );
}