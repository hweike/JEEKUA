// app/api/admin/pages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { updatePage, deletePage } from '@/lib/pages/pageService';
import { readPage } from '@/lib/pages/storage';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// ========== 数据合规检查（更新场景，字段可选） ==========
function validatePageData(data: any) {
  const errors: string[] = [];

  if (data.title !== undefined && (typeof data.title !== 'string' || data.title.trim() === '')) {
    errors.push('title 不能为空字符串');
  }
  if (data.content !== undefined && typeof data.content !== 'string') {
    errors.push('content 必须是字符串');
  }
  if (data.visible !== undefined && !['visible', 'hidden'].includes(data.visible)) {
    errors.push(`visible 必须是 'visible' 或 'hidden'，实际为: ${data.visible}`);
  }
  if (data.template !== undefined && typeof data.template !== 'string') {
    errors.push('template 必须是字符串');
  }
  if (data.slug !== undefined && typeof data.slug !== 'string') {
    errors.push('slug 必须是字符串');
  }
  if (data.seo_keywords !== undefined && typeof data.seo_keywords !== 'string') {
    errors.push('seo_keywords 必须是字符串');
  }
  if (data.seo_title !== undefined && typeof data.seo_title !== 'string') {
    errors.push('seo_title 必须是字符串');
  }
  if (data.seo_description !== undefined && typeof data.seo_description !== 'string') {
    errors.push('seo_description 必须是字符串');
  }

  return { errors };
}

/**
 * GET /api/admin/pages/:id?locale=zh
 * 后台编辑页面加载，返回完整数据（含 content、templateData）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');

  if (!locale) {
    return NextResponse.json(
      { success: false, error: 'Missing locale' },
      { status: 400 }
    );
  }

  try {
    if (isDev) {
      console.log(`[GET /api/admin/pages/${id}] locale: ${locale}`);
    }

    const page = await readPage(locale, id);
    if (!page) {
      return NextResponse.json(
        { success: false, error: 'Page not found' },
        { status: 404 }
      );
    }

    // ✅ 返回完整数据（含 content、templateData）
    return NextResponse.json({
      success: true,
      data: page,
    });
  } catch (error: any) {
    console.error(`[GET /api/admin/pages/${id}] 错误:`, error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || '读取失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/pages/:id?locale=zh
 * 更新页面，返回统一结构
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const searchParams = request.nextUrl.searchParams;
    const locale = searchParams.get('locale');

    if (!locale) {
      return NextResponse.json(
        { success: false, error: 'Missing locale' },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (isDev) {
      console.log('========================================');
      console.log(`[PUT /api/admin/pages/${id}] 开始执行`);
      console.log(`[PUT /api/admin/pages/${id}] locale: ${locale}`);
      console.log(`[PUT /api/admin/pages/${id}] body:`, JSON.stringify(body, null, 2));
    }

    // 数据合规检查
    const { errors } = validatePageData(body);
    if (errors.length > 0) {
      console.error(`[PUT /api/admin/pages/${id}] ❌ 数据合规性错误:`, errors);
      return NextResponse.json(
        { success: false, error: `数据不合规: ${errors.join('; ')}` },
        { status: 400 }
      );
    }

    // 更新页面
    const startTime = Date.now();
    const updated = await updatePage(locale, id, body);
    const duration = Date.now() - startTime;

    if (isDev) {
      console.log(`[PUT /api/admin/pages/${id}] ✅ 更新成功 (${duration}ms):`, {
        id: updated.id,
        title: updated.title,
        slug: updated.slug,
      });
    }

    // 返回统一结构，只返回必要字段
    return NextResponse.json({
      success: true,
      data: {
        id: String(updated.id),
        title: String(updated.title),
        slug: String(updated.slug),
        updatedAt: String(updated.updatedAt),
      },
    });
  } catch (error: any) {
    const message = error?.message || '更新失败';
    console.error(`[PUT /api/admin/pages/${id}] ❌ 捕获错误:`, message);

    // 尝试解析 JSON 错误（如 SEO 校验错误）
    try {
      const errors = JSON.parse(message);
      return NextResponse.json(
        { success: false, errors },
        { status: 400 }
      );
    } catch {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }
  }
}

/**
 * DELETE /api/admin/pages/:id?locale=zh
 * 删除页面
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale');

  if (!locale) {
    return NextResponse.json(
      { success: false, error: 'Missing locale' },
      { status: 400 }
    );
  }

  try {
    if (isDev) {
      console.log(`[DELETE /api/admin/pages/${id}] locale: ${locale}`);
    }

    await deletePage(locale, id);

    if (isDev) {
      console.log(`[DELETE /api/admin/pages/${id}] ✅ 删除成功`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[DELETE /api/admin/pages/${id}] ❌ 错误:`, error?.message);
    return NextResponse.json(
      { success: false, error: error?.message || '删除失败' },
      { status: 400 }
    );
  }
}