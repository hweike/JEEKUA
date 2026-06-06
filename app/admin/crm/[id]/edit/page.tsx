import { getCustomerById } from '@/lib/CRM/repository';
import { notFound } from 'next/navigation';
import CustomerForm from '@/app/admin/crm/_components/CustomerForm';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await getCustomerById(id);
  if (!customer) notFound();
  return <CustomerForm initialData={customer} isEdit />;
}