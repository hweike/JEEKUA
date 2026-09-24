// lib/CRM/repository.ts
import sql from '@/lib/db/admin';
import type { Customer, CustomerStage, CustomerScale } from './types';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

// 将数据库行（snake_case）转换为 Customer 对象（camelCase）
function toCustomer(row: any): Customer {
  return {
    id: row.id,
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    name: row.name || '',
    country: row.country || '',
    country_code: row.country_code || '',
    email: row.email || '',
    phone: row.phone || '',
    whatsapp: row.whatsapp || '',
    companyName: row.company_name || '',
    address: row.address || '',
    stage: row.stage as CustomerStage | undefined,
    importance: row.importance as 1 | 2 | 3 | undefined,
    scale: row.scale as CustomerScale | undefined,
    notes: row.notes || '',
    website: row.website || '',
    flag: row.flag || '',
    emailSubscribed: row.email_subscribed || '未订阅',
    source: row.source || 'manual',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllCustomers(): Promise<Customer[]> {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
      ORDER BY created_at DESC
    `;
    return rows.map(toCustomer);
  } catch (error: any) {
    throw new Error(`getAllCustomers failed: ${error.message}`);
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
      LIMIT 1
    `;
    return rows[0] ? toCustomer(rows[0]) : null;
  } catch (error: any) {
    throw new Error(`getCustomerById failed: ${error.message}`);
  }
}

export async function getCustomerByEmail(email: string): Promise<Customer | null> {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND email = ${email}
      LIMIT 1
    `;
    return rows[0] ? toCustomer(rows[0]) : null;
  } catch (error: any) {
    throw new Error(`getCustomerByEmail failed: ${error.message}`);
  }
}

export async function getCustomerByEmailAndSource(
  email: string,
  source: 'manual' | 'register'
): Promise<Customer | null> {
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND email = ${email}
        AND source = ${source}
      LIMIT 1
    `;
    return rows[0] ? toCustomer(rows[0]) : null;
  } catch (error: any) {
    throw new Error(`getCustomerByEmailAndSource failed: ${error.message}`);
  }
}

export async function createCustomer(customer: Customer): Promise<void> {
  try {
    await sql`
      INSERT INTO public.customers (
        site_id, id, first_name, last_name, name, country, country_code,
        email, phone, whatsapp, company_name, address,
        stage, importance, scale, notes, website, flag,
        email_subscribed, source, created_at
      ) VALUES (
        ${DEFAULT_SITE_ID}, ${customer.id},
        ${customer.first_name || ''}, ${customer.last_name || ''}, ${customer.name || ''},
        ${customer.country || ''}, ${customer.country_code || ''},
        ${customer.email || ''}, ${customer.phone || ''}, ${customer.whatsapp || ''},
        ${customer.companyName || ''}, ${customer.address || ''},
        ${customer.stage ?? null}, ${customer.importance ?? null}, ${customer.scale ?? null},
        ${customer.notes || ''}, ${customer.website || ''}, ${customer.flag || ''},
        ${customer.emailSubscribed || '未订阅'}, ${customer.source || 'manual'},
        ${customer.createdAt || new Date().toISOString()}
      )
    `;
  } catch (error: any) {
    throw new Error(`createCustomer failed: ${error.message}`);
  }
}

export async function updateCustomer(customer: Customer): Promise<void> {
  try {
    await sql`
      UPDATE public.customers
      SET first_name = ${customer.first_name || ''},
          last_name = ${customer.last_name || ''},
          name = ${customer.name || ''},
          country = ${customer.country || ''},
          country_code = ${customer.country_code || ''},
          email = ${customer.email || ''},
          phone = ${customer.phone || ''},
          whatsapp = ${customer.whatsapp || ''},
          company_name = ${customer.companyName || ''},
          address = ${customer.address || ''},
          stage = ${customer.stage ?? null},
          importance = ${customer.importance ?? null},
          scale = ${customer.scale ?? null},
          notes = ${customer.notes || ''},
          website = ${customer.website || ''},
          flag = ${customer.flag || ''},
          email_subscribed = ${customer.emailSubscribed || '未订阅'},
          updated_at = ${new Date().toISOString()}
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${customer.id}
    `;
  } catch (error: any) {
    throw new Error(`updateCustomer failed: ${error.message}`);
  }
}

export async function deleteCustomer(id: string): Promise<void> {
  try {
    await sql`
      DELETE FROM public.customers
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${id}
    `;
  } catch (error: any) {
    throw new Error(`deleteCustomer failed: ${error.message}`);
  }
}

// ---- 工具：生成6位不重复编号 ----
function generateInquiryNumber(existingNumbers: string[]): string {
  const MAX_ATTEMPTS = 20;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const num = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
    if (!existingNumbers.includes(num)) return num;
  }
  return Date.now().toString().slice(-6);
}

