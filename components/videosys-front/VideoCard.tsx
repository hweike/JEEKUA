'use client';

import Link from 'next/link';
import { VideoMetadata } from '@/lib/videosys/types';
import { VideoIcon } from 'lucide-react';
import { formatLocalizedDate } from '@/lib/date-utils';

export default function VideoCard({ video, locale }: { video: VideoMetadata; locale: string }) {
  const hasThumbnail = video.thumbnail && video.thumbnail.trim() !== '';

  return (
    <Link href={`/${locale}/video/${video.id}/${video.slug}`} className="block group">
      <div className="border rounded-lg overflow-hidden shadow hover:shadow-lg transition-shadow duration-200">
        <div className="relative aspect-video bg-gray-100">
          {hasThumbnail ? (
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2"%3E%3Crect x="2" y="2" width="20" height="20" rx="2"%3E%3C/rect%3E%3C/svg%3E';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <VideoIcon className="w-12 h-12" />
            </div>
          )}
        </div>
        <div className="p-4">
          <h2 className="text-xl font-semibold mb-2 line-clamp-1">{video.title}</h2>
          <p className="text-gray-600 text-sm line-clamp-2">{video.description}</p>
          <div className="mt-2 text-xs text-gray-400">
            {formatLocalizedDate(video.publishDate, locale)}
          </div>
        </div>
      </div>
    </Link>
  );
}