// api/admin/AiHelper/import/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getRegisteredType, ImportRequest } from '@/lib/AiHelper';

export async function POST(request: NextRequest) {
  try {
    const body: ImportRequest = await request.json();
    const { type, sourceLanguage, translations } = body;

    if (!type) {
      return NextResponse.json(
        { success: false, error: '缺少 type 参数' },
        { status: 400 }
      );
    }

    if (!sourceLanguage) {
      return NextResponse.json(
        { success: false, error: '缺少 sourceLanguage 参数' },
        { status: 400 }
      );
    }

    if (!translations || !Array.isArray(translations) || translations.length === 0) {
      return NextResponse.json(
        { success: false, error: 'translations 必须是非空数组' },
        { status: 400 }
      );
    }

    const registered = getRegisteredType(type);
    if (!registered) {
      return NextResponse.json(
        { success: false, error: `未知类型: ${type}` },
        { status: 400 }
      );
    }

    const result = await registered.service.importTranslations(
      translations,
      sourceLanguage
    );

    const message = result.failed === 0
      ? `成功导入 ${result.imported} 条分类`
      : `成功 ${result.imported} 条，失败 ${result.failed} 条`;

    return NextResponse.json({
      success: true,
      ...result,
      message,
    });
  } catch (error: any) {
    console.error('导入翻译数据失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '导入失败' },
      { status: 500 }
    );
  }
}