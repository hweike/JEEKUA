import { NextRequest, NextResponse } from 'next/server';
import { createVideo, updateVideoService, deleteVideoService, getFullVideo, listVideos } from '@/lib/videosys/video-service';
import { VideoData } from '@/lib/videosys/types';

function parseVideoUrl(url: string): { source_type: 'youtube' | 'vimeo' | 'bilibili'; video_id: string } | null {
  const youtube = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const vimeo = /vimeo\.com\/(?:.*\/)?(\d+)/;
  const bilibili = /bilibili\.com\/video\/(BV[0-9A-Za-z]+)/;
  let match;
  if ((match = url.match(youtube))) return { source_type: 'youtube', video_id: match[1] };
  if ((match = url.match(vimeo))) return { source_type: 'vimeo', video_id: match[1] };
  if ((match = url.match(bilibili))) return { source_type: 'bilibili', video_id: match[1] };
  return null;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  if (!locale) return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  const id = searchParams.get('id');
  if (id) {
    const video = await getFullVideo(id, locale);
    return video ? NextResponse.json(video) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const title = searchParams.get('title') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const data = listVideos({ locale, title, category, visible: true, page, limit });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { locale, ...videoData } = body;
  if (!locale) return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  // 自动解析视频源URL
  if (videoData.video_url) {
    const parsed = parseVideoUrl(videoData.video_url);
    if (!parsed) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    videoData.source_type = parsed.source_type;
    videoData.video_id = parsed.video_id;
  } else {
    return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
  }
  // 生成ID
  const id = Math.floor(10000000 + Math.random() * 90000000).toString();
  const now = new Date().toISOString();
  const fullVideo: VideoData = {
    id,
    locale,
    title: videoData.title,
    slug: videoData.slug,
    category_key: videoData.category_key,
    source_type: videoData.source_type,
    video_url: videoData.video_url,
    video_id: videoData.video_id,
    thumbnail: videoData.thumbnail,
    duration: videoData.duration,
    visible: videoData.visible ?? 1,
    flagged: videoData.flagged ?? 0,
    template: videoData.template,
    seo_keywords: videoData.seo_keywords,
    seo_title: videoData.seo_title,
    seo_description: videoData.seo_description,
    order_index: videoData.order_index ?? 0,
    published_at: now,
    updated_at: now,
    created_at: now,
    content: videoData.content || '',
  };
  await createVideo(fullVideo, locale);
  return NextResponse.json({ success: true, id });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { locale, ...videoData } = body;
  if (!locale || !videoData.id) {
    return NextResponse.json({ error: 'Missing locale or id' }, { status: 400 });
  }
  if (videoData.video_url) {
    const parsed = parseVideoUrl(videoData.video_url);
    if (!parsed) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    videoData.source_type = parsed.source_type;
    videoData.video_id = parsed.video_id;
  }
  const existing = await getFullVideo(videoData.id, locale);
  if (!existing) return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  const updated: VideoData = {
    ...existing,
    ...videoData,
    updated_at: new Date().toISOString(),
  };
  await updateVideoService(updated, locale);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) return NextResponse.json({ error: 'Missing locale or id' }, { status: 400 });
  await deleteVideoService(id, locale);
  return NextResponse.json({ success: true });
}