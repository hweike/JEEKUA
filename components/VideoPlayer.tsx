'use client'

import LiteYouTubeEmbed from 'react-lite-youtube-embed'
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css'

interface Props {
  source: 'youtube' | 'vimeo' | 'bilibili'
  videoId: string
  title: string
}

export default function VideoPlayer({ source, videoId, title }: Props) {
  if (source === 'youtube') {
    return <LiteYouTubeEmbed id={videoId} title={title} poster="hqdefault" noCookie />
  }
  // 可扩展其他平台
  if (source === 'vimeo') {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoId}`}
        className="w-full h-full"
        allow="autoplay; fullscreen"
        title={title}
      />
    )
  }
  // Bilibili 嵌入代码
  if (source === 'bilibili') {
    return (
      <iframe
        src={`//player.bilibili.com/player.html?bvid=${videoId}&page=1`}
        className="w-full h-full"
        allowFullScreen
        title={title}
      />
    )
  }
  return <div>不支持的视频源</div>
}