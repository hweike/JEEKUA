import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import WebBuilderClientWrapper from '@/components/webbuilder/WebBuilderClientWrapper';
import { getVideoCategories, getVideos } from '@/lib/videosys';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_TEMPLATE_ID = 'default_video_category_published';

export default async function AllVideosPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // 获取所有分类（用于顶部导航）
  const categories = await getVideoCategories(locale);

  // 获取所有视频（visible = 1，无分类过滤）
  const videos = await getVideos(locale);

  // 为每个视频补充其分类 slug（用于详情链接）
  const categoriesPath = path.join(process.cwd(), 'data', 'videosys', locale, 'categories.json');
  let categoryKeyToSlug: Map<string, string> = new Map();
  try {
    const content = await fs.readFile(categoriesPath, 'utf-8');
    const data = JSON.parse(content);
    categoryKeyToSlug = new Map(
      Object.entries(data).map(([key, cat]: [string, any]) => [key, cat.slug || key])
    );
  } catch {}
  const videosWithSlug = videos.map(v => ({
    ...v,
    categorySlug: categoryKeyToSlug.get(v.category_key) || '',
  }));

  // 获取模板（使用默认模板或从第一个分类获取？简单使用默认）
  const template = await getTemplateById(DEFAULT_TEMPLATE_ID);
  if (!template) {
    return <div className="p-8 text-center">视频模板不存在，请联系管理员</div>;
  }

  const runtime = {
    entityType: 'video',
    categories: categories.map(c => ({ slug: c.slug, name: c.name })),
    videos: videosWithSlug,
    currentCategorySlug: null, // 表示全部
    locale,
  };

  const finalData = injectRuntimeDataSafe(template.data, runtime);
  return <WebBuilderClientWrapper data={finalData} />;
}