import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Customer } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'crm');

async function ensureDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

export async function getAllCustomers(): Promise<Customer[]> {
  await ensureDir();
  const files = await fs.readdir(DATA_DIR);
  const customers: Customer[] = [];
  for (const file of files) {
    if (file.endsWith('.md')) {
      const id = file.replace('.md', '');
      const customer = await getCustomerById(id);
      if (customer) customers.push(customer);
    }
  }
  return customers.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const filePath = path.join(DATA_DIR, `${id}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const { data } = matter(content);
    return data as Customer;
  } catch {
    return null;
  }
}

export async function saveCustomer(customer: Customer): Promise<void> {
  await ensureDir();
  const filePath = path.join(DATA_DIR, `${customer.id}.md`);
  const { notes, ...rest } = customer;
  // 过滤掉 undefined 值，避免 YAML 序列化错误
  const frontMatter: Record<string, any> = {};
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      frontMatter[key] = value;
    }
  }
  const markdown = matter.stringify(notes || '', frontMatter);
  await fs.writeFile(filePath, markdown, 'utf-8');
}

export async function deleteCustomer(id: string): Promise<void> {
  const filePath = path.join(DATA_DIR, `${id}.md`);
  await fs.unlink(filePath);
}