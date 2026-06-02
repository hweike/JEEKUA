'use client';

import type { BlankBlockProps } from '@/lib/webbuilder/types';

interface BlankBlockRenderProps extends BlankBlockProps {
  puck: {
    dragRef: (element: HTMLElement | null) => void;
    isEditing: boolean;
  };
}

export function BlankBlock({
  gap = 12,
  padding = 16,
  content: Content,
  puck,
}: BlankBlockRenderProps) {
  const isEmpty = !Content || !Content.props?.children?.length;

  return (
    <div
      ref={puck.dragRef}
      className="relative flex flex-col"
      style={{
        gap: `${gap}px`,
        padding: `${padding}px`,
        minHeight: puck.isEditing && isEmpty ? '100px' : 'auto',
      }}
    >
      {/* 内容区域（slot） - 始终存在 */}
      <div className="relative flex-1">
        <Content />
      </div>

      {/* 空状态提示 - 绝对定位覆盖，不占用文档流 */}
      {puck.isEditing && isEmpty && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ margin: `${padding}px` }}
        >
          <div className="text-sm text-gray-400 text-center border border-dashed border-gray-300 rounded-lg p-4 w-full h-full flex items-center justify-center">
            拖拽组件到这里
          </div>
        </div>
      )}
    </div>
  );
}