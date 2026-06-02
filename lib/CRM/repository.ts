import getDb from '@/lib/db';
import type { Customer, CustomerStage, CustomerScale } from './types';

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

export function getAllCustomers(): Customer[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers ORDER BY created_at DESC');
  const rows = stmt.all();
  return rows.map(toCustomer);
}

export function getCustomerById(id: string): Customer | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
  const row = stmt.get(id);
  return row ? toCustomer(row) : null;
}

export function getCustomerByEmail(email: string): Customer | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM customers WHERE email = ?');
  const row = stmt.get(email);
  return row ? toCustomer(row) : null;
}

export function createCustomer(customer: Customer): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO customers (
      id, name, country, email, phone, whatsapp, company_name,
      address, stage, importance, scale, notes, website, flag,
      email_subscribed, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    customer.id,
    customer.name || '',
    customer.country || '',
    customer.email || '',
    customer.phone || '',
    customer.whatsapp || '',
    customer.companyName || '',
    customer.address || '',
    customer.stage ?? null,
    customer.importance ?? null,
    customer.scale ?? null,
    customer.notes || '',
    customer.website || '',
    customer.flag || '',
    customer.emailSubscribed,
    customer.createdAt
  );
}

export function updateCustomer(customer: Customer): void {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE customers SET
      name = ?, country = ?, email = ?, phone = ?, whatsapp = ?,
      company_name = ?, address = ?, stage = ?, importance = ?,
      scale = ?, notes = ?, website = ?, flag = ?, email_subscribed = ?
    WHERE id = ?
  `);
  stmt.run(
    customer.name || '',
    customer.country || '',
    customer.email || '',
    customer.phone || '',
    customer.whatsapp || '',
    customer.companyName || '',
    customer.address || '',
    customer.stage ?? null,
    customer.importance ?? null,
    customer.scale ?? null,
    customer.notes || '',
    customer.website || '',
    customer.flag || '',
    customer.emailSubscribed,
    customer.id
  );
}

export function deleteCustomer(id: string): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM customers WHERE id = ?');
  stmt.run(id);
}

// 询盘相关（可选）
export function createInquiry(inquiry: {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  message: string;
  product_id?: string;
  created_at: string;
  status?: string;
}): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO inquiries (name, email, phone, company, message, product_id, created_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    inquiry.name,
    inquiry.email,
    inquiry.phone || '',
    inquiry.company || '',
    inquiry.message,
    inquiry.product_id || null,
    inquiry.created_at,
    inquiry.status || '未处理'
  );
}

export function getAllInquiries(): any[] {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC');
  return stmt.all();
}

// 根据 ID 获取单条询盘
export function getInquiryById(id: number): any | null {
  const db = getDb();
  const stmt = db.prepare('SELECT * FROM inquiries WHERE id = ?');
  const row = stmt.get(id);
  return row || null;
}

// 更新询盘状态
export function updateInquiryStatus(id: number, status: string): boolean {
  const db = getDb();
  const stmt = db.prepare('UPDATE inquiries SET status = ? WHERE id = ?');
  const result = stmt.run(status, id);
  return result.changes > 0;
}