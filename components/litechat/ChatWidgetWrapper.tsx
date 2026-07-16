'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// 动态导入聊天挂件，禁用 SSR
const ChatWidget = dynamic(
  () => import('@/components/litechat/ChatWidget'),
  { ssr: false }
);

export default function ChatWidgetWrapper() {
  const [mounted, setMounted] = useState(false);

  // 仅在客户端挂载后渲染，避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <ChatWidget />;
}