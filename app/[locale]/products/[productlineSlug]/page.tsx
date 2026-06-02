// app/[locale]/products/[productlineSlug]/page.tsx
import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { fetchProductLineRuntime } from '@/lib/webbuilder/product-line-helpers';
import { getDb } from '@/lib/db';
import { extractAllTextIds } from '@/lib/webbuilder/text-utils';

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

  // 提取模板中的所有 textId，并从数据库查询当前语言的文本
  const textIds = extractAllTextIds(template.data);
  let texts: Record<string, string> = {};
  if (textIds.length > 0) {
    const db = getDb();
    const siteId = '100001';
    const placeholders = textIds.map(() => '?').join(',');
    const rows = db.prepare(`
      SELECT text_id, text FROM component_texts
      WHERE site_id = ? AND template_id = ? AND locale = ? AND text_id IN (${placeholders})
    `).all(siteId, template.id, locale, ...textIds) as { text_id: string; text: string }[];
    texts = rows.reduce((acc, row) => ({ ...acc, [row.text_id]: row.text }), {});
  }

  // 合并 texts 到 runtimeData 中（原有的 productLine, categoryTree, products 等保持不变）
  const finalRuntime = { ...runtimeData, texts, locale };
  const finalData = injectRuntimeDataSafe(template.data, finalRuntime);

  return <TemplateRenderer data={finalData} />;
}