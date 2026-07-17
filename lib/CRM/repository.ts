import { supabase } from '@/lib/supabase/client';
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

// ---------- 新增：根据邮箱和来源查询客户 ----------
export async function getCustomerByEmailAndSource(email: string, source: 'manual' | 'register'): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('email', email)
    .eq('source', source)
    .maybeSingle();
  if (error) throw new Error(`getCustomerByEmailAndSource failed: ${error.message}`);
  return data ? toCustomer(data) : null;
}
// --------------------------------------------------

export async function createCustomer(customer: Customer): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .insert({
      site_id: DEFAULT_SITE_ID,
      id: customer.id,
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      name: customer.name || '',
      country: customer.country || '',
      country_code: customer.country_code || '',
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
      email_subscribed: customer.emailSubscribed || '未订阅',
      source: customer.source || 'manual',
      created_at: customer.createdAt || new Date().toISOString(),
    });
  if (error) throw new Error(`createCustomer failed: ${error.message}`);
}

export async function updateCustomer(customer: Customer): Promise<void> {
  // 更新时不允许修改 site_id、id、created_at、source
  const { error } = await supabase
    .from('customers')
    .update({
      first_name: customer.first_name || '',
      last_name: customer.last_name || '',
      name: customer.name || '',
      country: customer.country || '',
      country_code: customer.country_code || '',
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
      email_subscribed: customer.emailSubscribed || '未订阅',
      // source 不更新，保持原值
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

// ---- 工具：生成6位不重复编号 ----
function generateInquiryNumber(existingNumbers: string[]): string {
  const MAX_ATTEMPTS = 20;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const num = Math.floor(100000 + Math.random() * 900000).toString().padStart(6, '0');
    if (!existingNumbers.includes(num)) return num;
  }
  return Date.now().toString().slice(-6); // 降级方案
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
}) {
  const siteId = data.site_id || DEFAULT_SITE_ID;
  console.log('[createInquiry] siteId:', siteId, 'customer_id:', data.customer_id, 'email:', data.email);

  let customerId = data.customer_id || null;
  let customerName = data.name || '';
  let customerEmail = data.email || '';
  let customerPhone = data.phone || '';
  let customerCompany = data.company || '';

  // ---- 辅助函数：组合用户全名 ----
  const getFullName = (first_name?: string, last_name?: string, fallbackName?: string, fallbackEmail?: string): string => {
    const full = [first_name, last_name].filter(Boolean).join(' ').trim();
    return full || fallbackName || fallbackEmail || '';
  };

  // ---- 1. 处理客户信息 ----
  if (customerId) {
    // 根据 customer_id 查询客户（包含 first_name, last_name）
    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('first_name, last_name, name, email, phone, company_name')
      .eq('site_id', siteId)
      .eq('id', customerId)
      .maybeSingle();

    if (custErr) {
      console.error('[createInquiry] 查询客户失败:', custErr);
      throw new Error(`获取客户信息失败: ${custErr.message}`);
    }

    if (customer) {
      console.log('[createInquiry] 找到客户:', customer);
      const fullName = getFullName(customer.first_name, customer.last_name, customer.name, customer.email);
      customerName = data.name || fullName || '';
      customerEmail = data.email || customer.email || '';
      customerPhone = data.phone || customer.phone || '';
      customerCompany = data.company || customer.company_name || '';
    } else {
      // 如果根据 id 找不到客户，尝试用 email 查找（如果 data.email 有值）
      if (data.email) {
        const { data: byEmail, error: emailErr } = await supabase
          .from('customers')
          .select('first_name, last_name, name, email, phone, company_name')
          .eq('site_id', siteId)
          .eq('email', data.email)
          .maybeSingle();
        if (!emailErr && byEmail) {
          console.log('[createInquiry] 通过 email 找到客户:', byEmail);
          const fullName = getFullName(byEmail.first_name, byEmail.last_name, byEmail.name, byEmail.email);
          customerName = data.name || fullName || '';
          customerEmail = data.email || byEmail.email || '';
          customerPhone = data.phone || byEmail.phone || '';
          customerCompany = data.company || byEmail.company_name || '';
          customerId = byEmail.id; // 修正 id
        } else {
          // 依然找不到，则使用传入的数据（但必须保证 email 非空）
          customerName = data.name || '';
          customerEmail = data.email || '';
          customerPhone = data.phone || '';
          customerCompany = data.company || '';
        }
      } else {
        // 无 email，无法继续
        throw new Error(`客户 ${customerId} 不存在，且未提供邮箱`);
      }
    }
  } else if (data.email) {
    // ---- 未提供 customer_id，但提供了 email ----
    const { data: existing, error: findErr } = await supabase
      .from('customers')
      .select('id, first_name, last_name, name, phone, company_name')
      .eq('site_id', siteId)
      .eq('email', data.email)
      .maybeSingle();

    if (findErr) throw new Error(`查找客户失败: ${findErr.message}`);

    if (existing) {
      customerId = existing.id;
      const fullName = getFullName(existing.first_name, existing.last_name, existing.name, data.email);
      customerName = data.name || fullName || '';
      customerEmail = data.email;
      customerPhone = data.phone || existing.phone || '';
      customerCompany = data.company || existing.company_name || '';
      console.log('[createInquiry] 已存在的客户:', existing);
    } else {
      // 自动注册新客户
      const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const { error: insertErr } = await supabase
        .from('customers')
        .insert({
          site_id: siteId,
          id: newId,
          first_name: '',
          last_name: '',
          name: data.name || '',
          email: data.email,
          phone: data.phone || '',
          company_name: data.company || '',
          source: 'register',
          created_at: new Date().toISOString(),
        });
      if (insertErr) throw new Error(`创建客户失败: ${insertErr.message}`);
      customerId = newId;
      customerName = data.name || data.email || '';
      customerEmail = data.email;
      customerPhone = data.phone || '';
      customerCompany = data.company || '';
      console.log('[createInquiry] 新注册客户:', { id: newId, email: data.email });
    }
  } else {
    // 未提供 customer_id 也未提供 email
    throw new Error('请提供客户ID或邮箱地址');
  }

  // ---- 2. 最终校验 ----
  if (!customerEmail) {
    console.error('[createInquiry] customerEmail 为空，当前状态:', {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
    });
    throw new Error('无法获取客户邮箱，请检查客户信息');
  }

  // ---- 3. 生成询盘编号 ----
  const { data: existingNumbers, error: numErr } = await supabase
    .from('inquiries')
    .select('inquiry_number')
    .eq('site_id', siteId);
  if (numErr) throw new Error(`查询编号失败: ${numErr.message}`);
  const usedNumbers = (existingNumbers || []).map(r => r.inquiry_number).filter(Boolean);
  const inquiryNumber = generateInquiryNumber(usedNumbers);
  const subject = `Inquiry No.: #${inquiryNumber}-${customerName || 'Visitor'}`;

  // ---- 4. 插入询盘 ----
  const { data: inquiry, error: insErr } = await supabase
    .from('inquiries')
    .insert({
      site_id: siteId,
      inquiry_number: inquiryNumber,
      customer_id: customerId,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      company: customerCompany,
      subject: subject,
      message: data.message,
      product_id: data.product_id || null,
      status: '待处理',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (insErr) {
    console.error('[createInquiry] 插入询盘失败:', insErr);
    throw new Error(`创建询盘失败: ${insErr.message}`);
  }

  // ---- 5. 插入首条回复 ----
  const { error: replyErr } = await supabase
    .from('inquiry_replies')
    .insert({
      inquiry_id: inquiry.id,
      site_id: siteId,
      sender_type: 'user',
      sender_email: customerEmail,
      sender_name: customerName,
      customer_id: customerId,
      content: data.message,
      is_internal: false,
      created_at: new Date().toISOString(),
    });

  if (replyErr) {
    console.error('[createInquiry] 插入回复失败:', replyErr);
    throw new Error(`创建回复失败: ${replyErr.message}`);
  }

  console.log('[createInquiry] 询盘创建成功:', inquiry.id);
  return inquiry;
}

// 辅助函数：获取客户姓名
async function getCustomerName(customerId: string | null, siteId: string): Promise<string | null> {
  if (!customerId) return null;
  const { data, error } = await supabase
    .from('customers')
    .select('name')
    .eq('site_id', siteId)
    .eq('id', customerId)
    .maybeSingle();
  if (error || !data) return null;
  return data.name || null;
}

// ---- 获取单个询盘（含回复和客户信息） ----
export async function getInquiryWithDetails(inquiryId: number) {
  const { data: inquiry, error: inqErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('id', inquiryId)
    .single();
  if (inqErr) throw new Error(`查询询盘失败: ${inqErr.message}`);

  const { data: replies, error: repErr } = await supabase
    .from('inquiry_replies')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true });
  if (repErr) throw new Error(`查询回复失败: ${repErr.message}`);

  let customer = null;
  if (inquiry.customer_id) {
    const { data: cust, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('id', inquiry.customer_id)
      .maybeSingle();
    if (!custErr) customer = cust;
  }

  return { inquiry, replies, customer };
}

// ---- 获取所有询盘（含关联客户简要信息） ----
export async function getAllInquiriesWithCustomer() {
  // 1. 获取所有询盘
  const { data: inquiries, error: inqErr } = await supabase
    .from('inquiries')
    .select('*')
    .eq('site_id', DEFAULT_SITE_ID)
    .order('created_at', { ascending: false });
  if (inqErr) throw new Error(`getAllInquiries failed: ${inqErr.message}`);

  if (!inquiries || inquiries.length === 0) {
    return [];
  }

  // 2. 提取所有非空的 customer_id
  const customerIds = inquiries
    .map(inq => inq.customer_id)
    .filter(id => id != null);

  let customersMap = new Map();
  if (customerIds.length > 0) {
    const { data: customers, error: custErr } = await supabase
      .from('customers')
      .select('*')
      .eq('site_id', DEFAULT_SITE_ID)
      .in('id', customerIds);
    if (custErr) throw new Error(`getCustomers failed: ${custErr.message}`);
    customersMap = new Map(customers.map(c => [c.id, c]));
  }

  // 3. 组合结果（将 customers 附加到每个 inquiry）
  return inquiries.map(inquiry => ({
    ...inquiry,
    customers: inquiry.customer_id ? customersMap.get(inquiry.customer_id) || null : null,
  }));
}

// ---- 更新询盘状态 ----
export async function updateInquiryStatus(id: number, status: string, siteId?: string): Promise<boolean> {
  const effectiveSiteId = siteId || DEFAULT_SITE_ID;
  console.log('[updateInquiryStatus] 更新条件:', { siteId: effectiveSiteId, id, status });

  const { data, error } = await supabase
    .from('inquiries')
    .update({ 
      status, 
      updated_at: new Date().toISOString() 
    })
    .eq('site_id', effectiveSiteId)
    .eq('id', id)
    .select('id'); // 选择至少一个字段以返回更新的行

  if (error) {
    console.error('[updateInquiryStatus] Supabase 错误:', error);
    throw new Error(`updateInquiryStatus failed: ${error.message}`);
  }

  const updated = data && data.length > 0;
  console.log('[updateInquiryStatus] 更新结果:', updated, '影响行数:', data?.length || 0);
  return updated;
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
  const { error } = await supabase
    .from('inquiry_replies')
    .insert({
      inquiry_id: data.inquiry_id,
      site_id: siteId,
      sender_type: data.sender_type,
      sender_email: data.sender_email,
      sender_name: data.sender_name || '',
      admin_id: data.admin_id || null,
      customer_id: data.customer_id || null,
      content: data.content,
      is_internal: data.is_internal || false,
      message_id: data.message_id || null,
      in_reply_to: data.in_reply_to || null,
      created_at: new Date().toISOString(),
    });
  if (error) throw new Error(`addReply failed: ${error.message}`);
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

  // 获取客户信息
  const { data: customer, error: custErr } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', siteId)
    .eq('id', data.customer_id)
    .single();
  if (custErr) throw new Error(`客户不存在: ${custErr.message}`);

  // 生成编号
  const { data: existingNumbers, error: numErr } = await supabase
    .from('inquiries')
    .select('inquiry_number')
    .eq('site_id', siteId);
  if (numErr) throw new Error(`查询编号失败: ${numErr.message}`);
  const usedNumbers = (existingNumbers || []).map(r => r.inquiry_number).filter(Boolean);
  const inquiryNumber = generateInquiryNumber(usedNumbers);

  const subject = `Inquiry No.: #${inquiryNumber}-${customer.name || customer.email || 'Customer'}`;

  // 插入询盘
  const { data: inquiry, error: insErr } = await supabase
    .from('inquiries')
    .insert({
      site_id: siteId,
      inquiry_number: inquiryNumber,
      customer_id: data.customer_id,
      name: customer.name || customer.email || '',
      email: customer.email,
      phone: customer.phone || '',
      company: customer.company_name || '',
      subject,
      message: data.message,
      product_id: data.product_id || null,
      status: '待处理',
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single();
  if (insErr) throw new Error(`创建询盘失败: ${insErr.message}`);

  // 添加管理员的首条回复（作为初始消息）
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