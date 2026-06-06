// app/api/admin/products/settings/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getPrivateStorage } from '@/lib/storage/factory';

const DEFAULT_SETTINGS = {
  default_min_order_qty: 1,
  default_availability: 'in_stock',
  default_brand: 'Generic',
  sku_rule: 'P-{timestamp}',
  default_currency: 'USD',
  default_shipping_cost: 0,
  default_return_days: 30,
  default_mpn: '',
};

function getStorageKey(locale: string): string {
  return `products/${locale}/settings.json`;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const storage = getPrivateStorage();
  const key = getStorageKey(locale);

  try {
    const content = await storage.read(key, 'utf8');
    const parsed = JSON.parse(content as string);
    return NextResponse.json({
      defaultSettings: parsed.defaultSettings ?? null,
      attributeTemplates: Array.isArray(parsed.attributeTemplates) ? parsed.attributeTemplates : [],
    });
  } catch (error: any) {
    // 文件不存在时返回空配置
    if (error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found')) {
      return NextResponse.json({
        defaultSettings: null,
        attributeTemplates: [],
      });
    }
    console.error('GET /settings error:', error);
    return NextResponse.json({ error: '读取失败' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  try {
    const body = await request.json();
    const storage = getPrivateStorage();
    const key = getStorageKey(locale);

    let existingData: any = {};
    try {
      const content = await storage.read(key, 'utf8');
      existingData = JSON.parse(content as string);
    } catch (error: any) {
      if (!(error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found'))) {
        throw error;
      }
      // 文件不存在，使用空对象
    }

    const newData = {
      defaultSettings: body.defaultSettings !== undefined ? body.defaultSettings : existingData.defaultSettings,
      attributeTemplates: body.attributeTemplates !== undefined ? body.attributeTemplates : (existingData.attributeTemplates || []),
    };

    await storage.write(key, JSON.stringify(newData, null, 2), { contentType: 'application/json' });
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

    const storage = getPrivateStorage();
    const results = [];

    for (const locale of locales) {
      try {
        const key = getStorageKey(locale);

        let existingAttributeTemplates: any[] = [];
        try {
          const content = await storage.read(key, 'utf8');
          const existingData = JSON.parse(content as string);
          if (Array.isArray(existingData.attributeTemplates)) {
            existingAttributeTemplates = existingData.attributeTemplates;
          }
        } catch (error: any) {
          if (!(error?.code === 'NoSuchKey' || error?.Code === 'NoSuchKey' || error?.message?.includes('File not found'))) {
            throw error;
          }
          // 文件不存在，使用空数组
        }

        const newData = {
          defaultSettings: DEFAULT_SETTINGS,
          attributeTemplates: existingAttributeTemplates,
        };

        await storage.write(key, JSON.stringify(newData, null, 2), { contentType: 'application/json' });
        results.push({ locale, success: true });
      } catch (err: any) {
        results.push({ locale, success: false, error: err.message });
      }
    }

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