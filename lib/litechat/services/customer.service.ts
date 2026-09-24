// lib/litechat/services/customer.service.ts
import sql from '@/lib/db/admin';
import { createCustomer } from '@/lib/account/server';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

/**
 * 根据邮箱获取或创建客户（用于聊天）
 */
export async function getOrCreateChatCustomer(
  email: string,
  name?: string,
  siteId: string = DEFAULT_SITE_ID
) {
  // 1. 先查找是否已存在（容忍重复，取最早一条）
  let existing: any = null;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${siteId}
        AND email = ${email}
      ORDER BY created_at ASC
      LIMIT 1
    `;
    existing = rows[0] ?? null;
  } catch (error) {
    console.error('查询客户失败:', error);
    throw new Error('查询客户失败');
  }

  if (existing) {
    // 如果客户存在但没有 name，且有传入 name，则更新
    if (name && !existing.name) {
      try {
        await sql`
          UPDATE public.customers
          SET name = ${name},
              updated_at = ${new Date().toISOString()}
          WHERE id = ${existing.id}
        `;
      } catch (error) {
        console.warn('更新客户名称失败:', error);
      }
    }
    return existing;
  }

  // 2. 不存在则创建
  const isVisitor = name?.startsWith('visitor_');
  let firstName = name || '';
  let lastName = '';

  if (isVisitor && name) {
    const parts = name.split('_');
    if (parts.length === 2) {
      firstName = 'visitor';
      lastName = parts[1];
    } else {
      firstName = name;
    }
  } else if (name) {
    firstName = name;
  }

  try {
    const newCustomer = await createCustomer(
      email,
      '',
      firstName,
      lastName,
      'chat',
      siteId
    );
    return newCustomer;
  } catch (error) {
    console.error('创建客户失败:', error);
    throw new Error('创建客户失败，请稍后重试');
  }
}

/**
 * 根据客户ID获取客户信息
 */
export async function getCustomerById(customerId: string) {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE id = ${customerId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('获取客户失败:', error);
    return null;
  }
}

/**
 * 检查客户是否存在（通过邮箱 + site_id）
 */
export async function customerExists(email: string, siteId: string = DEFAULT_SITE_ID) {
  try {
    const rows = await sql<{ id: string }[]>`
      SELECT id FROM public.customers
      WHERE site_id = ${siteId}
        AND email = ${email}
      LIMIT 1
    `;
    return rows.length > 0;
  } catch {
    return false;
  }
}