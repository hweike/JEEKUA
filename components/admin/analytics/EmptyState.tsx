// components/admin/analytics/EmptyState.tsx

export function EmptyState({ message = '暂无数据。' }: { message?: string }) {
  return (
    <div className="flex flex-row justify-center items-center w-full h-full min-h-[70px] text-gray-400 text-sm">
      {message}
    </div>
  );
}