import { NextRequest, NextResponse } from 'next/server';
import { addLog } from '@/lib/sync/logs';
import { getCurrentUser } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return NextResponse.json({ error: '未授权' }, { status: 401 });

  const { type, sourceLocale, targetLocales, itemId, syncAll } = await request.json();
  if (!type || !sourceLocale || !targetLocales?.length) {
    return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
  }
  if (!syncAll && !itemId) {
    return NextResponse.json({ error: '缺少 itemId 或 syncAll 标识' }, { status: 400 });
  }

  const baseUrl = request.nextUrl.origin;
  const headers = { Authorization: request.headers.get('authorization') || '' };

  // 获取需要同步的 itemId 列表
  let itemIds: string[] = [];
  if (syncAll) {
    try {
      const listRes = await fetch(`${baseUrl}/api/sync-data/${type}/list?locale=${sourceLocale}`, { headers });
      if (!listRes.ok) throw new Error(`获取列表失败: ${listRes.status}`);
      const list = await listRes.json();
      itemIds = list.map((item: any) => item.id);
    } catch (err: any) {
      return NextResponse.json({ error: `获取源站点列表失败: ${err.message}` }, { status: 500 });
    }
  } else {
    itemIds = [itemId];
  }

  const results = [];
  for (const id of itemIds) {
    // 读取源数据
    let sourceData;
    try {
      const readRes = await fetch(`${baseUrl}/api/sync-data/${type}/item?id=${id}&locale=${sourceLocale}`, { headers });
      if (!readRes.ok) throw new Error(`读取源数据失败: ${readRes.status}`);
      sourceData = await readRes.json();
    } catch (err: any) {
      results.push({ id, error: `读取源数据失败: ${err.message}` });
      continue;
    }

    // 对每个目标站点同步
    for (const targetLocale of targetLocales) {
      let status: 'success' | 'failed' = 'failed';
      let errorMsg = '';
      try {
        // 预留翻译接口
        let targetData = sourceData;
        // TODO: 调用 DeepSeek 翻译
        // if (process.env.ENABLE_TRANSLATION === 'true') {
        //   targetData = await translateData(sourceData, sourceLocale, targetLocale);
        // }

        const writeRes = await fetch(`${baseUrl}/api/sync-data/${type}/item`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ locale: targetLocale, data: targetData, id }),
        });
        if (!writeRes.ok) throw new Error(`写入失败: ${writeRes.status}`);
        status = 'success';
      } catch (err: any) {
        errorMsg = err.message;
      }
      addLog({
        id: crypto.randomUUID(),
        syncType: type,
        sourceLocale,
        targetLocale,
        status,
        errorMsg,
        operator: user.name || user.email,
        createdAt: new Date().toISOString(),
        itemId: id,
      });
      results.push({ id, targetLocale, status, errorMsg });
    }
  }

  const allSuccess = results.every(r => r.status === 'success');
  return NextResponse.json({ success: allSuccess, results });
}