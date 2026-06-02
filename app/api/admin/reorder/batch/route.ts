import { NextResponse } from 'next/server';
import { getDocById, saveDoc } from '@/lib/docs';

export async function POST(request: Request) {
  const body = await request.json();
  const { locale, updates } = body;
  if (!locale || !updates) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 });
  }

  try {
    for (const update of updates) {
      const { id, parentId, order } = update;
      const doc = getDocById(locale, id);
      if (!doc) continue;
      // 只更新 parentId 和 order，保留其他字段
      const updatedData = {
        ...doc,
        parentId,
        order,
      };
      // 注意：需要获取原内容
      const { content } = doc;
      await saveDoc(locale, updatedData, content);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('批量更新失败:', err);
    return NextResponse.json({ error: '批量更新失败' }, { status: 500 });
  }
}