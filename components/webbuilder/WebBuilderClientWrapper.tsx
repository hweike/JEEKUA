'use client';

import dynamic from 'next/dynamic';

// 动态导入渲染器，禁用 SSR
const WebBuilderRenderer = dynamic(
  () => import('./WebBuilderRenderer'),
  { ssr: false }
);

export default function WebBuilderClientWrapper({ data }: { data: any }) {
  return <WebBuilderRenderer data={data} />;
}