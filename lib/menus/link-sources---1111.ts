// lib/menus/link-sources.ts
import { supabase } from '@/lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export interface LinkTreeNode {
  id: string;
  label: string;
  type: string;
  selectable: boolean;
  url?: string;
  children?: LinkTreeNode[];
}

/**
 * 获取分组名称（固定中文，与 pages.type 一一对应）
 */
function getGroupLabel(type: string): string {
  const mapping: Record<string, string> = {
    product: '产品',
    productLine: '产品线',
    productCollection: '产品分类',
    blogPost: '博客文章',
    blogCategory: '博客分类',
    doc: '文档',
    docLibrary: '文档库',
    video: '视频',
    videoCategory: '视频分类',
    page: '页面',
    policy: '政策',
    home: '首页',
    inquiry: '询盘',
    blog: '博客',
  };
  return mapping[type] || type; // 未知类型回退到类型本身
}

/**
 * 构建产品分类树（利用 id 中的 '/' 区分父子）
 */
function buildCategoryTree(pages: any[]): LinkTreeNode[] {
  const parents: any[] = [];
  const childrenMap: Record<string, any[]> = {};

  for (const page of pages) {
    const parts = page.id.split('/');
    if (parts.length === 1) {
      parents.push(page);
    } else if (parts.length === 2) {
      const parentId = parts[0];
      if (!childrenMap[parentId]) childrenMap[parentId] = [];
      childrenMap[parentId].push(page);
    }
  }

  return parents.map((parent) => {
    const children = childrenMap[parent.id] || [];
    return {
      id: parent.id,
      label: parent.title,
      type: parent.type,
      selectable: true,
      url: parent.url,
      children: children.map((child) => ({
        id: child.id,
        label: child.title,
        type: child.type,
        selectable: true,
        url: child.url,
      })),
    };
  });
}

/**
 * 获取链接树（用于后台选择链接）
 */
export async function getLinkTree(locale: string = 'zh'): Promise<LinkTreeNode[]> {
  const { data: pages, error } = await supabase
    .from('pages')
    .select('id, title, url, type')
    .eq('site_id', SITE_ID)
    .eq('locale', locale)
    .order('type', { ascending: true })
    .order('title', { ascending: true });

  if (error) {
    console.error('获取 pages 数据失败:', error);
    return [];
  }

  if (!pages || pages.length === 0) return [];

  // 按类型分组
  const grouped: Record<string, any[]> = {};
  for (const page of pages) {
    if (!grouped[page.type]) grouped[page.type] = [];
    grouped[page.type].push(page);
  }

  const tree: LinkTreeNode[] = [];

  // 类型配置
  const typeConfig: Record<string, { group?: boolean; selectable?: boolean; handler?: (items: any[]) => LinkTreeNode[] }> = {
    // 可直接选择的类型（叶子节点）
    home: { selectable: true },
    inquiry: { selectable: true },
    policy: { selectable: true },
    // 需要分组的类型
    productCollection: {
      group: true,
      handler: (items) => {
        const categoryTree = buildCategoryTree(items);
        return [
          {
            id: 'group-productCollection',
            label: getGroupLabel('productCollection'),
            type: 'productCollection',
            selectable: false,
            children: categoryTree,
          },
        ];
      },
    },
    product: {
      group: true,
      handler: (items) => [
        {
          id: 'group-product',
          label: getGroupLabel('product'),
          type: 'product',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    page: {
      group: true,
      handler: (items) => [
        {
          id: 'group-page',
          label: getGroupLabel('page'),
          type: 'page',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    blogCategory: {
      group: true,
      handler: (items) => [
        {
          id: 'group-blogCategory',
          label: getGroupLabel('blogCategory'),
          type: 'blogCategory',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    blogPost: {
      group: true,
      handler: (items) => [
        {
          id: 'group-blogPost',
          label: getGroupLabel('blogPost'),
          type: 'blogPost',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    docLibrary: {
      group: true,
      handler: (items) => [
        {
          id: 'group-docLibrary',
          label: getGroupLabel('docLibrary'),
          type: 'docLibrary',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    doc: {
      group: true,
      handler: (items) => [
        {
          id: 'group-doc',
          label: getGroupLabel('doc'),
          type: 'doc',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    videoCategory: {
      group: true,
      handler: (items) => [
        {
          id: 'group-videoCategory',
          label: getGroupLabel('videoCategory'),
          type: 'videoCategory',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
    video: {
      group: true,
      handler: (items) => [
        {
          id: 'group-video',
          label: getGroupLabel('video'),
          type: 'video',
          selectable: false,
          children: items.map((p) => ({
            id: p.id,
            label: p.title,
            type: p.type,
            selectable: true,
            url: p.url,
          })),
        },
      ],
    },
  };

  // 处理每个类型
  for (const [type, items] of Object.entries(grouped)) {
    const config = typeConfig[type];
    if (!config) {
      // 未知类型，直接作为叶子节点（可选）
      for (const item of items) {
        tree.push({
          id: item.id,
          label: item.title,
          type: item.type,
          selectable: true,
          url: item.url,
        });
      }
      continue;
    }

    if (config.selectable) {
      // 直接作为可选节点（如 home, inquiry, policy）
      for (const item of items) {
        tree.push({
          id: item.id,
          label: item.title,
          type: item.type,
          selectable: true,
          url: item.url,
        });
      }
    } else if (config.handler) {
      const nodes = config.handler(items);
      tree.push(...nodes);
    }
  }

  // 按 label 排序
  tree.sort((a, b) => a.label.localeCompare(b.label));

  return tree;
}

/**
 * 保留旧函数以兼容
 */
export async function getLinkSources(locale: string = 'zh'): Promise<LinkTreeNode[]> {
  return getLinkTree(locale);
}