import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

const SITE_ID = '000001';

// 定义页面类型到显示名称和父级分组映射
const typeConfig: Record<string, { groupLabel: string; groupKey: string; leaf?: boolean }> = {
  home: { groupLabel: '主页', groupKey: 'home' },
  productLine: { groupLabel: '产品线', groupKey: 'productLine' },
  productCollection: { groupLabel: '产品合集', groupKey: 'productCollection' },
  product: { groupLabel: '产品', groupKey: 'products' },
  page: { groupLabel: '页面', groupKey: 'pages' },
  blog: { groupLabel: '博客', groupKey: 'blog' },
  blogCategory: { groupLabel: '博客合集', groupKey: 'blogCategories' },
  blogPost: { groupLabel: '博客文章', groupKey: 'blogPosts' },
  docLibrary: { groupLabel: '文档库', groupKey: 'docLibraries' },
  doc: { groupLabel: '文档', groupKey: 'docs' },
  videoCategory: { groupLabel: '视频合集', groupKey: 'videoCategories' },
  video: { groupLabel: '视频', groupKey: 'videos' },
  inquiry: { groupLabel: '询盘', groupKey: 'inquiry' },
  policy: { groupLabel: '政策', groupKey: 'policy' },
};

// 定义分组顺序（可选，影响返回顺序）
const groupOrder = [
  'home',
  'productLine',
  'productCollection',
  'products',
  'pages',
  'blog',
  'blogCategories',
  'blogPosts',
  'docLibraries',
  'docs',
  'videoCategories',
  'videos',
  'inquiry',
  'policy',
];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';

  const db = getDb();
  const rows = db.prepare(`
    SELECT id, title, url, type
    FROM pages
    WHERE site_id = ? AND locale = ?
    ORDER BY type, title
  `).all(SITE_ID, locale) as Array<{
    id: string;
    title: string;
    url: string;
    type: string;
  }>;

  // 按分组整理
  const groups: Record<string, Array<{ id: string; label: string; url: string; type: string }>> = {};

  for (const row of rows) {
    const config = typeConfig[row.type];
    if (!config) continue; // 忽略未配置的类型
    const groupKey = config.groupKey;
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({
      id: row.id,
      label: row.title,
      url: row.url,
      type: row.type,
    });
  }

  // 构建树形结构
  const tree: any[] = [];
  for (const key of groupOrder) {
    // 查找该 key 对应的分组信息（从 typeConfig 中任意一个匹配 groupKey 的条目获取 label）
    let label = key;
    for (const [type, cfg] of Object.entries(typeConfig)) {
      if (cfg.groupKey === key) {
        label = cfg.groupLabel;
        break;
      }
    }
    const children = groups[key];
    if (children && children.length > 0) {
      tree.push({
        label,
        type: key,
        children: children.map(child => ({
          label: child.label,
          url: child.url,
          id: child.id,
          type: child.type,
        })),
      });
    }
  }

  // 处理特殊：主页、询盘可能已经包含在 groups 中，但它们是独立叶子节点，不需要 children
  // 如果希望主页和询盘作为独立叶子直接出现在根，可特殊处理，但通常作为分组更合理。
  // 这里为了简单，所有页面都分组显示。

  return NextResponse.json(tree);
}