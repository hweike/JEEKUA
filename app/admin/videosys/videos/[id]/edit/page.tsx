import EditVideoForm from './EditVideoForm';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function EditVideoPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { locale = 'zh' } = await searchParams;
  return <EditVideoForm videoId={id} locale={locale} />;
}