import { getCustomerById } from '@/lib/CRM/repository';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Star, ArrowLeft } from 'lucide-react';

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);  // ✅ 添加 await
  if (!customer) notFound();

  const importance = customer.importance ?? 0;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/crm" className="inline-flex items-center gap-1 text-blue-600 mb-4">
        <ArrowLeft size={16} /> 返回列表
      </Link>
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          {customer.name || '未命名客户'}
          {customer.flag && <span className="text-sm bg-gray-100 px-2 py-1 rounded-full">{customer.flag}</span>}
        </h1>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="font-medium">ID:</span> {customer.id}</div>
          <div><span className="font-medium">国家:</span> {customer.country}</div>
          <div><span className="font-medium">邮箱:</span> {customer.email}</div>
          <div><span className="font-medium">电话:</span> {customer.phone || '—'}</div>
          <div><span className="font-medium">WhatsApp:</span> {customer.whatsapp}</div>
          <div><span className="font-medium">公司:</span> {customer.companyName}</div>
          <div><span className="font-medium">官网:</span> {customer.website ? <a href={customer.website} target="_blank" className="text-blue-500">{customer.website}</a> : '—'}</div>
          <div><span className="font-medium">地址:</span> {customer.address || '—'}</div>
          <div><span className="font-medium">阶段:</span> {customer.stage || '—'}</div>
          <div>
            <span className="font-medium">重要等级:</span>
            <div className="inline-flex gap-0.5 ml-1">
              {[1, 2, 3].map(star => (
                <Star key={star} size={14} className={star <= importance ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} />
              ))}
            </div>
          </div>
          <div><span className="font-medium">规模:</span> {customer.scale || '—'}</div>
          <div><span className="font-medium">邮件订阅:</span> {customer.emailSubscribed}</div>
          <div><span className="font-medium">创建时间:</span> {customer.createdAt}</div>
          <div className="col-span-2"><span className="font-medium">备注:</span> {customer.notes || '—'}</div>
        </div>
        <div className="mt-6 flex justify-end">
          <Link href={`/admin/crm/${customer.id}/edit`} className="bg-indigo-600 text-white px-4 py-2 rounded-md">编辑</Link>
        </div>
      </div>
    </div>
  );
}