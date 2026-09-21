// app/admin/themes/customizer/components/shared/SectionCard.tsx
'use client';

import { ReactNode } from 'react';

interface SectionCardProps {
  /** 卡片标题 */
  title: string;
  /** 可选：标题右侧的额外内容 */
  extra?: ReactNode;
  /** 子元素 */
  children: ReactNode;
  /** 可选：额外的 CSS 类名 */
  className?: string;
}

export default function SectionCard({
  title,
  extra,
  children,
  className = '',
}: SectionCardProps) {
  return (
    <div className={`border rounded-lg p-4 bg-white shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        {extra && <div className="text-sm text-gray-500">{extra}</div>}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}