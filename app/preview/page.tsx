'use client';

import { useEffect, useState } from 'react';
import { Render } from '@puckeditor/core';
import { config } from '@/lib/webbuilder/config';
import Header from '@/components/webbuilder/Header';
import Footer from '@/components/webbuilder/Footer';

export default function PreviewPage() {
  const [pageData, setPageData] = useState<any>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('previewData');
    if (stored) {
      setPageData(JSON.parse(stored));
    } else {
      setPageData({ content: [], root: {} });
    }
  }, []);

  if (!pageData) return <div className="p-8 text-center">加载预览中...</div>;

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <Render config={config} data={pageData} />
      </main>
      <Footer />
    </>
  );
}