export default function SeriesHero({ content, seriesData }: any) {
  return (
    <div className="mb-8">
      {content.showName !== false && (
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{seriesData.name}</h1>
      )}
      {content.showDescription !== false && (
        <div className="prose max-w-none mb-6">
          <p className="text-gray-600 leading-relaxed">{seriesData.description}</p>
        </div>
      )}
      {content.showFeatures !== false && seriesData.features?.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">产品特点</h2>
          <ul className="list-disc pl-5">
            {seriesData.features.map((f: string, i: number) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}