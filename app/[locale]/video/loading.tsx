// app/[locale]/video/loading.tsx
export default function VideoLoading() {
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
        {/* 右侧视频列表骨架 */}
        <main className="flex-1">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-lg aspect-video" />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}