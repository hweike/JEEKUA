import { supabase } from '@/lib/supabase/client';
import type { Address } from '@/lib/CRM/types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function getAddressesByCustomer(customerId: string): Promise<Address[]> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw new Error(`getAddressesByCustomer failed: ${error.message}`);
  return data || [];
}

export async function getAddressById(addressId: number, customerId: string): Promise<Address | null> {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .maybeSingle();
  if (error) throw new Error(`getAddressById failed: ${error.message}`);
  return data || null;
}

export async function createAddress(
  customerId: string,
  addressData: Omit<Address, 'id' | 'site_id' | 'customer_id' | 'created_at' | 'updated_at'>
): Promise<Address> {
  // 如果设为默认，清除其他默认地址
  if (addressData.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('customer_id', customerId);
  }

  const { data, error } = await supabase
    .from('addresses')
    .insert({
      site_id: DEFAULT_SITE_ID,
      customer_id: customerId,
      recipient: addressData.recipient,
      phone: addressData.phone,
      country_code: addressData.country_code,
      company: addressData.company || '',          // 新增 company 字段
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      detail: addressData.detail,
      is_default: addressData.is_default || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw new Error(`createAddress failed: ${error.message}`);
  return data;
}

export async function updateAddress(
  addressId: number,
  customerId: string,
  addressData: Partial<Omit<Address, 'id' | 'site_id' | 'customer_id' | 'created_at' | 'updated_at'>>
): Promise<Address> {
  // 如果设为默认，清除其他默认地址
  if (addressData.is_default) {
    await supabase
      .from('addresses')
      .update({ is_default: false })
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('customer_id', customerId);
  }

  const { data, error } = await supabase
    .from('addresses')
    .update({
      recipient: addressData.recipient,
      phone: addressData.phone,
      country_code: addressData.country_code,
      company: addressData.company || '',
      province: addressData.province || '',
      city: addressData.city || '',
      district: addressData.district || '',
      detail: addressData.detail,
      is_default: addressData.is_default || false,
      updated_at: new Date().toISOString(),
    })
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', addressId)
    .eq('customer_id', customerId)
    .select('*')
    .single();
  if (error) throw new Error(`updateAddress failed: ${error.message}`);
  return data;
}

export async function deleteAddress(addressId: number, customerId: string): Promise<void> {
  const { error } = await supabase
    .from('addresses')
    .delete()
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', addressId)
    .eq('customer_id', customerId);
  if (error) throw new Error(`deleteAddress failed: ${error.message}`);
}