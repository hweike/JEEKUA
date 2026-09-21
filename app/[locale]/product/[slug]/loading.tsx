// app/[locale]/product/[slug]/loading.tsx
export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
        {/* 图片骨架 */}
        <div className="bg-gray-200 rounded-lg aspect-square" />
        {/* 内容骨架 */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-24 bg-gray-200 rounded" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        </div>
      </div>
    </div>
  );
}