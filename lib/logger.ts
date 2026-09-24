// lib/logger.ts
import sql from '@/lib/db/admin';

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
  try {
    await sql`
      INSERT INTO public.admin_logs (timestamp, type, email, ip, user_agent, success, message)
      VALUES (${new Date().toISOString()}, 'login', ${email}, ${ip}, ${userAgent}, ${success}, ${message ?? null})
    `;
  } catch (error) {
    console.error('[logLogin] 写入失败:', error);
  }
}

/**
 * 记录管理员操作日志
 */
export async function logAdminAction(
  operatorEmail: string,
  action: 'add' | 'delete',
  targetEmail: string,
  targetName: string,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    await sql`
      INSERT INTO public.admin_logs (
        timestamp, type, operator_email, action, target_email, target_name, ip, user_agent
      ) VALUES (
        ${new Date().toISOString()}, 'admin', ${operatorEmail}, ${action},
        ${targetEmail}, ${targetName}, ${ip}, ${userAgent}
      )
    `;
  } catch (error) {
    console.error('[logAdminAction] 写入失败:', error);
  }
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
  try {
    await sql`
      INSERT INTO public.admin_logs (timestamp, type, email, path, menu_name, ip, user_agent)
      VALUES (${new Date().toISOString()}, 'menu', ${email}, ${path}, ${menuName}, ${ip}, ${userAgent})
    `;
  } catch (error) {
    console.error('[logMenuAccess] 写入失败:', error);
  }
}

/**
 * 读取日志（分页、筛选）
 */
export async function getLogs(options: {
  type?: 'login' | 'admin' | 'menu';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}): Promise<{ logs: AnyLog[]; total: number; page: number; limit: number }> {
  const { type, startDate, endDate, page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  // 动态 WHERE
  const conditions: any[] = [];
  if (type) conditions.push(sql`type = ${type}`);
  if (startDate) conditions.push(sql`timestamp >= ${`${startDate}T00:00:00Z`}`);
  if (endDate) conditions.push(sql`timestamp <= ${`${endDate}T23:59:59Z`}`);

  const whereClause = conditions.length > 0
    ? conditions.reduce((acc, c, i) => (i === 0 ? c : sql`${acc} AND ${c}`), sql``)
    : sql`TRUE`;

  try {
    // 总数
    const countRows = await sql<{ count: string }[]>`
      SELECT COUNT(*)::text AS count FROM public.admin_logs
      WHERE ${whereClause}
    `;
    const total = parseInt(countRows[0]?.count || '0', 10);

    // 数据
    const rows = await sql<any[]>`
      SELECT * FROM public.admin_logs
      WHERE ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const logs: AnyLog[] = rows.map((row: any) => {
      const base = { timestamp: row.timestamp, type: row.type };
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

    return { logs, total, page, limit };
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    return { logs: [], total: 0, page, limit };
  }
}