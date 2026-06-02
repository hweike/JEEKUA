import CategoryForm from '@/components/videosys-admin/CategoryForm';

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string }>;
}) {
  const { locale = 'zh' } = await searchParams;
  return <CategoryForm mode="new" locale={locale} />;
}