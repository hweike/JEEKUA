// lib/account/address.ts
import sql from '@/lib/db/admin';
import type { Address } from '@/lib/CRM/types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function getAddressesByCustomer(customerId: string): Promise<Address[]> {
  try {
    return await sql<Address[]>`
      SELECT * FROM public.addresses
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND customer_id = ${customerId}
      ORDER BY is_default DESC, created_at DESC
    `;
  } catch (error: any) {
    throw new Error(`getAddressesByCustomer failed: ${error.message}`);
  }
}

export async function getAddressById(addressId: number, customerId: string): Promise<Address | null> {
  try {
    const rows = await sql<Address[]>`
      SELECT * FROM public.addresses
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${addressId}
        AND customer_id = ${customerId}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`getAddressById failed: ${error.message}`);
  }
}

export async function createAddress(
  customerId: string,
  addressData: Omit<Address, 'id' | 'site_id' | 'customer_id' | 'created_at' | 'updated_at'>
): Promise<Address> {
  // 1. 如果设为默认，清除其他默认地址
  if (addressData.isDefault) {
    try {
      await sql`
        UPDATE public.addresses
        SET is_default = false
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND customer_id = ${customerId}
      `;
    } catch {}
  }

  // 2. 插入新地址
  try {
    const rows = await sql<Address[]>`
      INSERT INTO public.addresses (
        site_id, customer_id, recipient, phone, country_code, company,
        province, city, district, detail, is_default, created_at, updated_at
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${customerId}, ${addressData.recipient}, ${addressData.phone},
        ${addressData.country_code}, ${addressData.company || ''},
        ${addressData.province || ''}, ${addressData.city || ''},
        ${addressData.district || ''}, ${addressData.detail},
        ${addressData.isDefault || false},
        ${new Date().toISOString()}, ${new Date().toISOString()}
      )
      RETURNING *
    `;
    if (!rows[0]) throw new Error('Insert returned no data');
    return rows[0];
  } catch (error: any) {
    throw new Error(`createAddress failed: ${error.message}`);
  }
}

export async function updateAddress(
  addressId: number,
  customerId: string,
  addressData: Partial<Omit<Address, 'id' | 'site_id' | 'customer_id' | 'created_at' | 'updated_at'>>
): Promise<Address> {
  // 1. 如果设为默认，清除其他默认地址
  if (addressData.isDefault) {
    try {
      await sql`
        UPDATE public.addresses
        SET is_default = false
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND customer_id = ${customerId}
      `;
    } catch {}
  }

  // 2. 构建动态 SET
  const setClauses: any[] = [];
  if (addressData.recipient !== undefined) setClauses.push(sql`recipient = ${addressData.recipient}`);
  if (addressData.phone !== undefined) setClauses.push(sql`phone = ${addressData.phone}`);
  if (addressData.country_code !== undefined) setClauses.push(sql`country_code = ${addressData.country_code}`);
  if (addressData.company !== undefined) setClauses.push(sql`company = ${addressData.company || ''}`);
  if (addressData.province !== undefined) setClauses.push(sql`province = ${addressData.province || ''}`);
  if (addressData.city !== undefined) setClauses.push(sql`city = ${addressData.city || ''}`);
  if (addressData.district !== undefined) setClauses.push(sql`district = ${addressData.district || ''}`);
  if (addressData.detail !== undefined) setClauses.push(sql`detail = ${addressData.detail}`);
  if (addressData.isDefault !== undefined) setClauses.push(sql`is_default = ${addressData.isDefault}`);
  setClauses.push(sql`updated_at = ${new Date().toISOString()}`);

  const setClause = setClauses.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
    sql``
  );

  // 3. 执行 UPDATE
  try {
    const rows = await sql<Address[]>`
      UPDATE public.addresses
      SET ${setClause}
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${addressId}
        AND customer_id = ${customerId}
      RETURNING *
    `;
    if (!rows[0]) throw new Error('Address not found');
    return rows[0];
  } catch (error: any) {
    throw new Error(`updateAddress failed: ${error.message}`);
  }
}

export async function deleteAddress(addressId: number, customerId: string): Promise<void> {
  try {
    await sql`
      DELETE FROM public.addresses
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${addressId}
        AND customer_id = ${customerId}
    `;
  } catch (error: any) {
    throw new Error(`deleteAddress failed: ${error.message}`);
  }
}