'use client';

import { Puck, Render } from '@puckeditor/core';
import { useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import config from '@/lib/webbuilder/config';
import '@puckeditor/core/puck.css';

export default function Client({
  isEdit,
  path,
  data: initialData,
}: {
  isEdit: boolean;
  path: string;
  data: any;
}) {
  const router = useRouter();
  const [data, setData] = useState(initialData);

  // 🔥 使用 useLayoutEffect 在浏览器绘制前立即更新标题
  useLayoutEffect(() => {
    if (isEdit) {
      document.title = '网页模板构建器';
    } else {
      const title = data?.root?.props?.title;
      document.title = title || '未命名页面';
    }
  }, [isEdit, data]);

  const handlePublish = async (newData: any) => {
    setData(newData);
    await fetch(`/api/webbuilder?id=${path}`, {
      method: 'PUT',
      body: JSON.stringify({ data: newData }),
      headers: { 'Content-Type': 'application/json' },
    });
    router.push(`/webbuilder/${path}`);
  };

  if (isEdit) {
    return (
      <Puck config={config} data={data} onPublish={handlePublish}>
        <div className="flex h-screen bg-gray-50">
          <div className="w-80 border-r bg-white flex flex-col">
            <div className="p-3">
              <Puck.Components />
            </div>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <Puck.Preview />
          </div>
          <div className="w-80 border-l bg-white flex flex-col">
            <div className="p-3">
              <Puck.Fields />
            </div>
          </div>
        </div>
      </Puck>
    );
  }

  return <Render config={config} data={data} />;
}