import { supabase } from '@/lib/supabase/client';
import type { Customer } from '@/lib/CRM/types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', customerId)
    .maybeSingle();
  if (error) throw new Error(`getCustomerById failed: ${error.message}`);
  return data || null;
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`getCustomerByEmail failed: ${error.message}`);
  return data || null;
}

export async function getCustomerByEmailAndSource(email: string, source: 'manual' | 'register'): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('email', email)
    .eq('source', source)
    .maybeSingle();
  if (error) throw new Error(`getCustomerByEmailAndSource failed: ${error.message}`);
  return data || null;
}

export async function createCustomer(
  email: string,
  countryCode: string = '',
  firstName: string = '',
  lastName: string = '',
  source: 'manual' | 'register' = 'register'
): Promise<Customer> {
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const { data, error } = await supabase
    .from('customers')
    .insert({
      site_id: DEFAULT_SITE_ID,
      id: newId,
      first_name: firstName,
      last_name: lastName,
      email,
      country_code: countryCode,
      email_verified: true,
      role: 'customer',
      source: source,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) {
    if (error.code === '23505') { // PostgreSQL 唯一约束冲突
      throw new Error(`该邮箱已注册为 ${source} 类型`);
    }
    throw new Error(`createCustomer failed: ${error.message}`);
  }
  return data;
}


export async function updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
  const allowedFields = ['first_name', 'last_name', 'name', 'phone', 'country', 'country_code', 'company_name', 'address', 'stage', 'importance', 'scale', 'notes', 'website', 'flag', 'email_subscribed'];
  const filtered: any = {};
  for (const key of allowedFields) {
    if (updates[key as keyof Customer] !== undefined) {
      filtered[key] = updates[key as keyof Customer];
    }
  }
  filtered.updated_at = new Date().toISOString();
  const { data, error } = await supabase
    .from('customers')
    .update(filtered)
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', customerId)
    .select('*')
    .single();
  if (error) throw new Error(`updateCustomer failed: ${error.message}`);
  return data;
}

export async function updateLastLogin(customerId: string): Promise<void> {
  await supabase
    .from('customers')
    .update({ last_login: new Date().toISOString() })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', customerId);
}