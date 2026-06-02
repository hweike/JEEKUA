'use client';

import { Render } from '@puckeditor/core';
import config from '@/lib/webbuilder/config';

interface WebBuilderRendererProps {
  data: any; // 已经注入 __runtime 的 Puck 页面数据
}

export default function WebBuilderRenderer({ data }: WebBuilderRendererProps) {
  return <Render config={config} data={data} />;
}