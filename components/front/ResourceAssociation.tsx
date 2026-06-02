'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface RelatedResourcesProps {
  productId: string;
  locale: string;
}

interface ResourceItem {
  id: string;
  title?: string;
  slug?: string;
  url?: string;
  thumbnail?: string;
  sortOrder: number;
}

export default function RelatedResources({ productId, locale }: RelatedResourcesProps) {
  const [resources, setResources] = useState<{
    blogs: ResourceItem[];
    documents: ResourceItem[];
    videos: ResourceItem[];
  }>({ blogs: [], documents: [], videos: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/front/products/${productId}/related-resources?locale=${locale}`)
      .then(res => res.json())
      .then(data => {
        setResources(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [productId, locale]);

  if (loading) return <div className="animate-pulse h-20 bg-gray-100 rounded"></div>;

  const hasAny = resources.blogs.length > 0 || resources.documents.length > 0 || resources.videos.length > 0;
  if (!hasAny) return null;

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="text-xl font-semibold mb-4">相关资源</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 博客 */}
        {resources.blogs.map(blog => (
          <Link key={blog.id} href={`/${locale}/blog/${blog.slug}`} className="block p-3 border rounded hover:shadow transition">
            <h3 className="font-medium">{blog.title}</h3>
            <span className="text-xs text-gray-500">博客文章</span>
          </Link>
        ))}
        {/* 文档 */}
        {resources.documents.map(doc => (
          <a key={doc.id} href={doc.url} target="_blank" rel="noopener noreferrer" className="block p-3 border rounded hover:shadow transition">
            <h3 className="font-medium">{doc.title}</h3>
            <span className="text-xs text-gray-500">文档下载</span>
          </a>
        ))}
        {/* 视频 */}
        {resources.videos.map(video => (
          <Link key={video.id} href={`/${locale}/videos/${video.slug}`} className="block p-3 border rounded hover:shadow transition">
            {video.thumbnail && <img src={video.thumbnail} alt="" className="w-full h-24 object-cover rounded mb-2" />}
            <h3 className="font-medium">{video.title}</h3>
            <span className="text-xs text-gray-500">视频</span>
          </Link>
        ))}
      </div>
    </div>
  );
}