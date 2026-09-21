// app/[locale]/blog/loading.tsx
export default function BlogLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8 animate-pulse">
        {/* 左侧分类树骨架 */}
        <aside className="lg:w-1/4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-6 bg-gray-200 rounded w-3/4" />
            ))}
          </div>
        </aside>
        {/* 右侧文章列表骨架 */}
        <main className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="border-b border-gray-200 pb-4">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}