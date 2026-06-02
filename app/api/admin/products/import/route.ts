import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import * as XLSX from 'xlsx'; // 需要安装 xlsx 包

const CATEGORIES_FILE = path.join(process.cwd(), 'data/categories.json');

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
    // 这里需要根据您的 Excel 模板格式实现转换逻辑
    // 示例：假设 Excel 有列：一级分类名称、一级分类URL、二级分类名称、二级分类URL等
    // 实际请根据您的模板调整

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
    // 读取现有分类
    const allCategories = await fs.readFile(CATEGORIES_FILE, 'utf-8').then(JSON.parse).catch(() => ({}));
    allCategories[locale] = newCategories;
    await fs.writeFile(CATEGORIES_FILE, JSON.stringify(allCategories, null, 2));

    return NextResponse.json({ message: '导入成功', count: newCategories.length });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: '导入失败' }, { status: 500 });
  }
}