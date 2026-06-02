'use server';

import { createPage, updatePage, deletePage, getPageList } from './pageService';
import type { PageData, Visibility } from '@/types/page';

// 创建页面
export async function createPageAction(
  locale: string,
  data: {
    title: string;
    content: string;
    visible: Visibility;
    template: string;
    slug?: string;
    seo_keywords: string;
    seo_title: string;
    seo_description: string;
  }
) {
  try {
    const page = await createPage(locale, data);
    return { success: true, data: page };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 更新页面
export async function updatePageAction(
  locale: string,
  pageId: string,
  data: Partial<Omit<PageData, 'id' | 'createdAt' | 'preset' | 'type'>>
) {
  try {
    const page = await updatePage(locale, pageId, data);
    return { success: true, data: page };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 删除页面
export async function deletePageAction(locale: string, pageId: string) {
  try {
    await deletePage(locale, pageId);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 获取页面列表（用于服务端组件）
export async function getPageListAction(locale: string) {
  try {
    const pages = await getPageList(locale);
    return { success: true, data: pages };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}