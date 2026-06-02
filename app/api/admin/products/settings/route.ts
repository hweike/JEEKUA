import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

function getSettingsPath(locale: string) {
  return path.join(process.cwd(), 'data/products', locale, 'settings.json');
}

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const filePath = getSettingsPath(locale);

  try {
    const data = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    return NextResponse.json({
      defaultSettings: parsed.defaultSettings ?? null,
      attributeTemplates: Array.isArray(parsed.attributeTemplates) ? parsed.attributeTemplates : [],
    });
  } catch {
    return NextResponse.json({
      defaultSettings: null,
      attributeTemplates: [],
    });
  }
}

export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  try {
    const body = await request.json();
    const filePath = getSettingsPath(locale);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    let existingData: any = {};
    try {
      const existingContent = await fs.readFile(filePath, 'utf-8');
      existingData = JSON.parse(existingContent);
    } catch {}

    const newData = {
      defaultSettings: body.defaultSettings !== undefined ? body.defaultSettings : existingData.defaultSettings,
      attributeTemplates: body.attributeTemplates !== undefined ? body.attributeTemplates : (existingData.attributeTemplates || []),
    };

    await fs.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to save settings:', error);
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

    const results = [];
    for (const locale of locales) {
      try {
        const filePath = getSettingsPath(locale);
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });

        let existingAttributeTemplates: any[] = [];
        try {
          const existingContent = await fs.readFile(filePath, 'utf-8');
          const existingData = JSON.parse(existingContent);
          if (Array.isArray(existingData.attributeTemplates)) {
            existingAttributeTemplates = existingData.attributeTemplates;
          }
        } catch {}

        const newData = {
          defaultSettings: DEFAULT_SETTINGS,
          attributeTemplates: existingAttributeTemplates,
        };

        await fs.writeFile(filePath, JSON.stringify(newData, null, 2), 'utf-8');
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
    console.error('Failed to initialize all locales:', error);
    return NextResponse.json({ error: error.message || '批量初始化失败' }, { status: 500 });
  }
}