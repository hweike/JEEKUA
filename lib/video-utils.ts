export interface VideoInfo {
  platform: 'youtube' | 'vimeo' | 'bilibili' | 'unknown';
  videoId: string;
  embedUrl: string;
  thumbnailUrl: string;
}

export function parseVideoUrl(url: string): VideoInfo | null {
  if (!url || typeof url !== 'string') return null;
  const cleanUrl = url.trim();

  // ========== YouTube 解析 ==========
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)(?:\?|&|$)/,
    /youtube\.com\/embed\/([\w-]+)(?:\?|$)/,
    /youtube\.com\/v\/([\w-]+)(?:\?|$)/,
    /youtube\.com\/shorts\/([\w-]+)(?:\?|$)/,
  ];
  for (const pattern of youtubePatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      return {
        platform: 'youtube',
        videoId,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      };
    }
  }

  // ========== Vimeo 解析 ==========
  const vimeoMatch = cleanUrl.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    return {
      platform: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}`,
      thumbnailUrl: '',
    };
  }

  // ========== Bilibili 解析（增强版：URL API + 正则兜底） ==========
  if (cleanUrl.includes('bilibili.com/video/')) {
    try {
      const urlObj = new URL(cleanUrl);
      const pathSegments = urlObj.pathname.split('/');
      let bvid: string | null = null;
      for (const segment of pathSegments) {
        if (segment && segment.toUpperCase().startsWith('BV')) {
          bvid = segment;
          break;
        }
      }
      if (bvid) {
        return {
          platform: 'bilibili',
          videoId: bvid,
          embedUrl: `https://player.bilibili.com/player.html?bvid=${bvid}&page=1`,
          thumbnailUrl: '',
        };
      }
    } catch (e) {
      // URL 解析失败，使用正则兜底
    }
  }

  // 正则兜底：支持标准视频页、嵌入页、番剧
  const biliPatterns = [
    /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/,
    /bilibili\.com\/embed\/(BV[0-9A-Za-z]+)/,
    /bilibili\.com\/bangumi\/play\/(ep\d+)/,
    /bilibili\.com\/bangumi\/play\/(ss\d+)/,
  ];
  for (const pattern of biliPatterns) {
    const match = cleanUrl.match(pattern);
    if (match) {
      const videoId = match[1];
      const embedUrl = `https://player.bilibili.com/player.html?bvid=${videoId}&page=1`;
      return {
        platform: 'bilibili',
        videoId,
        embedUrl,
        thumbnailUrl: '',
      };
    }
  }

  return null;
}

export function getVideoEmbedUrl(videoInfo: VideoInfo, loop: boolean): string {
  let embedUrl = videoInfo.embedUrl;
  const separator = embedUrl.includes('?') ? '&' : '?';
  if (loop) {
    switch (videoInfo.platform) {
      case 'youtube':
        embedUrl += `${separator}loop=1&playlist=${videoInfo.videoId}`;
        break;
      case 'vimeo':
        embedUrl += `${separator}loop=1`;
        break;
      // B站不支持简单的 URL 循环参数，保持原样
    }
  }
  // 强制关闭自动播放，确保页面加载时视频不自动播放
  embedUrl += `${separator}autoplay=0`;
  return embedUrl;
}