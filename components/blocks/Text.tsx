'use client';
import dynamic from 'next/dynamic';

const RichTextRenderer = dynamic(() => import('@/components/RichTextRenderer'), { ssr: false });

export default function Text({ content }) {
  return (
    <section className="py-12 max-w-4xl mx-auto px-4">
      <RichTextRenderer content={content.text} />
    </section>
  );
}