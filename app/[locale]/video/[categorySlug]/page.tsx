import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import WebBuilderClientWrapper from '@/components/webbuilder/WebBuilderClientWrapper';
import { getVideos } from '@/lib/videosys';
import fs from 'fs/promises';
import path from 'path';
import { withDynamicLocale } from '@/lib/withPageLocale';

const DEFAULT_TEMPLATE_ID = 'default_video_category_published';

async function VideoCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}) {
  const { locale, categorySlug } = await params;

  // 读取分类数据，建立 key → slug 映射
  const categoriesPath = path.join(process.cwd(), 'data', 'videosys', locale, 'categories.json');
  let categories: { key: string; name: string; slug: string; template?: string }[] = [];
  let currentCategory: any = null;
  let categoryKeyToSlug: Map<string, string> = new Map();

  try {
    const content = await fs.readFile(categoriesPath, 'utf-8');
    const data = JSON.parse(content);
    categories = Object.entries(data).map(([key, cat]: [string, any]) => ({
      key,
      name: cat.name,
      slug: cat.slug || key,
      template: cat.template,
    }));
    currentCategory = categories.find(c => c.slug === categorySlug);
    categoryKeyToSlug = new Map(categories.map(c => [c.key, c.slug]));
  } catch {
    // 文件不存在
  }

  if (!currentCategory) notFound();

  // 获取该分类下的视频（通过 category_key）
  const videos = await getVideos(locale, currentCategory.key);

  // 为每个视频附加其对应的分类 slug
  const videosWithSlug = videos.map(v => ({
    ...v,
    categorySlug: categoryKeyToSlug.get(v.category_key) || currentCategory.slug,
  }));

  // 确定模板 ID
  let templateId = currentCategory.template || DEFAULT_TEMPLATE_ID;
  let template = await getTemplateById(templateId);
  if (!template && templateId !== DEFAULT_TEMPLATE_ID) {
    template = await getTemplateById(DEFAULT_TEMPLATE_ID);
  }
  if (!template) {
    return <div className="p-8 text-center">视频模板不存在，请联系管理员</div>;
  }

  // 准备运行时数据
  const runtime = {
    entityType: 'video',
    categories: categories.map(c => ({ slug: c.slug, name: c.name })),
    videos: videosWithSlug,
    currentCategorySlug: categorySlug,
    locale,
  };

  const finalData = injectRuntimeDataSafe(template.data, runtime);
  return <WebBuilderClientWrapper data={finalData} />;
}

export default withDynamicLocale(VideoCategoryPage);