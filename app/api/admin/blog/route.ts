// app/api/admin/blog/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getPosts,
  getPost,
  getPostsBatch,
  upsertPost,
  copyPost,
  deletePost,
} from '@/lib/blog/services/post.service';

// ---------- GET ----------
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const localesParam = searchParams.get('locales');
  const id = searchParams.get('id');
  const search = searchParams.get('search');
  const category = searchParams.get('category');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');

  try {
    // 批量查询
    if (localesParam) {
      const locales = localesParam.split(',').filter(Boolean);
      if (locales.length === 0) {
        return NextResponse.json({ error: 'No valid locales provided' }, { status: 400 });
      }
      const result = await getPostsBatch(locales);
      return NextResponse.json(result);
    }

    if (!locale) {
      return NextResponse.json({ error: '缺少 locale 参数' }, { status: 400 });
    }

    // 单篇文章（含内容）
    if (id) {
      const post = await getPost(locale, id);
      return NextResponse.json(post);
    }

    // 分页列表
    const result = await getPosts(locale, { search, category, page, limit });
    return NextResponse.json(result);
  } catch (error) {
    console.error('GET /api/admin/blog error:', error);
    return NextResponse.json({ error: '查询失败' }, { status: 500 });
  }
}

// ---------- POST ----------
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sourceLocale, targetLocale, id: copyId, ...postData } = body;

    // 复制
    if (action === 'copy') {
      if (!sourceLocale || !targetLocale || !copyId) {
        return NextResponse.json(
          { error: '缺少必要参数 (sourceLocale, targetLocale, id)' },
          { status: 400 }
        );
      }
      try {
        await copyPost(sourceLocale, targetLocale, copyId);
        return NextResponse.json({ success: true, id: copyId });
      } catch (err: any) {
        return NextResponse.json(
          { error: err.message },
          { status: err.message.includes('不存在') ? 404 : 400 }
        );
      }
    }

    // 普通保存（upsert）
    // 从 body 中提取 content 单独处理
    const { content, ...rest } = body;
    if (!rest.locale || !rest.title || !rest.slug) {
      return NextResponse.json({ error: '缺少必要字段' }, { status: 400 });
    }
    const result = await upsertPost(rest.locale, rest, content);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('POST /api/admin/blog error:', error);
    return NextResponse.json({ error: '操作失败' }, { status: 500 });
  }
}

// ---------- DELETE ----------
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');
  const id = searchParams.get('id');
  if (!locale || !id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    await deletePost(locale, id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.message.includes('不存在') ? 404 : 500 }
    );
  }
}