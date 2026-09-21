// app/[locale]/video/[categorySlug]/[videoSlug]/loading.tsx
export default function VideoDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <div className="h-10 bg-gray-200 rounded w-3/4 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="aspect-video w-full bg-gray-200 rounded-lg mb-8" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/4" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>
        <aside className="w-full lg:w-80">
          <div className="h-48 bg-gray-200 rounded-lg" />
        </aside>
      </div>
    </div>
  );
}