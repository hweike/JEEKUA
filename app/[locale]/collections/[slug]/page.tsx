// app/[locale]/collections/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { getTemplateById } from '@/lib/webbuilder/template-manager';
import { injectRuntimeDataSafe } from '@/lib/webbuilder/runtime-injector';
import { TemplateRenderer } from '@/components/webbuilder/TemplateRenderer';
import { fetchCollectionRuntime } from '@/lib/webbuilder/collection-helpers';
import ProductCard from '@/components/front/ProductCard';

export default async function CollectionsPage({ params }: { params: { locale: string; slug: string } }) {
  const { locale, slug } = await params;
  const runtimeData = await fetchCollectionRuntime(locale, slug);
  
  if (!runtimeData) notFound();

  const templateId = runtimeData.collection.templateId || 'default_product_category_published';
  const template = await getTemplateById(templateId);
  
  // 如果模板不存在，降级显示产品列表
  if (!template) {
    console.error(`Template not found: ${templateId}`);
    const { collection, products, urlPattern } = runtimeData;
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-4">{collection.name}</h1>
        {collection.description && <p className="text-gray-600 mb-6">{collection.description}</p>}
        {products.length === 0 ? (
          <div className="text-center py-12 text-gray-500">暂无产品</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const finalData = injectRuntimeDataSafe(template.data, runtimeData);
  
  return <TemplateRenderer data={finalData} />;
}

// 原来显示固定显示分类页
// import { notFound } from 'next/navigation';
// import { getCategoryBySlug } from '@/lib/products/categories';
// import { getProductUrlPattern } from '@/lib/products/productSettings';
// import CollectionProducts from '@/components/front/CollectionProducts';

// export default async function CollectionsPage({ params }: { params: { locale: string; slug: string } }) {
//   const { locale, slug } = await params;
//   const category = await getCategoryBySlug(locale, slug);
//   if (!category) notFound();

//   const urlPattern = await getProductUrlPattern(locale);

//   return (
//     <CollectionProducts
//       locale={locale}
//       categoryId={category.id}
//       categoryName={category.name}
//       categoryDescription={category.description || ''}
//       urlPattern={urlPattern}
//     />
//   );
// }