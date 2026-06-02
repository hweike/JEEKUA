// components/webbuilder/WebBuilderClient.tsx
'use client';

import { Puck, Render, legacySideBarPlugin } from '@puckeditor/core';
import { useState } from 'react';
import { toast } from 'sonner';
import config from '@/lib/webbuilder/config';
import { customFieldTypes } from '@/lib/webbuilder/field-types';
import { CustomFields } from '@/components/webbuilder/overrides/CustomFields';
import '@puckeditor/core/puck.css';

const legacySideBar = legacySideBarPlugin();

// ... 接口定义保持不变

export default function WebBuilderClient({
  data: initialData,
  onSave,
  onPublish,
  readOnly = false,
}: WebBuilderClientProps) {
  const [data, setData] = useState(() => {
    if (initialData && Array.isArray(initialData.content)) return initialData;
    return { root: { props: {} }, content: [], zones: {} };
  });

  const handlePublish = async (puckData: any) => {
    setData(puckData);
    if (onPublish) {
      try {
        await onPublish(puckData);
        toast.success('发布成功');
      } catch (error) {
        toast.error('发布失败');
      }
    }
  };

  if (readOnly) {
    return <Render config={config} data={data} />;
  }

  return (
    <Puck
      config={config}
      data={data}
      onPublish={handlePublish}
      plugins={[legacySideBar]}
      overrides={{
        // 🔥 注册自定义字段类型
        fieldTypes: customFieldTypes,
        // 🔥 覆盖属性面板渲染
        fields: ({ children, itemSelector }) => {
          // 没有选中任何组件时，显示提示
          if (!itemSelector) {
            return (
              <div className="p-4 text-center text-gray-400 text-sm">
                请选择一个组件
              </div>
            );
          }
          // 使用自定义渲染器
          return children;
        },
        headerActions: ({ children }) => <>{children}</>,
        componentsHeading: () => <span>组件库</span>,
        outlineHeading: () => <span>大纲</span>,
        fieldsHeading: () => <span>属性</span>,
        duplicateAction: () => <span title="复制">复制</span>,
        deleteAction: () => <span title="删除">删除</span>,
      }}
    />
  );
}