import { NextRequest, NextResponse } from 'next/server';

async function fetchYouTubeDuration(videoId: string): Promise<number | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoId}&key=${apiKey}`);
  const data = await res.json();
  if (data.items && data.items[0]) {
    const duration = data.items[0].contentDetails.duration;
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    return hours * 3600 + minutes * 60 + seconds;
  }
  return null;
}

function getYouTubeThumbnail(videoId: string): string {
  // 优先使用 maxresdefault，若失效可降级
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

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });

  const youtube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const vimeo = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const bilibili = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/;
  let source = '';
  let id = '';
  if (youtube.test(url)) {
    source = 'youtube';
    id = url.match(youtube)[1];
  } else if (vimeo.test(url)) {
    source = 'vimeo';
    id = url.match(vimeo)[1];
  } else if (bilibili.test(url)) {
    source = 'bilibili';
    id = url.match(bilibili)[1];
  } else {
    return NextResponse.json({ error: 'Unsupported platform' }, { status: 400 });
  }

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

  return NextResponse.json({ source, videoId: id, duration, thumbnail });
}