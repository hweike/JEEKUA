import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { fetchProductLineRuntime } from '@/lib/webbuilder/product-line-helpers';
import { supabase } from '@/lib/supabase/client';
import { extractAllTextIds } from '@/lib/webbuilder/text-utils';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001'; // 与原代码 siteId = '100001' 保持一致

interface Props {
  params: Promise<{ locale: string; productlineSlug: string }>;
}

export default async function ProductLinePage({ params }: Props) {
  const { locale, productlineSlug } = await params;
  const decodedName = decodeURIComponent(productlineSlug);
  const runtimeData = await fetchProductLineRuntime(locale, decodedName);
  if (!runtimeData) notFound();

  const templateId = runtimeData.productLine.templateId || 'default_product_line_published';
  const template = await getTemplateById(templateId);
  if (!template) {
    return <div className="p-8 text-center">模板不存在</div>;
  }

  // 提取模板中的所有 textId，并从 Supabase 查询当前语言的文本
  const textIds = extractAllTextIds(template.data);
  let texts: Record<string, string> = {};
  if (textIds.length > 0) {
    const { data, error } = await supabase
      .from('component_texts')
      .select('text_id, text')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('template_id', template.id)
      .eq('locale', locale)
      .in('text_id', textIds);
    if (!error && data) {
      texts = data.reduce((acc, row) => ({ ...acc, [row.text_id]: row.text }), {});
    } else {
      console.error('Failed to fetch component texts:', error);
    }
  }

  // 合并 texts 到 runtimeData 中（原有的 productLine, categoryTree, products 等保持不变）
  const finalRuntime = { ...runtimeData, texts, locale };
  const finalData = injectRuntimeDataSafe(template.data, finalRuntime);

  return <TemplateRenderer data={finalData} />;
}