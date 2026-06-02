'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { VideoMetadata } from '@/lib/types'
import VideoModal from './VideoModal'

export default function VideoList({ locale, categoryKey }: { locale: string; categoryKey: string }) {
  const router = useRouter()
  const [videos, setVideos] = useState<VideoMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVideo, setEditingVideo] = useState<VideoMetadata | null>(null)

  const loadVideos = async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/videosys-videos?locale=${locale}`)
    const allVideos = await res.json()
    const filtered = categoryKey
      ? allVideos.filter((v: VideoMetadata) => v.category === categoryKey)
      : allVideos
    setVideos(filtered)
    setLoading(false)
  }

  useEffect(() => {
    loadVideos()
  }, [locale, categoryKey])

  const handleAdd = () => {
    setEditingVideo(null)
    setModalOpen(true)
  }

  const handleEdit = (video: VideoMetadata) => {
    setEditingVideo(video)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该视频吗？')) return
    await fetch(`/api/admin/videosys-videos?locale=${locale}&id=${id}`, { method: 'DELETE' })
    loadVideos()
  }

  const handleSave = async (video: VideoMetadata) => {
    const res = await fetch('/api/admin/videosys-videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale, ...video }),
    })
    if (res.ok) {
      loadVideos()
      setModalOpen(false)
    } else {
      alert('保存失败')
    }
  }

  if (loading) return <div>加载视频中...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {categoryKey ? `分类：${categoryKey}` : '所有视频'}
        </h1>
        <button
          onClick={handleAdd}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          + 新建视频
        </button>
      </div>

      {videos.length === 0 ? (
        <div className="text-gray-400 text-center py-10">暂无视频，请点击上方按钮创建</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div key={video.id} className="border rounded-lg overflow-hidden shadow hover:shadow-md">
              <img src={video.thumbnail} alt={video.title} className="w-full h-40 object-cover" />
              <div className="p-3">
                <h3 className="font-bold text-lg truncate">{video.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{video.description}</p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-400">{video.publishDate}</span>
                  <div className="space-x-2">
                    <button
                      onClick={() => handleEdit(video)}
                      className="text-blue-600 text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="text-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <VideoModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        initialData={editingVideo}
        locale={locale}
        categories={[]} // 将在 modal 中动态加载
      />
    </div>
  )
}