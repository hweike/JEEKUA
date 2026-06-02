'use client';

import { Render } from '@measured/puck';
import { config } from '@/lib/webbuilder/config';

export function PreviewRenderer({ data }: { data: any }) {
  return (
    <div className="p-4 bg-white" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
      <Render config={config} data={data} />
    </div>
  );
}