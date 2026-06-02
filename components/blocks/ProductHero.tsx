export default async function ProductHero({ content, productData }: any) {
  return (
    <div className="mb-8">
      {content.showName && (
        <h1 className="text-3xl font-bold text-foreground mb-4">{productData.name}</h1>
      )}
      {content.showDescription && (
        <div className="prose max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-a:text-primary mb-6" dangerouslySetInnerHTML={{ __html: productData.description }} />
      )}
      {content.showFeatures && productData.features?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-2">产品特点</h2>
          <ul className="list-disc pl-5 text-muted-foreground">
            {productData.features.map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}