// ---- 创建询盘（公共入口和用户中心共用） ----
export async function createInquiryWithCustomer(data: {
  site_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  message: string;
  product_id?: string;
  customer_id?: string;
  product_locale?: string;
  product_slug?: string;
}) {
  const siteId = data.site_id || DEFAULT_SITE_ID;

  let customerId = data.customer_id || null;
  let customerName = data.name || '';
  let customerEmail = data.email || '';
  let customerPhone = data.phone || '';
  let customerCompany = data.company || '';

  const getFullName = (first_name?: string, last_name?: string, fallbackName?: string, fallbackEmail?: string): string => {
    const full = [first_name, last_name].filter(Boolean).join(' ').trim();
    return full || fallbackName || fallbackEmail || '';
  };

  // ---- 1. 处理客户信息 ----
  if (customerId) {
    let customer: any;
    try {
      const rows = await sql<any[]>`
        SELECT first_name, last_name, name, email, phone, company_name FROM public.customers
        WHERE site_id = ${siteId}
          AND id = ${customerId}
        LIMIT 1
      `;
      customer = rows[0];
    } catch (custErr: any) {
      throw new Error(`获取客户信息失败: ${custErr.message}`);
    }

    if (customer) {
      const fullName = getFullName(customer.first_name, customer.last_name, customer.name, customer.email);
      customerName = data.name || fullName || '';
      customerEmail = data.email || customer.email || '';
      customerPhone = data.phone || customer.phone || '';
      customerCompany = data.company || customer.company_name || '';
    } else {
      if (data.email) {
        let byEmail: any;
        try {
          const rows = await sql<any[]>`
            SELECT id, first_name, last_name, name, email, phone, company_name FROM public.customers
            WHERE site_id = ${siteId}
              AND email = ${data.email}
            LIMIT 1
          `;
          byEmail = rows[0];
        } catch {}
        if (byEmail) {
          const fullName = getFullName(byEmail.first_name, byEmail.last_name, byEmail.name, byEmail.email);
          customerName = data.name || fullName || '';
          customerEmail = data.email || byEmail.email || '';
          customerPhone = data.phone || byEmail.phone || '';
          customerCompany = data.company || byEmail.company_name || '';
          customerId = byEmail.id;
        } else {
          customerName = data.name || '';
          customerEmail = data.email || '';
          customerPhone = data.phone || '';
          customerCompany = data.company || '';
        }
      } else {
        throw new Error(`客户 ${customerId} 不存在，且未提供邮箱`);
      }
    }
  } else if (data.email) {
    let existing: any;
    try {
      const rows = await sql<any[]>`
        SELECT id, first_name, last_name, name, phone, company_name FROM public.customers
        WHERE site_id = ${siteId}
          AND email = ${data.email}
        LIMIT 1
      `;
      existing = rows[0];
    } catch (findErr: any) {
      throw new Error(`查找客户失败: ${findErr.message}`);
    }

    if (existing) {
      customerId = existing.id;
      const fullName = getFullName(existing.first_name, existing.last_name, existing.name, data.email);
      customerName = data.name || fullName || '';
      customerEmail = data.email;
      customerPhone = data.phone || existing.phone || '';
      customerCompany = data.company || existing.company_name || '';
    } else {
      const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      try {
        await sql`
          INSERT INTO public.customers (
            site_id, id, first_name, last_name, name, email, phone, company_name, source, created_at
          ) VALUES (
            ${siteId}, ${newId}, '', '', ${data.name || ''}, ${data.email},
            ${data.phone || ''}, ${data.company || ''}, 'register', ${new Date().toISOString()}
          )
        `;
      } catch (insertErr: any) {
        throw new Error(`创建客户失败: ${insertErr.message}`);
      }
      customerId = newId;
      customerName = data.name || data.email || '';
      customerEmail = data.email;
      customerPhone = data.phone || '';
      customerCompany = data.company || '';
    }
  } else {
    throw new Error('请提供客户ID或邮箱地址');
  }

  // ---- 2. 最终校验 ----
  if (!customerEmail) {
    throw new Error('无法获取客户邮箱，请检查客户信息');
  }

  // ---- 3. 生成询盘编号 ----
  let usedNumbers: string[] = [];
  try {
    const rows = await sql<{ inquiry_number: string }[]>`
      SELECT inquiry_number FROM public.inquiries
      WHERE site_id = ${siteId}
    `;
    usedNumbers = rows.map(r => r.inquiry_number).filter(Boolean);
  } catch (numErr: any) {
    throw new Error(`查询编号失败: ${numErr.message}`);
  }
  const inquiryNumber = generateInquiryNumber(usedNumbers);
  const subject = `Inquiry No.: #${inquiryNumber}-${customerName || 'Visitor'}`;

  // ---- 4. 插入询盘 ----
  let inquiry: any;
  try {
    const rows = await sql<any[]>`
      INSERT INTO public.inquiries (
        site_id, inquiry_number, customer_id, name, email, phone, company,
        subject, message, product_id, product_locale, product_slug,
        status, created_at
      ) VALUES (
        ${siteId}, ${inquiryNumber}, ${customerId}, ${customerName}, ${customerEmail},
        ${customerPhone}, ${customerCompany}, ${subject}, ${data.message},
        ${data.product_id || null}, ${data.product_locale || null}, ${data.product_slug || null},
        '待处理', ${new Date().toISOString()}
      )
      RETURNING *
    `;
    inquiry = rows[0];
  } catch (insErr: any) {
    throw new Error(`创建询盘失败: ${insErr.message}`);
  }

  if (!inquiry) throw new Error('创建询盘失败：未返回数据');

  // ---- 5. 插入首条回复 ----
  try {
    await sql`
      INSERT INTO public.inquiry_replies (
        inquiry_id, site_id, sender_type, sender_email, sender_name,
        customer_id, content, is_internal, created_at
      ) VALUES (
        ${inquiry.id}, ${siteId}, 'user', ${customerEmail}, ${customerName},
        ${customerId}, ${data.message}, false, ${new Date().toISOString()}
      )
    `;
  } catch (replyErr: any) {
    throw new Error(`创建回复失败: ${replyErr.message}`);
  }

  return inquiry;
}

