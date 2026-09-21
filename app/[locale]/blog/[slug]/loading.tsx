// app/[locale]/blog/[slug]/loading.tsx
export default function BlogPostLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 animate-pulse">
      <div className="h-10 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-8" />
      <div className="space-y-4">
        <div className="h-6 bg-gray-200 rounded w-full" />
        <div className="h-6 bg-gray-200 rounded w-5/6" />
        <div className="h-6 bg-gray-200 rounded w-4/6" />
        <div className="h-6 bg-gray-200 rounded w-full" />
        <div className="h-6 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  );
}