'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface VideoUrlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (url: string, sourceType: string, videoId: string) => void;
}

export default function VideoUrlModal({ isOpen, onClose, onConfirm }: VideoUrlModalProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const parseVideoUrl = (inputUrl: string) => {
    const youtube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const vimeo = /vimeo\.com\/(?:.*\/)?(\d+)/;
    const bilibili = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/;
    let match;
    if ((match = inputUrl.match(youtube))) return { source: 'youtube', id: match[1] };
    if ((match = inputUrl.match(vimeo))) return { source: 'vimeo', id: match[1] };
    if ((match = inputUrl.match(bilibili))) return { source: 'bilibili', id: match[1] };
    return null;
  };

  const handleConfirm = () => {
    if (!url.trim()) {
      setError('请输入视频URL');
      return;
    }
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      setError('无法识别的视频URL，请检查链接');
      return;
    }
    setError('');
    onConfirm(url, parsed.source, parsed.id);
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">从网络地址添加视频</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="粘贴视频链接（YouTube、Vimeo、Bilibili）"
            className="w-full border rounded p-2"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 border rounded">取消</button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-blue-600 text-white rounded">确定</button>
          </div>
        </div>
      </div>
    </div>
  );
}