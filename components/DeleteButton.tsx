'use client';

import { Trash2 } from 'lucide-react';

export function DeleteButton({ typeId, templateId, onDelete }: { typeId: string; templateId: string; onDelete: (formData: FormData) => void }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('确定删除该模板吗？')) {
      e.preventDefault();
    }
  };

  return (
    <form action={onDelete} onSubmit={handleSubmit}>
      <input type="hidden" name="typeId" value={typeId} />
      <input type="hidden" name="templateId" value={templateId} />
      <button type="submit" className="text-red-600 hover:text-red-800 p-2" title="删除">
        <Trash2 className="w-4 h-4" />
      </button>
    </form>
  );
}