import { getTranslations } from 'next-intl/server';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import InquiryForm from '@/components/InquiryForm';

export default async function InquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; productName?: string }>;
}) {
  const { locale } = await params;
  const { product, productName } = await searchParams;
  const t = await getTranslations('Inquiry');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow bg-muted py-12">
        <div className="max-w-3xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-2 text-foreground">{t('title')}</h1>
          <p className="text-center text-muted-foreground mb-8">{t('subtitle')}</p>

          <InquiryForm
            locale={locale}
            defaultProduct={product ? { url: product, name: productName } : undefined}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}