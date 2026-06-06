'use client';

import { Puck, Render, legacySideBarPlugin } from '@puckeditor/core';
import { useState } from 'react';
import { toast } from 'sonner';
import config from '@/lib/webbuilder/config';
import { customFieldTypes } from '@/lib/webbuilder/field-types';
import { CustomFields } from '@/components/webbuilder/overrides/CustomFields';
import '@puckeditor/core/puck.css';

const legacySideBar = legacySideBarPlugin();

interface WebBuilderClientProps {
  data: any;
  onSave?: (data: any) => Promise<void>;
  onPublish?: (data: any) => Promise<void>;
  readOnly?: boolean;
  initialTitle?: string;
  initialCategory?: string;
}

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
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async (puckData: any) => {
    if (isPublishing) return;
    setIsPublishing(true);
    setData(puckData);
    if (onPublish) {
      try {
        await onPublish(puckData);
        toast.success('发布成功');
      } catch (error) {
        toast.error('发布失败');
      } finally {
        setIsPublishing(false);
      }
    } else {
      setIsPublishing(false);
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
        fieldTypes: customFieldTypes,
        fields: ({ children, itemSelector }) => {
          if (!itemSelector) {
            return (
              <div className="p-4 text-center text-gray-400 text-sm">
                请选择一个组件
              </div>
            );
          }
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