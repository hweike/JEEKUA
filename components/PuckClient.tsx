'use client';
import { Puck } from '@measured/puck';
import { config } from '@/lib/WebBuilder/config';

export function PuckClient({ data, onPublish }: { data: any; onPublish: (data: any) => void }) {
  return <Puck config={config} data={data} onPublish={onPublish} />;
}