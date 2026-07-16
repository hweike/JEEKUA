import { NextRequest, NextResponse } from 'next/server';
import { getRegisteredType } from '@/lib/AiHelper';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const locale = searchParams.get('locale') || 'en';
    const idsParam = searchParams.get('ids'); // 逗号分隔的ID列表（可选）

    if (!type) {
      return NextResponse.json(
        { success: false, error: '缺少 type 参数' },
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

    // 解析 ids 参数为数组
    const ids = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    // 调用适配器的 exportData，传递 ids（如果有）
    const data = await registered.service.exportData(locale, ids ? { ids } : undefined);

    // 计算 count：查找返回数据中的第一个数组字段
    let count = 0;
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        count = data[key].length;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data,
      count,
    });
  } catch (error: any) {
    console.error('导出数据失败:', error);
    return NextResponse.json(
      { success: false, error: error.message || '导出数据失败' },
      { status: 500 }
    );
  }
}