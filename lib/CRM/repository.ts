import { supabase } from '@/lib/supabase/client';
import type { Customer, CustomerStage, CustomerScale } from './types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 将数据库行（snake_case）转换为 Customer 对象（camelCase）
function toCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    country: row.country,
    email: row.email,
    phone: row.phone,
    whatsapp: row.whatsapp,
    companyName: row.company_name,
    address: row.address,
    stage: row.stage as CustomerStage | undefined,
    importance: row.importance as 1 | 2 | 3 | undefined,
    scale: row.scale as CustomerScale | undefined,
    notes: row.notes,
    website: row.website,
    flag: row.flag,
    emailSubscribed: row.email_subscribed,
    createdAt: row.created_at,
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getAllCustomers failed: ${error.message}`);
  return (data || []).map(toCustomer);
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getCustomerById failed: ${error.message}`);
  return data ? toCustomer(data) : null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`getCustomerByEmail failed: ${error.message}`);
  return data ? toCustomer(data) : null;
}

export async function createCustomer(customer: Customer): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .insert({
      site_id: DEFAULT_SITE_ID,
      id: customer.id,
      name: customer.name || '',
      country: customer.country || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      company_name: customer.companyName || '',
      address: customer.address || '',
      stage: customer.stage ?? null,
      importance: customer.importance ?? null,
      scale: customer.scale ?? null,
      notes: customer.notes || '',
      website: customer.website || '',
      flag: customer.flag || '',
      email_subscribed: customer.emailSubscribed,
      created_at: customer.createdAt,
    });
  if (error) throw new Error(`createCustomer failed: ${error.message}`);
}

export async function updateCustomer(customer: Customer): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({
      name: customer.name || '',
      country: customer.country || '',
      email: customer.email || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      company_name: customer.companyName || '',
      address: customer.address || '',
      stage: customer.stage ?? null,
      importance: customer.importance ?? null,
      scale: customer.scale ?? null,
      notes: customer.notes || '',
      website: customer.website || '',
      flag: customer.flag || '',
      email_subscribed: customer.emailSubscribed,
    })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', customer.id);
  if (error) throw new Error(`updateCustomer failed: ${error.message}`);
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id);
  if (error) throw new Error(`deleteCustomer failed: ${error.message}`);
}

// 询盘相关（可选）
export async function createInquiry(inquiry: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  product_id?: string;
  created_at: string;
  status?: string;
}): Promise<void> {
  const { error } = await supabase
    .from('inquiries')
    .insert({
      site_id: DEFAULT_SITE_ID,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone || '',
      company: inquiry.company || '',
      message: inquiry.message,
      product_id: inquiry.product_id || null,
      created_at: inquiry.created_at,
      status: inquiry.status || '未处理',
    });
  if (error) throw new Error(`createInquiry failed: ${error.message}`);
}

export async function getAllInquiries(): Promise<any[]> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getAllInquiries failed: ${error.message}`);
  return data || [];
}

export async function getInquiryById(id: number): Promise<any | null> {
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getInquiryById failed: ${error.message}`);
  return data || null;
}

export async function updateInquiryStatus(id: number, status: string): Promise<boolean> {
  const { error, count } = await supabase
    .from('inquiries')
    .update({ status })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', id);
  if (error) throw new Error(`updateInquiryStatus failed: ${error.message}`);
  return (count ?? 0) > 0;
}