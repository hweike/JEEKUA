// components/litechat/InputBar.tsx
'use client';

import { useState, KeyboardEvent, useRef, useEffect } from 'react';
import { Send, Plus } from 'lucide-react';

interface InputBarProps {
  onSend: (text: string) => Promise<boolean> | boolean;
  disabled?: boolean;
  placeholder?: string;
  brandColor?: string;
  onImageUpload?: () => void;   // 点击“+”触发
  uploading?: boolean;
}

export default function InputBar({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
  brandColor = '#3B82F6',
  onImageUpload,
  uploading = false,
}: InputBarProps) {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度（最多2行）
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // 行高
      const maxHeight = lineHeight * 2 + 12; // 2行 + padding
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
      textareaRef.current.style.overflowY = scrollHeight > maxHeight ? 'auto' : 'hidden';
    }
  }, [input]);

  const handleSend = async () => {
    if (disabled || sending || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const ok = await onSend(text);
    setSending(false);
    if (!ok) setInput(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* “+” 圆形按钮（高度约输入框一半） */}
      <button
        type="button"
        onClick={onImageUpload}
        disabled={uploading}
        className="flex-shrink-0 rounded-full border border-gray-300 bg-white hover:bg-gray-50 transition flex items-center justify-center disabled:opacity-50"
        style={{ width: '32px', height: '32px' }}
        title="上传图片"
      >
        <Plus size={18} className="text-gray-600" />
      </button>

      {/* 多行输入框（2行高度，滚动） */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none overflow-y-auto"
        style={{ minHeight: '44px', maxHeight: '56px' }}
        disabled={disabled || sending}
      />

      {/* 发送按钮（与输入框等高） */}
      <button
        onClick={handleSend}
        disabled={disabled || sending || !input.trim()}
        className="flex-shrink-0 rounded-lg text-white transition disabled:opacity-50 flex items-center justify-center"
        style={{ backgroundColor: brandColor, minWidth: '44px', minHeight: '44px' }}
      >
        <Send size={20} />
      </button>
    </div>
  );
}