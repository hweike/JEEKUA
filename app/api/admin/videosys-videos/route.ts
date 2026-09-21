// app/api/admin/videosys-videos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getFullVideo,
  listVideos,
  deleteVideoService,
  createVideoFromData,
  updateVideoFromData,
  copyVideoToLocale,
  listVideosBatch,
} from '@/lib/videosys/video-service';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const localesParam = searchParams.get('locales');
  const id = searchParams.get('id');
  const title = searchParams.get('title') || undefined;
  const category = searchParams.get('category') || undefined;
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  try {
    // 批量获取（多语言）
    if (localesParam) {
      const locales = localesParam.split(',').filter(Boolean);
      if (locales.length === 0) {
        return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
      }
      // 使用一次查询，替代多次并行
      const result = await listVideosBatch(locales, true);
      return NextResponse.json(result);
    }

    // 单语言
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }
    if (id) {
      const video = await getFullVideo(id, locale);
      return video ? NextResponse.json(video) : NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const data = await listVideos({ locale, title, category, page, limit });
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('GET /videosys-videos error:', error);
    return NextResponse.json({ error: error.message || '读取失败' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sourceLocale, targetLocale, id: copyId, locale, ...videoData } = body;

    // 复制操作
    if (action === 'copy') {
      if (!sourceLocale || !targetLocale || !copyId) {
        return NextResponse.json({ error: '缺少必要参数 (sourceLocale, targetLocale, id)' }, { status: 400 });
      }
      await copyVideoToLocale(copyId, sourceLocale, targetLocale);
      return NextResponse.json({ success: true, id: copyId });
    }

    // 普通创建/更新
    if (!locale) {
      return NextResponse.json({ error: 'Missing locale' }, { status: 400 });
    }

    // 如果提供了 id，视为更新
    if (videoData.id) {
      await updateVideoFromData(videoData.id, videoData, locale);
      return NextResponse.json({ success: true });
    } else {
      // 创建新视频
      const result = await createVideoFromData(videoData, locale);
      return NextResponse.json({ success: true, id: result.id });
    }
  } catch (error: any) {
    console.error('POST /videosys-videos error:', error);
    return NextResponse.json({ error: error.message || '操作失败' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { locale, ...videoData } = body;
    if (!locale || !videoData.id) {
      return NextResponse.json({ error: 'Missing locale or id' }, { status: 400 });
    }
    await updateVideoFromData(videoData.id, videoData, locale);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /videosys-videos error:', error);
    return NextResponse.json({ error: error.message || '更新失败' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const locale = searchParams.get('locale');
    const id = searchParams.get('id');
    if (!locale || !id) {
      return NextResponse.json({ error: 'Missing locale or id' }, { status: 400 });
    }
    await deleteVideoService(id, locale);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /videosys-videos error:', error);
    return NextResponse.json({ error: error.message || '删除失败' }, { status: 500 });
  }
}