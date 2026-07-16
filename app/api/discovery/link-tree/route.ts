import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const PAGE_SIZE = 50;

const typeConfig: Record<string, { groupLabel: string; groupKey: string }> = {
  home: { groupLabel: '主页', groupKey: 'home' },
  productLine: { groupLabel: '产品线', groupKey: 'productLine' },
  productCollection: { groupLabel: '产品分类', groupKey: 'productCollection' },
  product: { groupLabel: '产品', groupKey: 'product' },
  page: { groupLabel: '页面', groupKey: 'page' },
  blog: { groupLabel: '博客', groupKey: 'blog' },
  blogCategory: { groupLabel: '博客分类', groupKey: 'blogCategory' },
  blogPost: { groupLabel: '博客文章', groupKey: 'blogPost' },
  docLibrary: { groupLabel: '文档库', groupKey: 'docLibrary' },
  doc: { groupLabel: '文档', groupKey: 'doc' },
  videoCategory: { groupLabel: '视频分类', groupKey: 'videoCategory' },
  video: { groupLabel: '视频', groupKey: 'video' },
  inquiry: { groupLabel: '询盘', groupKey: 'inquiry' },
  policy: { groupLabel: '政策', groupKey: 'policy' },
};

const groupOrder = [
  'home',
  'productLine',
  'productCollection',
  'product',
  'page',
  'blog',
  'blogCategory',
  'blogPost',
  'docLibrary',
  'doc',
  'videoCategory',
  'video',
  'inquiry',
  'policy',
];

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const locale = searchParams.get('locale') || 'zh';
  const type = searchParams.get('type');
  const page = parseInt(searchParams.get('page') || '1', 10);

  // 分页加载产品
  if (type === 'product') {
    const countQuery = supabase
      .from('pages')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .eq('type', 'product')
      .not('id', 'like', '%/%');

    const { count, error: countError } = await countQuery;
    if (countError) {
      return NextResponse.json({ error: 'Failed to count products' }, { status: 500 });
    }

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: items, error } = await supabase
      .from('pages')
      .select('id, title, url, type')
      .eq('site_id', SITE_ID)
      .eq('locale', locale)
      .eq('type', 'product')
      .not('id', 'like', '%/%')
      .order('title', { ascending: true })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    const hasMore = (page * PAGE_SIZE) < (count || 0);
    return NextResponse.json({
      items: items.map(item => ({
        id: item.id,
        label: item.title,
        url: item.url,
        type: item.type,
      })),
      total: count,
      page,
      hasMore,
      pageSize: PAGE_SIZE,
    });
  }

  // 常规分组数据（不含产品具体数据）
  const { data: rowsLocal, error: errorLocal } = await supabase
    .from('pages')
    .select('id, title, url, type')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .order('type', { ascending: true })
    .order('title', { ascending: true });

  if (errorLocal) {
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }

  const { data: rowsGlobalDoc, error: errorGlobal } = await supabase
    .from('pages')
    .select('id, title, url, type')
    .eq('site_id', SITE_ID)
    .eq('locale', 'global')
    .eq('type', 'doc')
    .order('title', { ascending: true });

  const groups: Record<string, Array<{ id: string; label: string; url: string; type: string }>> = {};

  for (const row of rowsLocal || []) {
    const config = typeConfig[row.type];
    if (!config) continue;
    const groupKey = config.groupKey;
    // 产品分组不填充具体数据，留待分页加载
    if (groupKey === 'product') continue;

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({
      id: row.id,
      label: row.title,
      url: row.url,
      type: row.type,
    });
  }

  // 补丁：中文站强制补查 productCollection（若缺失）
  if (locale === 'zh' && !groups['productCollection']) {
    const { data: patchData, error: patchError } = await supabase
      .from('pages')
      .select('id, title, url, type')
      .eq('site_id', SITE_ID)
      .eq('locale', 'zh')
      .eq('type', 'productCollection')
      .order('title', { ascending: true });

    if (!patchError && patchData && patchData.length > 0) {
      groups['productCollection'] = patchData.map(row => ({
        id: row.id,
        label: row.title,
        url: row.url,
        type: row.type,
      }));
    }
  }

  if (rowsGlobalDoc && rowsGlobalDoc.length > 0) {
    const libraryKey = 'docLibrary';
    if (!groups[libraryKey]) groups[libraryKey] = [];
    for (const row of rowsGlobalDoc) {
      const exists = groups[libraryKey].some(item => item.id === row.id);
      if (!exists) {
        groups[libraryKey].push({
          id: row.id,
          label: row.title,
          url: row.url,
          type: row.type,
        });
      }
    }
  }

  // 构建树
  const tree: any[] = [];

  for (const key of groupOrder) {
    // 对 product 特殊处理：即使无数据也添加分组
    if (key === 'product') {
      let label = '产品';
      for (const [type, cfg] of Object.entries(typeConfig)) {
        if (cfg.groupKey === key) {
          label = cfg.groupLabel;
          break;
        }
      }
      tree.push({
        label,
        type: key,
        children: [], // 空数组，由前端加载
      });
      continue;
    }

    const children = groups[key] || [];

    if (key === 'home') {
      const hasHome = children.some(c => c.id === 'page:10000001');
      if (!hasHome) {
        children.unshift({
          id: 'page:10000001',
          label: '首页',
          url: '/home',
          type: 'page',
        });
      }
    }

    if (children.length === 0) continue;

    let label = key;
    for (const [type, cfg] of Object.entries(typeConfig)) {
      if (cfg.groupKey === key) {
        label = cfg.groupLabel;
        break;
      }
    }

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

  // 询盘插入到 video 之后
  const videoIndex = tree.findIndex(g => g.type === 'video');
  const inquiryChildren = (groups['inquiry'] || []).map(child => ({
    label: child.label,
    url: child.url,
    id: child.id,
    type: child.type,
  }));
  const inquiryNode = {
    label: '询盘',
    type: 'inquiry',
    children: inquiryChildren,
  };
  if (inquiryChildren.length > 0) {
    if (videoIndex !== -1) {
      tree.splice(videoIndex + 1, 0, inquiryNode);
    } else {
      tree.push(inquiryNode);
    }
  }

  return NextResponse.json({ tree });
}