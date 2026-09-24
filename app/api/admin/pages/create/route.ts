// app/api/admin/pages/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createPage } from '@/lib/pages/pageService';
import type { PageType, Visibility } from '@/types/page';

// 是否为开发环境
const isDev = process.env.NODE_ENV === 'development';

// ========== 数据合规检查 ==========
function validatePageData(data: any, locale: string) {
  const errors: string[] = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('title 不能为空');
  }
  if (data.content !== undefined && typeof data.content !== 'string') {
    errors.push('content 必须是字符串');
  }
  if (!data.visible || !['visible', 'hidden'].includes(data.visible)) {
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
  if (!locale || typeof locale !== 'string') {
    errors.push('locale 无效');
  }

  return { errors };
}

// ========== POST /api/admin/pages/create ==========
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { locale, id, ...data } = body;

    if (isDev) {
      console.log('========================================');
      console.log('[api/pages/create] 开始执行');
      console.log('[api/pages/create] locale:', locale);
      console.log('[api/pages/create] id:', id);
      console.log('[api/pages/create] data:', JSON.stringify(data, null, 2));
    }

    // 1. 参数校验
    if (!locale) {
      return NextResponse.json(
        { success: false, error: 'Missing locale' },
        { status: 400 }
      );
    }

    // 2. 权限校验：仅允许 zh 和 en 创建页面
    if (locale !== 'zh' && locale !== 'en') {
      return NextResponse.json(
        { success: false, error: 'Cannot create page for this locale' },
        { status: 403 }
      );
    }

    // 3. 数据合规检查
    const { errors } = validatePageData(data, locale);
    if (errors.length > 0) {
      console.error('[api/pages/create] ❌ 数据合规性错误:', errors);
      return NextResponse.json(
        { success: false, error: `数据不合规: ${errors.join('; ')}` },
        { status: 400 }
      );
    }

    // 4. 创建页面
    const startTime = Date.now();
    const page = await createPage(locale, data, id);
    const duration = Date.now() - startTime;

    if (isDev) {
      console.log(`[api/pages/create] ✅ 创建成功 (${duration}ms):`, {
        id: page.id,
        title: page.title,
        slug: page.slug,
      });
    }

    // ✅ 清 ISR：新页面路径
    try {
      revalidatePath(`/${locale}/${page.slug}`);
      if (isDev) {
        console.log(`[api/pages/create] ✅ revalidatePath: /${locale}/${page.slug}`);
      }
    } catch (e) {
      console.warn('[api/pages/create] revalidatePath 失败:', e);
    }

    // 5. 返回统一结构（只返回必要字段）
    return NextResponse.json({
      success: true,
      data: {
        id: String(page.id),
        title: String(page.title),
        slug: String(page.slug),
        updatedAt: String(page.updatedAt),
      },
    }, { status: 201 });

  } catch (error: any) {
    const message = error?.message || '创建失败';
    console.error('[api/admin/pages/create] ❌ 捕获错误:', message);

    // 尝试解析 JSON 错误（如 SEO 校验错误）
    try {
      const errors = JSON.parse(message);
      return NextResponse.json({ success: false, errors }, { status: 400 });
    } catch {
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }
  }
}