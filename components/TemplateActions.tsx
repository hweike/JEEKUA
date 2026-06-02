'use client';

import { Edit, Globe, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface TemplateActionsProps {
  id: string;
  typeId: string;
  templateId: string;
  locale: string;
  onDelete: (typeId: string, templateId: string) => void;
}

export function TemplateActions({ id, typeId, templateId, locale, onDelete }: TemplateActionsProps) {
  return (
    <div className="flex gap-2">
      <Link
        href={`/admin/webbuilder/edit/${typeId}/${templateId}?locale=${locale}`}
        className="text-blue-600 hover:text-blue-800 p-2"
        title="编辑"
      >
        <Edit className="w-4 h-4" />
      </Link>
      <Link
        href={`/admin/webbuilder/${typeId}/${templateId}/publish?sourceLocale=${locale}`}
        className="text-green-600 hover:text-green-800 p-2"
        title="发布到多语言"
      >
        <Globe className="w-4 h-4" />
      </Link>
      <button
        onClick={() => onDelete(typeId, templateId)}
        className="text-red-600 hover:text-red-800 p-2"
        title="删除"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}