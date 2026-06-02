import VideoForm from '@/components/videosys-admin/VideoForm';

interface PageProps {
  searchParams: Promise<{ locale?: string }>;
}

export default async function NewVideoPage({ searchParams }: PageProps) {
  const { locale = 'zh' } = await searchParams;
  return <VideoForm mode="new" locale={locale} />;
}