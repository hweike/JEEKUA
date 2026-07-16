// app/api/admin/AiHelper/generate-prompt/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getRegisteredType } from '@/lib/AiHelper';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, sourceLocale, targetLocales, sourceData, languageNames } = body;

    if (!type || !sourceLocale || !targetLocales || !sourceData) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
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

    // 生成提示词（替换占位符在服务端完成）
    let prompt = registered.service.generatePrompt(
      sourceLocale,
      targetLocales,
      sourceData,
      languageNames || {}
    );

    // 嵌入源数据 JSON
    const jsonStr = JSON.stringify(sourceData, null, 2);
    prompt = prompt.replace('{{SOURCE_DATA_JSON}}', jsonStr);

    return NextResponse.json({
      success: true,
      prompt,
    });
  } catch (error: any) {
    console.error('生成提示词失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '生成失败' },
      { status: 500 }
    );
  }
}