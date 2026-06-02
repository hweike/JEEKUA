'use client'

import dynamic from 'next/dynamic'

// 动态导入 YouTube 轻量组件（仅在客户端加载）
const LiteYouTubeEmbed = dynamic(() => import('react-lite-youtube-embed'), { ssr: false })
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

interface VideoPlayerProps {
  source: 'youtube' | 'vimeo' | 'bilibili'
  videoId: string
  title: string
}

export default function VideoPlayer({ source, videoId, title }: VideoPlayerProps) {
  if (source === 'youtube') {
    return (
      <div className="w-full h-full">
        <LiteYouTubeEmbed id={videoId} title={title} poster="hqdefault" noCookie />
      </div>
    )
  }

  if (source === 'vimeo') {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?autoplay=0&byline=0&portrait=0&badge=0`}
        className="w-full h-full"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        title={title}
      />
    )
  }

  if (source === 'bilibili') {
    return (
      <iframe
        src={`//player.bilibili.com/player.html?bvid=${videoId}&page=1&high_quality=1&danmaku=0`}
        className="w-full h-full"
        allowFullScreen
        title={title}
      />
    )
  }

  return <div className="w-full h-full bg-gray-200 flex items-center justify-center">不支持的视频源</div>
}