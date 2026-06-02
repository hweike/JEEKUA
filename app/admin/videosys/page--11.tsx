import { Suspense } from 'react'
import CategoryTree from '@/components/videosys-admin/CategoryTree'
import VideoList from '@/components/videosys-admin/VideoList'
import LanguageSwitcher from '@/components/videosys-admin/LanguageSwitcher'

export default async function AdminVideosPage({
  searchParams,
}: {
  searchParams: { locale?: string; category?: string }
}) {
  const locale = searchParams.locale || 'zh'
  const selectedCategory = searchParams.category || ''

  return (
    <div className="flex h-screen">
      <aside className="w-80 border-r bg-gray-50 p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">视频分类</h2>
          <LanguageSwitcher currentLocale={locale} basePath="/admin/videosys" />
        </div>
        <Suspense fallback={<div>加载分类中...</div>}>
          <CategoryTree locale={locale} selectedKey={selectedCategory} />
        </Suspense>
      </aside>
      <main className="flex-1 p-6 overflow-y-auto">
        <Suspense fallback={<div>加载视频中...</div>}>
          <VideoList locale={locale} categoryKey={selectedCategory} />
        </Suspense>
      </main>
    </div>
  )
}