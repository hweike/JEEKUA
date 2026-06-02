import Link from 'next/link';

export default function RelatedProducts({ content, productData }: any) {
  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold text-foreground mb-4">{content.title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-border p-4 rounded-lg bg-background">
          <Link href="/products/related-1" className="text-primary hover:underline">
            相关产品 1
          </Link>
        </div>
        {/* 其他相关产品项同样使用上述类 */}
      </div>
    </div>
  );
}