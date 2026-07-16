// components/litechat/MessageItem.tsx
'use client';

import { Clock, Check, CheckCheck } from 'lucide-react';
import type { Message } from '@/lib/litechat/types';
import { detectUrls, isImageUrl, getProxyImageUrl } from '@/lib/litechat/utils';

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='100' y='100' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='20' font-family='sans-serif'%3E加载失败%3C/text%3E%3C/svg%3E";

interface MessageItemProps {
  message: Message;
  onImagePreview: (url: string) => void;
  failedImagesRef: React.MutableRefObject<Set<string>>;
  adminInfo?: {
    admin: any;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    statusText: string;
  } | null;
}

export default function MessageItem({ message: msg, onImagePreview, failedImagesRef, adminInfo }: MessageItemProps) {
  // ✅ 判断是否为客服/系统消息（agent 或 system）
  const isAgentOrSystem = msg.sender_type === 'agent' || msg.sender_type === 'system';
  const isSystem = msg.sender_type === 'system';

  // ✅ 获取发送者显示名称
  const getSenderDisplayName = () => {
    if (isSystem) {
      return '客服';  // 系统消息显示为"客服"
    }
    if (isAgentOrSystem && adminInfo?.admin) {
      return adminInfo.admin.nickname || adminInfo.admin.name || msg.sender_name || '客服';
    }
    return msg.sender_name || (isAgentOrSystem ? '客服' : '访客');
  };

  // ✅ 获取管理员头像（仅对 agent 消息）
  const getSenderAvatar = () => {
    if (msg.sender_type === 'agent' && adminInfo?.avatarUrl) {
      return adminInfo.avatarUrl;
    }
    return null;
  };

  // ===== 消息状态图标 =====
  const MessageStatus = () => {
    if (msg.id.startsWith('temp_')) {
      return <Clock size={12} className="inline-flex flex-shrink-0 ml-0.5" style={{ color: '#9CA3AF' }} />;
    }
    if (msg.sender_type === 'visitor') {
      if (msg.is_read) {
        return <CheckCheck size={12} className="inline-flex flex-shrink-0 ml-0.5" style={{ color: '#3B82F6' }} />;
      }
      return <Check size={12} className="inline-flex flex-shrink-0 ml-0.5" style={{ color: '#9CA3AF' }} />;
    }
    return null;
  };

  // ===== 渲染图片 =====
  const renderImage = (originalUrl: string) => {
    const proxyUrl = getProxyImageUrl(originalUrl);
    const requestUrl = proxyUrl;
    const hasFailed = failedImagesRef.current.has(requestUrl);

    if (hasFailed) {
      return (
        <span className="inline-block max-w-full rounded bg-gray-100 px-3 py-2 text-gray-400 text-sm">
          🖼️ 加载失败
        </span>
      );
    }

    return (
      <span className="inline-block max-w-full overflow-hidden">
        <img
          src={proxyUrl}
          alt="图片"
          className="max-w-full max-h-[200px] rounded object-contain cursor-pointer hover:opacity-90 transition bg-gray-100"
          loading="lazy"
          referrerPolicy="no-referrer"
          data-original-url={originalUrl}
          onError={(e) => {
            const img = e.currentTarget;
            const actualUrl = img.src;
            failedImagesRef.current.add(actualUrl);
            img.src = FALLBACK_IMAGE;
            img.onerror = null;
            console.warn('[图片加载失败]', actualUrl);
          }}
          onClick={() => onImagePreview(proxyUrl)}
        />
      </span>
    );
  };

  // ===== 渲染消息内容 =====
  const renderContent = () => {
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

  // ===== 头像 =====
  const getAvatarLetter = (name: string): string => {
    if (!name) return '客';
    return name.charAt(0).toUpperCase();
  };

  const senderDisplayName = getSenderDisplayName();
  const senderAvatar = getSenderAvatar();

  return (
    // ✅ 使用 isAgentOrSystem 控制对齐方向
    <div className={`flex ${isAgentOrSystem ? 'justify-start' : 'justify-end'} mb-3`}>
      {/* ✅ 仅对 agent 消息显示头像（system 不显示头像） */}
      {msg.sender_type === 'agent' && (
        <div className="flex-shrink-0 mr-2 mt-1">
          {senderAvatar ? (
            <img
              src={senderAvatar}
              alt={senderDisplayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: '#3B82F6' }}
            >
              {getAvatarLetter(senderDisplayName)}
            </div>
          )}
        </div>
      )}

      <div className={`max-w-[80%] min-w-0 ${isAgentOrSystem ? 'ml-0' : 'ml-auto'}`}>
        {/* ✅ 显示发送者名称（agent 和 system 都显示） */}
        {isAgentOrSystem && (
          <div className="text-xs text-gray-500 mb-0.5 ml-1">
            {senderDisplayName}
          </div>
        )}

        {/* ✅ 消息气泡：system 使用灰色背景 */}
        <div
          className={`rounded-lg px-3 py-2 min-w-0 ${
            isAgentOrSystem
              ? 'bg-gray-100 text-gray-800'  // agent 和 system 都使用灰色
              : 'bg-blue-50 text-gray-800'
          }`}
        >
          <div className="inline break-words">
            {renderContent()}
            <span className="inline-flex items-center align-middle">
              <MessageStatus />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}