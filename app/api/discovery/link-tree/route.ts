// app/api/discovery/link-tree/route.ts
import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db/admin';
import { readFullData } from '@/lib/products/utils/helpers';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';
const PAGE_SIZE = 50;

// 🔥 内存缓存
const treeCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 1000;

function getCacheKey(locale: string): string {
  return `link-tree_${locale}`;
}

function getCache(locale: string): any | undefined {
  const key = getCacheKey(locale);
  const cached = treeCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return undefined;
}

function setCache(locale: string, data: any): void {
  const key = getCacheKey(locale);
  treeCache.set(key, { data, timestamp: Date.now() });
}

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
    let count = 0;
    try {
      const countRows = await sql<{ count: string }[]>`
        SELECT COUNT(*)::text AS count FROM public.pages
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
          AND type = 'product'
          AND id NOT LIKE '%/%'
      `;
      count = parseInt(countRows[0]?.count || '0', 10);
    } catch (countError: any) {
      console.error('Count products error:', countError);
      return NextResponse.json({ error: 'Failed to count products' }, { status: 500 });
    }

    const offset = (page - 1) * PAGE_SIZE;
    let items: any[];
    try {
      items = await sql<any[]>`
        SELECT id, title, url, type FROM public.pages
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
          AND type = 'product'
          AND id NOT LIKE '%/%'
        ORDER BY title ASC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `;
    } catch (error: any) {
      console.error('Fetch products error:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    const hasMore = (page * PAGE_SIZE) < count;
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

  // 检查缓存
  const cachedTree = getCache(locale);
  if (cachedTree) {
    return NextResponse.json(
      { tree: cachedTree },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      }
    );
  }

  // 并行读取
  const [
    productDataResult,
    rowsLocalResult,
    rowsGlobalDocLibraryResult,
    rowsGlobalDocResult,
  ] = await Promise.allSettled([
    readFullData(locale).catch(() => ({ productLines: [], categories: [] })),
    sql<any[]>`
      SELECT id, title, url, type FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = ${locale}
      ORDER BY type ASC, title ASC
    `,
    sql<any[]>`
      SELECT id, title, url, type FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = 'global'
        AND type = 'docLibrary'
      ORDER BY title ASC
    `,
    sql<any[]>`
      SELECT id, title, url, type FROM public.pages
      WHERE site_id = ${SITE_ID}
        AND locale = 'global'
        AND type = 'doc'
      ORDER BY title ASC
    `,
  ]);

  const productData = productDataResult.status === 'fulfilled'
    ? productDataResult.value
    : { productLines: [], categories: [] };

  const rowsLocal = rowsLocalResult.status === 'fulfilled'
    ? rowsLocalResult.value
    : [];

  const rowsGlobalDocLibrary = rowsGlobalDocLibraryResult.status === 'fulfilled'
    ? rowsGlobalDocLibraryResult.value
    : [];

  const rowsGlobalDoc = rowsGlobalDocResult.status === 'fulfilled'
    ? rowsGlobalDocResult.value
    : [];

  if (rowsLocalResult.status === 'rejected') {
    return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 500 });
  }

  // 构建产品线映射
  const productLineMap = new Map<string, { id: string; name: string; slug: string }>();
  for (const line of productData.productLines || []) {
    productLineMap.set(line.id, {
      id: line.id,
      name: line.name,
      slug: line.slug,
    });
  }

  const categoryToProductLine = new Map<string, string>();
  for (const cat of productData.categories || []) {
    if (cat.id && cat.productLineId) {
      categoryToProductLine.set(cat.id, cat.productLineId);
    }
  }

  const groups: Record<string, Array<{ id: string; label: string; url: string; type: string }>> = {};

  for (const row of rowsLocal || []) {
    const config = typeConfig[row.type];
    if (!config) continue;
    const groupKey = config.groupKey;
    if (groupKey === 'product') continue;

    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push({
      id: row.id,
      label: row.title,
      url: row.url,
      type: row.type,
    });
  }

  // 合并 global 文档库
  if (rowsGlobalDocLibrary && rowsGlobalDocLibrary.length > 0) {
    if (!groups['docLibrary']) groups['docLibrary'] = [];
    for (const row of rowsGlobalDocLibrary) {
      const exists = groups['docLibrary'].some(item => item.id === row.id);
      if (!exists) {
        groups['docLibrary'].push({
          id: row.id,
          label: row.title,
          url: row.url,
          type: row.type,
        });
      }
    }
  }

  // 合并 global 文档
  if (rowsGlobalDoc && rowsGlobalDoc.length > 0) {
    if (!groups['doc']) groups['doc'] = [];
    for (const row of rowsGlobalDoc) {
      const exists = groups['doc'].some(item => item.id === row.id);
      if (!exists) {
        groups['doc'].push({
          id: row.id,
          label: row.title,
          url: row.url,
          type: row.type,
        });
      }
    }
  }

  // 补查 productCollection
  if (!groups['productCollection'] || groups['productCollection'].length === 0) {
    try {
      const patchData = await sql<any[]>`
        SELECT id, title, url, type FROM public.pages
        WHERE site_id = ${SITE_ID}
          AND locale = ${locale}
          AND type = 'productCollection'
        ORDER BY title ASC
      `;
      if (patchData.length > 0) {
        groups['productCollection'] = patchData.map(row => ({
          id: row.id,
          label: row.title,
          url: row.url,
          type: row.type,
        }));
      }
    } catch {}
  }

  // 构建树
  const tree: any[] = [];

  for (const key of groupOrder) {
    if (key === 'product') {
      let label = '产品';
      for (const [type, cfg] of Object.entries(typeConfig)) {
        if (cfg.groupKey === key) {
          label = cfg.groupLabel;
          break;
        }
      }
      tree.push({ label, type: key, children: [] });
      continue;
    }

    if (key === 'productCollection') {
      const collections = groups['productCollection'] || [];
      if (collections.length === 0) continue;

      const parentCategories = new Map<string, any>();
      const childMap = new Map<string, any[]>();

      for (const cat of collections) {
        const rawId = cat.id.replace('productCollection:', '');
        const parts = rawId.split('/');

        if (parts.length === 1) {
          const categoryId = parts[0];
          const productLineId = categoryToProductLine.get(categoryId);
          parentCategories.set(cat.id, {
            label: cat.label,
            url: cat.url,
            id: cat.id,
            type: cat.type,
            categoryId,
            productLineId: productLineId || null,
            children: [],
          });
        } else if (parts.length === 2) {
          const parentCategoryId = parts[0];
          const parentPageId = `productCollection:${parentCategoryId}`;
          if (!childMap.has(parentPageId)) childMap.set(parentPageId, []);
          childMap.get(parentPageId)!.push({
            label: cat.label,
            url: cat.url,
            id: cat.id,
            type: cat.type,
          });
        }
      }

      parentCategories.forEach((parent, pageId) => {
        parent.children = childMap.get(pageId) || [];
      });

      const collectionTree: any[] = [];
      const sortedParents = Array.from(parentCategories.values()).sort((a, b) => {
        const lineA = a.productLineId || '';
        const lineB = b.productLineId || '';
        if (lineA !== lineB) return lineA.localeCompare(lineB);
        return 0;
      });

      for (const parentCat of sortedParents) {
        const productLineId = parentCat.productLineId;
        const lineInfo = productLineId ? productLineMap.get(productLineId) : null;
        const lineName = lineInfo?.name || '未分类';

        const children = (parentCat.children || []).map((child: any) => ({
          label: child.label,
          url: child.url,
          id: child.id,
          type: child.type,
        }));

        collectionTree.push({
          label: `${lineName}-${parentCat.label}`,
          lineName,
          categoryName: parentCat.label,
          url: parentCat.url,
          id: parentCat.id,
          type: parentCat.type,
          children,
        });
      }

      if (collectionTree.length > 0) {
        let label = '产品分类';
        for (const [type, cfg] of Object.entries(typeConfig)) {
          if (cfg.groupKey === key) {
            label = cfg.groupLabel;
            break;
          }
        }
        tree.push({ label, type: key, children: collectionTree });
      }
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

  setCache(locale, tree);

  return NextResponse.json(
    { tree },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}