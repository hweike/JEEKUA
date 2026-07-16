// components/litechat/MessageList.tsx
'use client';

import { useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import MessageItem from './MessageItem';
import type { Message } from '@/lib/litechat/types';
import { formatChatTime } from '@/lib/litechat/utils';

interface MessageListProps {
  messages: Message[];
  onImagePreview: (url: string) => void;
  failedImagesRef: React.MutableRefObject<Set<string>>;
  adminInfo?: {
    admin: any;
    displayName: string;
    avatarUrl: string | null;
    isOnline: boolean;
    statusText: string;
  } | null;
  // ✅ 分页相关 props
  hasMore?: boolean;
  loadingMore?: boolean;
  onLoadMore?: () => void;
}

export default function MessageList({
  messages,
  onImagePreview,
  failedImagesRef,
  adminInfo,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (endRef.current) {
      requestAnimationFrame(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages]);

  if (messages.length === 0) {
    return <div className="flex items-center justify-center h-full text-gray-400 text-sm">暂无消息</div>;
  }

  // 按5分钟分组
  const groups: { time: Date; messages: Message[] }[] = [];
  let lastTime: Date | null = null;
  let currentGroup: Message[] = [];

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  sortedMessages.forEach((msg) => {
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
    <div className="overflow-x-hidden">
      {/* ✅ 加载更多按钮（显示在消息列表顶部） */}
      {hasMore && (
        <div className="flex justify-center my-3">
          <button
            onClick={onLoadMore}
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
          <div className="flex justify-center my-2">
            <span className="px-3 py-0.5 text-xs text-gray-400 bg-gray-100 rounded-full">
              {formatChatTime(group.time)}
            </span>
          </div>
          {group.messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              onImagePreview={onImagePreview}
              failedImagesRef={failedImagesRef}
              adminInfo={adminInfo}
            />
          ))}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}