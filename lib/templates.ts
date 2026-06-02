import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'data', 'templates');

// 获取指定类型的模板
export function getPageTemplate(type: 'series' | 'product' | 'subproduct', templateName: string = 'default') {
  const filePath = path.join(TEMPLATES_DIR, type, `${templateName}.json`);
  if (!fs.existsSync(filePath)) {
    console.warn(`Template not found: ${filePath}, using default`);
    // 返回默认模板（硬编码）
    return getDefaultTemplate(type);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

// 默认模板（当用户未配置时使用）
function getDefaultTemplate(type: string) {
  if (type === 'series') {
    return [
      { type: 'seriesHero', content: { showName: true, showDescription: true, showFeatures: true } },
      { type: 'productTable', content: { folded: true, showSpecs: true } },
    ];
  }
  if (type === 'product') {
    return [
      { type: 'productHero', content: { showName: true, showDescription: true, showFeatures: true } },
      { type: 'productTable', content: { folded: true, showSpecs: true } },
    ];
  }
  return [];
}