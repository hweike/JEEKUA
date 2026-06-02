import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { fetchProductLineRuntime } from '@/lib/webbuilder/product-line-helpers';

interface Props {
  params: Promise<{ locale: string; productlineSlug: string; categorySlug: string }>;
}

export default async function CategoryPage({ params }: Props) {
  let { locale, productlineSlug, categorySlug } = await params;
  productlineSlug = decodeURIComponent(productlineSlug);
  categorySlug = decodeURIComponent(categorySlug);

  // 获取运行时数据，传入 categorySlug 以筛选分类
  const runtimeData = await fetchProductLineRuntime(locale, productlineSlug, { categorySlug });
  if (!runtimeData) notFound();

  const templateId = runtimeData.productLine.templateId || 'default_product_line_published';
  const template = await getTemplateById(templateId);
  if (!template) {
    return <div className="p-8 text-center">模板不存在</div>;
  }

  const finalData = injectRuntimeDataSafe(template.data, runtimeData);

  return <TemplateRenderer data={finalData} />;
}