import { NextRequest, NextResponse } from 'next/server';
import { strategiesService } from '@/lib/seo/services';

// 本地常量（避免导入 lib/constants）
const DEFAULT_SITE_ID = '000001';

// =====================================================
// GET /api/discovery/seo/strategies
// 获取所有策略
// =====================================================
export async function GET() {
  try {
    const data = await strategiesService.getStrategies(DEFAULT_SITE_ID);
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// =====================================================
// POST /api/discovery/seo/strategies
// 保存策略
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📦 收到的策略数据:', JSON.stringify(body, null, 2));
    const data = await strategiesService.saveStrategy(body, DEFAULT_SITE_ID);
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('❌ 保存策略失败:', error);
    // 返回更详细的错误信息
    return NextResponse.json(
      { 
        error: error.message,
        details: error.details || error,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}