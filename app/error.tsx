'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string; code?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('全局错误:', error);
  }, [error]);

  const isStorageError = error.code === 'R2_UNAVAILABLE' || error.message?.includes('R2 存储服务');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">
        {isStorageError ? '存储服务暂时不可用' : '系统繁忙，请稍后重试'}
      </h1>
      <p className="text-gray-600 mb-6">
        {isStorageError
          ? '我们的存储服务正在维护或出现临时故障，请稍后刷新页面。'
          : '发生了一个意外错误，请尝试刷新页面。'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        重试
      </button>
    </div>
  );
}