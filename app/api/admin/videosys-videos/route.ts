// app/api/admin/videosys-videos/route.ts
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

// ---- GET：支持单语言和批量 ----
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const localesParam = searchParams.get('locales');
  const id = searchParams.get('id');
  const title = searchParams.get('title') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  // 批量获取
  if (localesParam) {
    const locales = localesParam.split(',').filter(Boolean);
    if (locales.length === 0) {
      return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
    }
    try {
      const result: Record<string, any[]> = {};
      await Promise.all(locales.map(async (loc) => {
        // ★★★ 修改：增加 includeInvisible: true，显示所有视频（包括不可见的） ★★★
        const data = await listVideos({ 
          locale: loc, 
          title: undefined, 
          category: undefined, 
          page: 1, 
          limit: 100,
          includeInvisible: true 
        });
        result[loc] = data.items || [];
      }));
      return NextResponse.json(result);
    } catch (error) {
      console.error('批量获取视频失败:', error);
      return NextResponse.json({ error: '批量读取失败' }, { status: 500 });
    }
  }

  // ---- 单语言 ----
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }
  if (id) {
    const video = await getFullVideo(id, locale);
    return video ? NextResponse.json(video) : NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const data = await listVideos({ locale, title, category, page, limit });
  return NextResponse.json(data);
}

// ---- POST：创建、更新（Upsert）、复制 ----
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, sourceLocale, targetLocale, id: copyId, locale, ...videoData } = body;

  // 复制操作
  if (action === 'copy') {
    if (!sourceLocale || !targetLocale || !copyId) {
      return NextResponse.json({ error: '缺少必要参数 (sourceLocale, targetLocale, id)' }, { status: 400 });
    }
    if (sourceLocale === targetLocale) {
      return NextResponse.json({ error: '源语言和目标语言不能相同' }, { status: 400 });
    }
    try {
      const sourceVideo = await getFullVideo(copyId, sourceLocale);
      if (!sourceVideo) {
        return NextResponse.json({ error: '源视频不存在' }, { status: 404 });
      }
      const now = new Date().toISOString();
      const cloned: VideoData = {
        ...sourceVideo,
        locale: targetLocale,
        updated_at: now,
        created_at: sourceVideo.created_at || now,
      };
      // 检查目标是否存在
      const targetVideo = await getFullVideo(copyId, targetLocale);
      if (targetVideo) {
        await updateVideoService(cloned, targetLocale);
      } else {
        await createVideo(cloned, targetLocale);
      }
      return NextResponse.json({ success: true, id: copyId });
    } catch (error) {
      console.error('复制视频失败:', error);
      return NextResponse.json({ error: '复制失败' }, { status: 500 });
    }
  }

  // ---- 普通创建/更新 ----
  if (!locale) {
    return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
  }

  // 如果提供了 id，尝试更新；否则创建新视频
  if (videoData.id) {
    // 更新现有视频
    const existing = await getFullVideo(videoData.id, locale);
    if (!existing) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }
    if (videoData.video_url) {
      const parsed = parseVideoUrl(videoData.video_url);
      if (!parsed) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
      videoData.source_type = parsed.source_type;
      videoData.video_id = parsed.video_id;
    }
    const updated: VideoData = {
      ...existing,
      ...videoData,
      updated_at: new Date().toISOString(),
    };
    await updateVideoService(updated, locale);
    return NextResponse.json({ success: true });
  } else {
    // 创建新视频
    if (!videoData.video_url) {
      return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
    }
    const parsed = parseVideoUrl(videoData.video_url);
    if (!parsed) return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    videoData.source_type = parsed.source_type;
    videoData.video_id = parsed.video_id;

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
}

// ---- PUT：单独实现（与 POST 的区别在于只用于更新，不创建） ----
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

// ---- DELETE：删除视频 ----
export async function DELETE(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) return NextResponse.json({ error: 'Missing locale or id' }, { status: 400 });
  await deleteVideoService(id, locale);
  return NextResponse.json({ success: true });
}