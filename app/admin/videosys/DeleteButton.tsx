'use client';

import { useRouter } from 'next/navigation';

export function DeleteButton({ id, locale }: { id: string; locale: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('确定删除该视频吗？')) return;
    const res = await fetch(`/api/admin/videosys-videos?locale=${locale}&id=${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      router.refresh();
    } else {
      const error = await res.json();
      alert(error.error || '删除失败');
    }
  };

  return (
    <button onClick={handleDelete} className="text-red-600 hover:text-red-800">
      删除
    </button>
  );
}