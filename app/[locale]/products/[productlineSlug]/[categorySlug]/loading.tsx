// app/[locale]/products/[productlineSlug]/[categorySlug]/loading.tsx
export default function CategoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-1/3 mb-6" />
        <div className="flex gap-4 mb-8">
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-lg h-64" />
          ))}
        </div>
        <div className="flex justify-center mt-8 gap-2">
          <div className="h-8 bg-gray-200 rounded w-16" />
          <div className="h-8 bg-gray-200 rounded w-16" />
          <div className="h-8 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}