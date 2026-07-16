'use client';

import { Puck, Render, legacySideBarPlugin } from '@puckeditor/core';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import config from '@/lib/webbuilder/config';
import { customFieldTypes } from '@/lib/webbuilder/field-types';
import '@puckeditor/core/puck.css';
import './puck-overrides.css';
import {
  LayoutGrid,
  Type,
  SquareStack,
  Square,
  List,
  Minus,
  Table,
  Image,
  Video,
  Sliders,
  AlignJustify,
  Text,
  Layers,
  LayoutList,
  Columns,
  Rows,
  Package,
  FolderTree,
  BookOpen,
  Newspaper,
  FileText,
} from 'lucide-react';

interface WebBuilderClientProps {
  data: any;
  onSave?: (data: any) => void;
  onPublish?: (data: any) => void;
  readOnly?: boolean;
  initialTitle?: string;
  initialCategory?: string;
}

const componentIconMap: Record<string, React.ElementType> = {
  BlankBlock: LayoutGrid,
  Section: SquareStack,
  Heading: Type,
  Paragraph: AlignJustify,
  Button: Square,
  List: List,
  DividingLine: Minus,
  Table: Table,
  ImageBanner: Image,
  Video: Video,
  FullwidthSlider: Sliders,
  WidthSlider: Sliders,
  PicwithText: Image,
  Richtext: Text,
  Accordion: Layers,
  Collapsible: LayoutList,
  Multicolumn: Columns,
  Multirow: Rows,
  ProductLineBlock: Package,
  ProductCollectionsBlock: FolderTree,
  ProductDetailsBlock: BookOpen,
  DocumentLibraryBlock: FileText,
  BlogBlock: Newspaper,
  BlogCollectionBlock: Newspaper,
  VideoCategoryBlock: Video,
};

const legacySideBar = legacySideBarPlugin();

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

  // 清除分组标题按钮样式（保持不变）
  useEffect(() => {
    const timer = setTimeout(() => {
      const titleButtons = document.querySelectorAll(
        '[class*="ComponentList-title"]'
      );
      titleButtons.forEach((btn) => {
        const button = btn as HTMLButtonElement;
        button.style.border = 'none';
        button.style.textDecoration = 'none';
        button.style.outline = 'none';
        button.style.boxShadow = 'none';
        button.style.background = 'transparent';
        const iconContainer = button.querySelector('[class*="titleIcon"]');
        if (iconContainer) {
          (iconContainer as HTMLElement).style.display = 'none';
        }
        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.display = 'none';
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handlePublish = async (puckData: any) => {
    setData(puckData);
    if (onPublish) {
      // 不再显示 Toast，由父组件控制
      await onPublish(puckData);
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
        fieldTypes: customFieldTypes as any,
        drawerItem: ({ children, name }) => {
          const Icon = componentIconMap[name] || LayoutGrid;
          return (
            <div className="flex items-center gap-2 px-4 py-3 rounded-md hover:bg-gray-100 cursor-grab transition-colors w-full">
              <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
              <div className="flex-1 flex items-center min-w-0 text-base font-medium text-gray-700">
                {children}
              </div>
            </div>
          );
        },
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
        componentsHeading: () => <span className="text-sm font-bold">组件库</span>,
        outlineHeading: () => <span className="text-sm font-bold">大纲</span>,
        fieldsHeading: () => <span className="text-sm font-bold">属性</span>,
        duplicateAction: () => <span title="复制">复制</span>,
        deleteAction: () => <span title="删除">删除</span>,
      }}
    />
  );
}