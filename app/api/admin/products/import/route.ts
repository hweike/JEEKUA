// app/api/admin/categories/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getPrivateStorage } from '@/lib/storage/factory';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const locale = formData.get('locale') as string || 'zh';

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // 将 Excel 数据转换为分类结构
    const categoriesMap = new Map();
    for (const row of rows as any[]) {
      const catName = row['一级分类名称'];
      const catSlug = row['一级分类URL'];
      const catOrder = parseInt(row['一级分类排序'] || 0);
      const seriesName = row['二级分类名称'];
      const seriesSlug = row['二级分类URL'];
      const seriesOrder = parseInt(row['二级分类排序'] || 0);
      const seriesModel = row['关联产品模型'] || '';

      if (!categoriesMap.has(catSlug)) {
        categoriesMap.set(catSlug, {
          name: catName,
          slug: catSlug,
          order: catOrder,
          seo: { title: '', description: '', keywords: '' },
          description: '',
          features: [],
          series: [],
        });
      }
      if (seriesName && seriesSlug) {
        categoriesMap.get(catSlug).series.push({
          name: seriesName,
          slug: seriesSlug,
          order: seriesOrder,
          productModel: seriesModel,
          seo: { title: '', description: '', keywords: '' },
          features: [],
          description: '',
        });
      }
    }

    const newCategories = Array.from(categoriesMap.values());
    const storage = getPrivateStorage();
    const key = 'categories.json'; // 存储 Key（无 data/ 前缀，与其他模块统一）

    // 读取现有分类（如果文件不存在则初始化为空对象）
    let allCategories: Record<string, any[]> = {};
    try {
      const content = await storage.read(key, 'utf8');
      allCategories = JSON.parse(content as string);
    } catch (error: any) {
      if (error?.code !== 'NoSuchKey' && error?.Code !== 'NoSuchKey' && !error?.message?.includes('File not found')) {
        throw error;
      }
      // 文件不存在，保持空对象
    }

    allCategories[locale] = newCategories;
    await storage.write(key, JSON.stringify(allCategories, null, 2), { contentType: 'application/json' });

    return NextResponse.json({ message: '导入成功', count: newCategories.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}