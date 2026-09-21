// app/api/admin/products/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  getProductSettings,
  updateProductSettings,
  initializeProductSettings,
} from '@/lib/products/services/product-settings.service';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  try {
    const settings = await getProductSettings(locale);
    if (settings === null) {
      // 文件不存在，返回空配置
      return NextResponse.json({
        defaultSettings: null,
        attributeTemplates: [],
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    console.error('GET /settings error:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  try {
    const body = await request.json();
    await updateProductSettings(locale, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PUT /settings error:', error);
    return NextResponse.json({ error: '保存失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locales: string[] = body.locales;
    if (!Array.isArray(locales) || locales.length === 0) {
      return NextResponse.json({ error: 'locales 参数必须是非空数组' }, { status: 400 });
    }

    const results = await initializeProductSettings(locales);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    const message = failCount === 0
      ? `所有站点（${results.length} 个）初始化成功`
      : `${successCount} 个站点成功，${failCount} 个失败`;
    return NextResponse.json({ success: failCount === 0, message, results });
  } catch (error: any) {
    console.error('POST /settings error:', error);
    return NextResponse.json({ error: error.message || '批量初始化失败' }, { status: 500 });
  }
}