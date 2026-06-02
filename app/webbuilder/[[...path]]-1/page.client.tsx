'use client';

import { useEffect, useState } from 'react';
import WebBuilderClient from '@/components/webbuilder/WebBuilderClient'; // 默认导入
import { toast } from 'sonner';
import { TemplateCategory } from '@/lib/webbuilder/types';

const DEFAULT_PUCK_DATA = {
  root: { props: { title: '新建页面' } },
  content: [],
  zones: {},
};

interface Props {
  isEdit: boolean;
  templateId: string | null;
  initialData: any;
  initialTitle: string;
  initialCategory: TemplateCategory;
}

export default function WebBuilderPageClient({
  isEdit,
  templateId: initialTemplateId,
  initialData,
  initialTitle: propInitialTitle,
  initialCategory: propInitialCategory,
}: Props) {
  const [data, setData] = useState(initialData || DEFAULT_PUCK_DATA);
  const [templateId, setTemplateId] = useState<string | null>(initialTemplateId);
  const [currentTitle, setCurrentTitle] = useState(propInitialTitle);
  const [currentCategory, setCurrentCategory] = useState<TemplateCategory>(propInitialCategory);
  const [loading, setLoading] = useState(isEdit ? true : false);

  // 如果是编辑模式且没有传入 initialData，则自行加载模板数据
  useEffect(() => {
    if (!isEdit || initialData) {
      setLoading(false);
      return;
    }

    if (!templateId) {
      // 新建模板
      setData(DEFAULT_PUCK_DATA);
      setCurrentTitle('未命名模板');
      setCurrentCategory('page');
      setLoading(false);
      return;
    }

    // 编辑已有模板
    const baseId = templateId.replace(/_(draft|published)$/, '');
    fetch(`/api/templates/${baseId}?version=draft`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            const publishedRes = await fetch(`/api/templates/${baseId}?version=published`);
            if (publishedRes.ok) return publishedRes.json();
          }
          throw new Error('模板加载失败');
        }
        return res.json();
      })
      .then((template) => {
        if (template.data && template.data.content) {
          setData(template.data);
        } else {
          setData(DEFAULT_PUCK_DATA);
        }
        setCurrentTitle(template.title || '未命名模板');
        setCurrentCategory(template.category || 'page');
      })
      .catch((err) => {
        console.error('加载模板失败:', err);
        toast.error('加载模板失败，将使用默认数据');
        setData(DEFAULT_PUCK_DATA);
      })
      .finally(() => setLoading(false));
  }, [isEdit, templateId, initialData]);

  const handleSave = async (puckData: any, title: string, category: TemplateCategory) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          title,
          category,
          data: puckData,
          action: 'save',
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (!templateId) {
          setTemplateId(result.baseId);
          window.history.replaceState(null, '', `/webbuilder/edit/${result.baseId}`);
        }
        toast.success('草稿已保存');
        setCurrentTitle(title);
        setCurrentCategory(category);
      } else {
        toast.error(result.error || '保存失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  const handlePublish = async (puckData: any, title: string, category: TemplateCategory) => {
    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: templateId,
          title,
          category,
          data: puckData,
          action: 'publish',
        }),
      });
      const result = await res.json();
      if (result.success) {
        if (!templateId) {
          setTemplateId(result.baseId);
          window.history.replaceState(null, '', `/webbuilder/edit/${result.baseId}`);
        }
        toast.success('发布成功');
        setCurrentTitle(title);
        setCurrentCategory(category);
      } else {
        toast.error(result.error || '发布失败');
      }
    } catch (error) {
      toast.error('网络错误');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">加载编辑器中...</div>
      </div>
    );
  }

  if (!isEdit) {
    // 预览模式：直接渲染静态页面
    return (
      <div className="min-h-screen">
        <WebBuilderClient
          data={data}
          initialTitle={currentTitle}
          initialCategory={currentCategory}
          onSave={handleSave}
          onPublish={handlePublish}
          readOnly
        />
      </div>
    );
  }

  return (
    <WebBuilderClient
      data={data}
      initialTitle={currentTitle}
      initialCategory={currentCategory}
      onSave={handleSave}
      onPublish={handlePublish}
    />
  );
}