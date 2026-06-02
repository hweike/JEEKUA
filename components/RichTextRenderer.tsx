'use client';

interface RichTextRendererProps {
  html: string;
  className?: string;
}

export default function RichTextRenderer({ html, className }: RichTextRendererProps) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}