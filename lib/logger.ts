// lib/logger.ts
import { supabase } from '@/lib/supabase/client';

export interface LoginLog {
  id?: number;
  timestamp: string;
  type: 'login';
  email: string;
  ip: string;
  userAgent: string;
  success: boolean;
  message?: string;
}

export interface AdminLog {
  id?: number;
  timestamp: string;
  type: 'admin';
  operatorEmail: string;
  action: 'add' | 'delete';
  targetEmail: string;
  targetName: string;
  ip: string;
  userAgent: string;
}

export interface MenuLog {
  id?: number;
  timestamp: string;
  type: 'menu';
  email: string;
  path: string;
  menuName: string;
  ip: string;
  userAgent: string;
}

export type AnyLog = LoginLog | AdminLog | MenuLog;

/**
 * 记录登录日志
 */
export async function logLogin(
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  message?: string
): Promise<void> {
  await supabase.from('admin_logs').insert({
    timestamp: new Date().toISOString(),
    type: 'login',
    email,
    ip,
    user_agent: userAgent,
    success,
    message,
  });
}

/**
 * 记录管理员操作日志（添加/删除管理员）
 */
export async function logAdminAction(
  operatorEmail: string,
  action: 'add' | 'delete',
  targetEmail: string,
  targetName: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await supabase.from('admin_logs').insert({
    timestamp: new Date().toISOString(),
    type: 'admin',
    operator_email: operatorEmail,
    action,
    target_email: targetEmail,
    target_name: targetName,
    ip,
    user_agent: userAgent,
  });
}

/**
 * 记录菜单访问日志
 */
export async function logMenuAccess(
  email: string,
  path: string,
  menuName: string,
  ip: string,
  userAgent: string
): Promise<void> {
  await supabase.from('admin_logs').insert({
    timestamp: new Date().toISOString(),
    type: 'menu',
    email,
    path,
    menu_name: menuName,
    ip,
    user_agent: userAgent,
  });
}

/**
 * 读取日志（分页、筛选）
 * @param options.type - 筛选类型 ('login', 'admin', 'menu')
 * @param options.startDate - ISO 日期字符串 (YYYY-MM-DD)
 * @param options.endDate - ISO 日期字符串 (YYYY-MM-DD)
 * @param options.page - 页码，从1开始
 * @param options.limit - 每页条数
 */
export async function getLogs(options: {
  type?: 'login' | 'admin' | 'menu';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: AnyLog[]; total: number; page: number; limit: number }> {
  const { type, startDate, endDate, page = 1, limit = 50 } = options;
  let query = supabase
    .from('admin_logs')
    .select('*', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }
  if (startDate) {
    // 筛选日期 ≥ startDate 00:00:00
    query = query.gte('timestamp', `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    // 筛选日期 ≤ endDate 23:59:59
    query = query.lte('timestamp', `${endDate}T23:59:59Z`);
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Failed to fetch logs from Supabase:', error);
    return { logs: [], total: 0, page, limit };
  }

  // 将数据库字段映射回原有的日志对象结构
  const logs: AnyLog[] = (data || []).map((row: any) => {
    const base = {
      timestamp: row.timestamp,
      type: row.type,
    };
    if (row.type === 'login') {
      return {
        ...base,
        email: row.email,
        ip: row.ip,
        userAgent: row.user_agent,
        success: row.success,
        message: row.message,
      } as LoginLog;
    } else if (row.type === 'admin') {
      return {
        ...base,
        operatorEmail: row.operator_email,
        action: row.action,
        targetEmail: row.target_email,
        targetName: row.target_name,
        ip: row.ip,
        userAgent: row.user_agent,
      } as AdminLog;
    } else {
      // type === 'menu'
      return {
        ...base,
        email: row.email,
        path: row.path,
        menuName: row.menu_name,
        ip: row.ip,
        userAgent: row.user_agent,
      } as MenuLog;
    }
  });

  return { logs, total: count || 0, page, limit };
}