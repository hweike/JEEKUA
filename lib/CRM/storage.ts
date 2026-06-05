// lib/CRM/repository.ts
import matter from 'gray-matter';
import { getPrivateStorage } from '@/lib/storage/factory';
import type { Customer } from './types';

// 存储前缀（对应私有桶中的目录）
const STORAGE_PREFIX = 'data/crm';

/**
 * 获取客户文件在私有桶中的完整 key
 */
function getCustomerKey(id: string): string {
  return `${STORAGE_PREFIX}/${id}.md`;
}

/**
 * 获取所有客户（从私有桶读取）
 */
export async function getAllCustomers(): Promise<Customer[]> {
  const storage = getPrivateStorage();
  try {
    // 列出所有 .md 文件
    const keys = await storage.list(STORAGE_PREFIX);
    const customerFiles = keys.filter(key => key.endsWith('.md'));
    const customers: Customer[] = [];
    for (const key of customerFiles) {
      const id = key.replace(`${STORAGE_PREFIX}/`, '').replace('.md', '');
      const customer = await getCustomerById(id);
      if (customer) customers.push(customer);
    }
    return customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    console.error('Failed to list customers from R2:', error);
    return [];
  }
}

/**
 * 根据 ID 获取单个客户
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  const storage = getPrivateStorage();
  const key = getCustomerKey(id);
  try {
    const content = await storage.read(key, 'utf8');
    const { data } = matter(content as string);
    return data as Customer;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`Failed to read customer ${id}:`, error);
    return null;
  }
}

/**
 * 保存客户（创建或更新）
 */
export async function saveCustomer(customer: Customer): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCustomerKey(customer.id);
  const { notes, ...rest } = customer;
  // 过滤掉 undefined 值，避免 YAML 序列化错误
  const frontMatter: Record<string, any> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      frontMatter[key] = value;
    }
  }
  const markdown = matter.stringify(notes || '', frontMatter);
  await storage.write(key, markdown, { contentType: 'text/markdown' });
}

/**
 * 删除客户
 */
export async function deleteCustomer(id: string): Promise<void> {
  const storage = getPrivateStorage();
  const key = getCustomerKey(id);
  try {
    await storage.delete(key);
  } catch (error: any) {
    if (!error?.message?.includes('NoSuchKey')) {
      console.error(`Failed to delete customer ${id}:`, error);
      throw error;
    }
  }
}