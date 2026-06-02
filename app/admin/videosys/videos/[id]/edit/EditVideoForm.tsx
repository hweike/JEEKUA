'use client';

import { useState, useEffect } from 'react';
import VideoForm from '@/components/videosys-admin/VideoForm';

export default function EditVideoForm({ videoId, locale }: { videoId: string; locale: string }) {
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await fetch(`/api/admin/videosys-videos?locale=${locale}&id=${videoId}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setInitialData(data);
      } catch (err) {
        setError('加载视频数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchVideo();
  }, [videoId, locale]);

  if (loading) return <div className="p-6">加载中...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!initialData) return null; // 确保有数据

  // 关键：数据加载完成后再渲染表单
  return <VideoForm mode="edit" locale={locale} initialData={initialData} videoId={videoId} />;
}