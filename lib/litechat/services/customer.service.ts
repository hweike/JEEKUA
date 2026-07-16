// lib/litechat/services/customer.service.ts
import { supabase } from '@/lib/supabase/client';
import { getCustomerByEmailAndSource, createCustomer } from '@/lib/account/server';

const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

/**
 * 根据邮箱获取或创建客户（用于聊天）
 * - 如果客户已存在（任何 source），直接返回
 * - 如果不存在，创建一条 source = 'chat' 的记录
 * 
 * @param email 客户邮箱
 * @param name 客户姓名（可选）
 * @param siteId 站点ID（默认从环境变量读取）
 * @returns customers 记录
 */
export async function getOrCreateChatCustomer(
  email: string,
  name?: string,
  siteId: string = DEFAULT_SITE_ID
) {
  // 1. 先查找是否已存在
  const { data: existing, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('site_id', siteId)
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error('查询客户失败:', findError);
    throw new Error('查询客户失败');
  }

  if (existing) {
    // 如果客户存在但没有 name，且有传入 name，则更新
    if (name && !existing.name) {
      const { error: updateError } = await supabase
        .from('customers')
        .update({ name, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) {
        console.warn('更新客户名称失败:', updateError);
      }
    }
    return existing;
  }

  // 2. 不存在则创建
  // 判断是否为 visitor 格式
  const isVisitor = name?.startsWith('visitor_');
  let firstName = name || '';
  let lastName = '';
  
  if (isVisitor && name) {
    // 拆分 visitor_550e8400 → first_name: visitor, last_name: 550e8400
    const parts = name.split('_');
    if (parts.length === 2) {
      firstName = 'visitor';
      lastName = parts[1]; // 例如：550e8400
    } else {
      firstName = name;
    }
  } else if (name) {
    // 用户输入的姓名，存到 first_name
    firstName = name;
  }

  try {
    const newCustomer = await createCustomer(
      email,
      '', // country_code
      firstName,
      lastName,
      'chat', // source
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
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .maybeSingle();

  if (error) {
    console.error('获取客户失败:', error);
    return null;
  }
  return data;
}

/**
 * 检查客户是否存在（通过邮箱 + site_id）
 */
export async function customerExists(email: string, siteId: string = DEFAULT_SITE_ID) {
  const { data, error } = await supabase
    .from('customers')
    .select('id')
    .eq('site_id', siteId)
    .eq('email', email)
    .maybeSingle();

  if (error) return false;
  return !!data;
}