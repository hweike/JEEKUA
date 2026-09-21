import { NextRequest, NextResponse } from 'next/server';
import { downloadAndSaveImage } from '@/lib/files/download';

// ========== 辅助函数 ==========

async function fetchYouTubeDuration(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`
  );
  const data = await res.json();
  if (data.items && data.items[0]) {
    const duration = data.items[0].contentDetails.duration;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match?.[1] || '0');
    const minutes = parseInt(match?.[2] || '0');
    const seconds = parseInt(match?.[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

async function fetchVimeoInfo(videoId: string): Promise<{ duration: number | null; thumbnail: string | null }> {
  try {
    const res = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`);
    const data = await res.json();
    if (data[0]) {
      return {
        duration: data[0].duration,
        thumbnail: data[0].thumbnail_large,
      };
    }
  } catch {}
  return { duration: null, thumbnail: null };
}

async function fetchBilibiliInfo(videoId: string): Promise<{ duration: number | null; thumbnail: string | null }> {
  try {
    const res = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${videoId}`);
    const data = await res.json();
    if (data.code === 0 && data.data) {
      return {
        duration: data.data.duration,
        thumbnail: data.data.pic,
      };
    }
  } catch {}
  return { duration: null, thumbnail: null };
}

// ========== POST 处理 ==========

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // 1. 解析平台和 ID
    const youtube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const vimeo = /vimeo\.com\/(?:.*\/)?(\d+)/;
    const bilibili = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/;

    let source: string = '';
    let id: string = '';

    if (youtube.test(url)) {
      source = 'youtube';
      id = url.match(youtube)?.[1] || '';
    } else if (vimeo.test(url)) {
      source = 'vimeo';
      id = url.match(vimeo)?.[1] || '';
    } else if (bilibili.test(url)) {
      source = 'bilibili';
      id = url.match(bilibili)?.[1] || '';
    } else {
      return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'Failed to extract video ID' }, { status: 400 });
    }

    // 2. 获取时长和原始封面 URL
    let duration: number | null = null;
    let thumbnail: string | null = null;

    if (source === 'youtube') {
      duration = await fetchYouTubeDuration(id);
      thumbnail = getYouTubeThumbnail(id);
    } else if (source === 'vimeo') {
      const info = await fetchVimeoInfo(id);
      duration = info.duration;
      thumbnail = info.thumbnail;
    } else if (source === 'bilibili') {
      const info = await fetchBilibiliInfo(id);
      duration = info.duration;
      thumbnail = info.thumbnail;
    }

    // 3. 如果获取到缩略图，下载并保存到自己的存储
    let localThumbnail: string | null = null;
    if (thumbnail) {
      try {
        // 使用项目已有的图片下载函数，保存到 video 相关目录
        localThumbnail = await downloadAndSaveImage(thumbnail, {
          referenceType: 'video',
          referenceId: `temp_${id}`, // 临时 ID，后续会由前端传入真实 videoId
        });
      } catch (err) {
        console.error('下载并保存缩略图失败:', err);
        // 失败时仍返回原始 URL（前端可降级）
        localThumbnail = thumbnail;
      }
    }

    // 4. 返回结果（优先返回本地 URL）
    return NextResponse.json({
      source,
      videoId: id,
      duration,
      thumbnail: localThumbnail || thumbnail, // 若下载成功则返回本地路径，否则返回原始 URL
    });
  } catch (error: any) {
    console.error('视频信息获取失败:', error);
    return NextResponse.json({ error: error.message || '获取失败' }, { status: 500 });
  }
}