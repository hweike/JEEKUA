'use client';

import { X } from 'lucide-react';
import VideoPlayer from '@/components/videosys-front/VideoPlayer';

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  source: string;
  videoId: string;
  title: string;
}

export default function VideoPreviewModal({ isOpen, onClose, source, videoId, title }: VideoPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="aspect-video">
          <VideoPlayer source={source as any} videoId={videoId} title={title} />
        </div>
      </div>
    </div>
  );
}