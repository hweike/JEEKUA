import { getTranslations } from 'next-intl/server';
import InquiryForm from '@/components/InquiryForm';
import { withStaticLocale } from '@/lib/withPageLocale';

async function InquiryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ product?: string; productName?: string }>;
}) {
  const { locale } = await params;
  const { product, productName } = await searchParams;
  const t = await getTranslations('Inquiry');

  // 获取联系信息（服务端）
  let contactInfo: {
    hasContactInfo: boolean;
    companyName?: string;
    address?: string;
    phone?: string;
    email?: string;
  } = { hasContactInfo: false };

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/inquiry/contact`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data = await res.json();
      contactInfo = data;
    }
  } catch (error) {
    console.error('获取联系信息失败:', error);
  }

  const { hasContactInfo, companyName, address, phone, email } = contactInfo;

  return (
    <main className="flex-grow bg-muted">
      {/* 上栏：联系方式（仅当 hasContactInfo 为 true 时显示） */}
      {hasContactInfo ? (
        <section className="py-8 md:py-10 bg-white border-b">
          <div className="max-w-3xl mx-auto px-4">
            <div className="rich-text__blocks text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-gray-800">
                Contact information in China
              </h2>
              <div className="text-gray-600 space-y-3 text-base leading-relaxed">
                {companyName && (
                  <p>
                    <strong>{companyName}</strong>
                  </p>
                )}
                {address && (
                  <p>
                    ADD: {address}
                  </p>
                )}
                {phone && (
                  <p>
                    Phone/Whatsapp/Wechat: {phone}
                  </p>
                )}
                {email && (
                  <p>
                    Please contact the following email address for a product quote：
                    <br />
                    <a
                      href={`mailto:${email}`}
                      target="_blank"
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {email}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : (
        // 未配置联系信息时显示提示
        <section className="py-8 md:py-10 bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 text-center text-gray-500">
            <p>请在网站后台设置联系方式</p>
          </div>
        </section>
      )}

      {/* 下栏：询盘表单 */}
      <section className="py-10 md:py-14">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Send inquiry</h2>
          <InquiryForm
            locale={locale}
            defaultProductUrl={product}
            defaultProductName={productName}
          />
        </div>
      </section>
    </main>
  );
}

export default withStaticLocale(InquiryPage);