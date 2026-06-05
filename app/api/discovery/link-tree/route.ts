import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

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

// 定义分组顺序
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

  // 从 Supabase 查询页面数据
  const { data: rows, error } = await supabase
    .from('pages')
    .select('id, title, url, type')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .order('type', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('GET /api/discovery/link-tree error:', error);
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }

  // 按分组整理
  const groups: Record<string, Array<{ id: string; label: string; url: string; type: string }>> = {};

  for (const row of rows || []) {
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
    let label = key;
    // 查找该 key 对应的分组信息（从 typeConfig 中任意一个匹配 groupKey 的条目获取 label）
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

  return NextResponse.json(tree);
}