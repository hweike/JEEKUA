import { notFound } from 'next/navigation'
import { getAllVideos } from '@/lib/videosys/videos'
import { getCategories, getCategory } from '@/lib/videosys/categories'
import VideoCard from '@/components/videosys-front/VideoCard'
import { Metadata } from 'next'

interface PageProps {
  params: {
    locale: string
    categoryKey: string
  }
}

// 生成分类页的 SEO 元数据
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, categoryKey } = params
  const category = await getCategory(categoryKey, locale)
  if (!category) return {}

  const metaTitle = category.seo?.metaTitle || `${category.name} - 视频分类`
  const metaDescription = category.seo?.metaDescription || `浏览分类“${category.name}”下的所有视频`

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: category.seo?.keywords,
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { locale, categoryKey } = params
  const category = await getCategory(categoryKey, locale)
  if (!category) notFound()

  const allVideos = await getAllVideos(locale)
  const categoryVideos = allVideos.filter(v => v.category === categoryKey)

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">{category.name}</h1>
      {category.seo?.metaDescription && (
        <p className="text-gray-600 mb-6">{category.seo.metaDescription}</p>
      )}
      {categoryVideos.length === 0 ? (
        <p className="text-gray-500">该分类下暂无视频</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryVideos.map((video) => (
            <VideoCard key={video.id} video={video} locale={locale} />
          ))}
        </div>
      )}
    </div>
  )
}

// 静态生成所有分类页面（可选，提升性能）
export async function generateStaticParams({ params: { locale } }: { params: { locale: string } }) {
  const categories = await getCategories(locale)
  return Object.keys(categories).map((categoryKey) => ({
    categoryKey,
  }))
}