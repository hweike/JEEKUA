// lib/account/customer.ts
import sql from '@/lib/db/admin';
import type { Customer } from '@/lib/CRM/types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

export async function getCustomerById(customerId: string): Promise<Customer | null> {
  try {
    const rows = await sql<Customer[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${customerId}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`getCustomerById failed: ${error.message}`);
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const rows = await sql<Customer[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND email = ${email}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`getCustomerByEmail failed: ${error.message}`);
  }
}

export async function getCustomerByEmailAndSource(
  email: string,
  source: 'manual' | 'register'
): Promise<Customer | null> {
  try {
    const rows = await sql<Customer[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND email = ${email}
        AND source = ${source}
      LIMIT 1
    `;
    return rows[0] || null;
  } catch (error: any) {
    throw new Error(`getCustomerByEmailAndSource failed: ${error.message}`);
  }
}

export async function createCustomer(
  email: string,
  countryCode: string = '',
  firstName: string = '',
  lastName: string = '',
  source: 'manual' | 'register' = 'register'
): Promise<Customer> {
  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  try {
    const rows = await sql<Customer[]>`
      INSERT INTO public.customers (
        site_id, id, first_name, last_name, email, country_code,
        email_verified, role, source, created_at, updated_at
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${newId}, ${firstName}, ${lastName}, ${email}, ${countryCode},
        true, 'customer', ${source},
        ${new Date().toISOString()}, ${new Date().toISOString()}
      )
      RETURNING *
    `;
    if (!rows[0]) throw new Error('Insert returned no data');
    return rows[0];
  } catch (error: any) {
    // PostgreSQL 唯一约束冲突：error.code === '23505'
    if (error.code === '23505') {
      throw new Error(`该邮箱已注册为 ${source} 类型`);
    }
    throw new Error(`createCustomer failed: ${error.message}`);
  }
}

export async function updateCustomer(
  customerId: string,
  updates: Partial<Customer>
): Promise<Customer> {
  const allowedFields = [
    'first_name', 'last_name', 'name', 'phone', 'country', 'country_code',
    'company_name', 'address', 'stage', 'importance', 'scale', 'notes',
    'website', 'flag', 'email_subscribed',
  ];

  const filtered: Record<string, any> = {};
  for (const key of allowedFields) {
    if (updates[key as keyof Customer] !== undefined) {
      filtered[key] = updates[key as keyof Customer];
    }
  }
  filtered.updated_at = new Date().toISOString();

  // 动态 SET 子句
  const setClauses: any[] = [];
  for (const [key, value] of Object.entries(filtered)) {
    setClauses.push(sql`${sql(key)} = ${value}`);
  }
  const setClause = setClauses.reduce(
    (acc, c, i) => (i === 0 ? c : sql`${acc}, ${c}`),
    sql``
  );

  try {
    const rows = await sql<Customer[]>`
      UPDATE public.customers
      SET ${setClause}
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${customerId}
      RETURNING *
    `;
    if (!rows[0]) throw new Error('Customer not found');
    return rows[0];
  } catch (error: any) {
    throw new Error(`updateCustomer failed: ${error.message}`);
  }
}

export async function updateLastLogin(customerId: string): Promise<void> {
  try {
    await sql`
      UPDATE public.customers
      SET last_login = ${new Date().toISOString()}
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${customerId}
    `;
  } catch {
    // 忽略
  }
}