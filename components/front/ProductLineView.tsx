'use client';

import ProductCard from './ProductCard';
import CategoryTree from './CategoryTree';

export default function ProductLineView({
  locale,
  productLine,
  categoryTree,
  products,
  urlPattern,
  currentSlug,
}: any) {
  const encodedName = encodeURIComponent(productLine.name);
  const basePath = 'products';

  // 构建 categories 和 seriesMap
  const categories = categoryTree.map((cat: any) => ({
    slug: cat.slug,
    name: cat.name,
  }));
  const seriesMap: Record<string, Array<{ slug: string; name: string }>> = {};
  for (const cat of categoryTree) {
    seriesMap[cat.slug] = (cat.children || []).map((child: any) => ({
      slug: child.slug,
      name: child.name,
    }));
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <CategoryTree
          productLineNameEncoded={encodedName}
          categories={categories}
          seriesMap={seriesMap}
          currentSlug={currentSlug}
          locale={locale}
          basePath={basePath}
        />
        <main className="flex-1">
          {products.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">暂无产品</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product: any) => (
                <ProductCard key={product.productId} product={product} locale={locale} urlPattern={urlPattern} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}