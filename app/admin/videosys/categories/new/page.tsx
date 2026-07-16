import CategoryForm from '@/components/videosys-admin/CategoryForm';

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; key?: string }>;
}) {
  const { locale = 'zh', key = '' } = await searchParams;
  return <CategoryForm mode="new" locale={locale} initialKey={key} />;
}