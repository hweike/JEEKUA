import { getCustomerById } from '@/lib/CRM/repository';
import CustomerForm from '../../_components/CustomerForm';
import { notFound } from 'next/navigation';

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = getCustomerById(id);
  if (!customer) notFound();
  return <CustomerForm initialData={customer} isEdit />;
}