// ---- 获取单个询盘（含回复、客户信息和 product_slugs） ----
export async function getInquiryWithDetails(inquiryId: number) {
  let inquiry: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.inquiries
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND id = ${inquiryId}
      LIMIT 1
    `;
    inquiry = rows[0];
  } catch (inqErr: any) {
    throw new Error(`查询询盘失败: ${inqErr.message}`);
  }
  if (!inquiry) throw new Error('询盘不存在');

  let replies: any[] = [];
  try {
    replies = await sql<any[]>`
      SELECT * FROM public.inquiry_replies
      WHERE site_id = ${DEFAULT_SITE_ID}
        AND inquiry_id = ${inquiryId}
      ORDER BY created_at ASC
    `;
  } catch (repErr: any) {
    throw new Error(`查询回复失败: ${repErr.message}`);
  }

  let customer: any = null;
  if (inquiry.customer_id) {
    try {
      const rows = await sql<any[]>`
        SELECT * FROM public.customers
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id = ${inquiry.customer_id}
        LIMIT 1
      `;
      customer = rows[0] || null;
    } catch {}
  }

  // 查询 product_slugs
  let product_slugs: Record<string, string> | null = null;
  const productId = inquiry.product_id;
  if (productId && !productId.startsWith('http://') && !productId.startsWith('https://')) {
    try {
      const products = await sql<{ locale: string; slug: string }[]>`
        SELECT locale, slug FROM public.products
        WHERE product_name = ${productId}
      `;
      if (products.length > 0) {
        product_slugs = products.reduce((acc, p) => {
          acc[p.locale] = p.slug;
          return acc;
        }, {} as Record<string, string>);
      }
    } catch {}
  }

  return { inquiry, replies, customer, product_slugs };
}

// ---- 获取所有询盘（含关联客户和产品 slugs） ----
export async function getAllInquiriesWithCustomer() {
  let inquiries: any[];
  try {
    inquiries = await sql<any[]>`
      SELECT * FROM public.inquiries
      WHERE site_id = ${DEFAULT_SITE_ID}
      ORDER BY created_at DESC
    `;
  } catch (inqErr: any) {
    throw new Error(`getAllInquiries failed: ${inqErr.message}`);
  }

  if (!inquiries || inquiries.length === 0) {
    return [];
  }

  const customerIds = inquiries.map(inq => inq.customer_id).filter(id => id != null);

  let customersMap = new Map<string, any>();
  if (customerIds.length > 0) {
    try {
      const customers = await sql<any[]>`
        SELECT * FROM public.customers
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id IN ${sql(customerIds)}
      `;
      customersMap = new Map(customers.map(c => [c.id, c]));
    } catch (custErr: any) {
      throw new Error(`getCustomers failed: ${custErr.message}`);
    }
  }

  const productNames = inquiries
    .map(inq => inq.product_id)
    .filter(id => id && !id.startsWith('http://') && !id.startsWith('https://'));

  let nameSlugMap = new Map<string, Record<string, string>>();

  if (productNames.length > 0) {
    try {
      const products = await sql<{ product_name: string; locale: string; slug: string }[]>`
        SELECT product_name, locale, slug FROM public.products
        WHERE product_name IN ${sql(productNames)}
      `;
      if (products.length > 0) {
        const grouped = products.reduce((acc, p) => {
          if (!acc[p.product_name]) acc[p.product_name] = {};
          acc[p.product_name][p.locale] = p.slug;
          return acc;
        }, {} as Record<string, Record<string, string>>);
        nameSlugMap = new Map(Object.entries(grouped));
      }
    } catch {}
  }

  return inquiries.map(inquiry => ({
    ...inquiry,
    customers: inquiry.customer_id ? customersMap.get(inquiry.customer_id) || null : null,
    product_slugs: nameSlugMap.get(inquiry.product_id) || null,
  }));
}

// ---- 更新询盘状态 ----
export async function updateInquiryStatus(id: number, status: string, siteId?: string): Promise<boolean> {
  const effectiveSiteId = siteId || DEFAULT_SITE_ID;
  try {
    const rows = await sql<{ id: number }[]>`
      UPDATE public.inquiries
      SET status = ${status},
          updated_at = ${new Date().toISOString()}
      WHERE site_id = ${effectiveSiteId}
        AND id = ${id}
      RETURNING id
    `;
    return rows.length > 0;
  } catch (error: any) {
    throw new Error(`updateInquiryStatus failed: ${error.message}`);
  }
}

// ---- 添加回复（管理员/用户/系统） ----
export async function addReply(data: {
  inquiry_id: number;
  site_id?: string;
  sender_type: 'admin' | 'user' | 'system';
  sender_email: string;
  sender_name?: string;
  admin_id?: number;
  customer_id?: string | null;
  content: string;
  is_internal?: boolean;
  message_id?: string;
  in_reply_to?: string;
}) {
  const siteId = data.site_id || DEFAULT_SITE_ID;
  try {
    await sql`
      INSERT INTO public.inquiry_replies (
        inquiry_id, site_id, sender_type, sender_email, sender_name,
        admin_id, customer_id, content, is_internal, message_id, in_reply_to, created_at
      ) VALUES (
        ${data.inquiry_id}, ${siteId}, ${data.sender_type}, ${data.sender_email},
        ${data.sender_name || ''}, ${data.admin_id || null}, ${data.customer_id || null},
        ${data.content}, ${data.is_internal || false},
        ${data.message_id || null}, ${data.in_reply_to || null},
        ${new Date().toISOString()}
      )
    `;
  } catch (error: any) {
    throw new Error(`addReply failed: ${error.message}`);
  }
}

// ---- 管理员主动发起询盘（需指定 customer_id） ----
export async function createAdminInquiry(data: {
  site_id?: string;
  customer_id: string;
  message: string;
  product_id?: string;
  admin_id: number;
}) {
  const siteId = data.site_id || DEFAULT_SITE_ID;

  let customer: any;
  try {
    const rows = await sql<any[]>`
      SELECT * FROM public.customers
      WHERE site_id = ${siteId}
        AND id = ${data.customer_id}
      LIMIT 1
    `;
    customer = rows[0];
  } catch (custErr: any) {
    throw new Error(`客户不存在: ${custErr.message}`);
  }
  if (!customer) throw new Error('客户不存在');

  let usedNumbers: string[] = [];
  try {
    const rows = await sql<{ inquiry_number: string }[]>`
      SELECT inquiry_number FROM public.inquiries
      WHERE site_id = ${siteId}
    `;
    usedNumbers = rows.map(r => r.inquiry_number).filter(Boolean);
  } catch (numErr: any) {
    throw new Error(`查询编号失败: ${numErr.message}`);
  }
  const inquiryNumber = generateInquiryNumber(usedNumbers);

  const subject = `Inquiry No.: #${inquiryNumber}-${customer.name || customer.email || 'Customer'}`;

  let inquiry: any;
  try {
    const rows = await sql<any[]>`
      INSERT INTO public.inquiries (
        site_id, inquiry_number, customer_id, name, email, phone, company,
        subject, message, product_id, status, created_at
      ) VALUES (
        ${siteId}, ${inquiryNumber}, ${data.customer_id},
        ${customer.name || customer.email || ''}, ${customer.email},
        ${customer.phone || ''}, ${customer.company_name || ''},
        ${subject}, ${data.message}, ${data.product_id || null},
        '待处理', ${new Date().toISOString()}
      )
      RETURNING *
    `;
    inquiry = rows[0];
  } catch (insErr: any) {
    throw new Error(`创建询盘失败: ${insErr.message}`);
  }

  if (!inquiry) throw new Error('创建询盘失败：未返回数据');

  await addReply({
    inquiry_id: inquiry.id,
    site_id: siteId,
    sender_type: 'admin',
    sender_email: customer.email,
    sender_name: customer.name || '',
    admin_id: data.admin_id,
    customer_id: data.customer_id,
    content: data.message,
    is_internal: false,
  });

  return inquiry;
}