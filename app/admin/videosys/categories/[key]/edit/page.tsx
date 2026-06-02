import EditCategoryForm from './EditCategoryForm';

interface PageProps {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ locale?: string }>;
}

export default async function EditCategoryPage({ params, searchParams }: PageProps) {
  const { key } = await params;
  const { locale = 'zh' } = await searchParams;
  return <EditCategoryForm categoryKey={key} locale={locale} />;
}