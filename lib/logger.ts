// lib/logger.ts
import fs from 'fs/promises';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'data', 'logs');

let lastCleanTime = 0;
const CLEAN_INTERVAL = 3600000; // 1小时

// 确保日志目录存在
async function ensureLogDir() {
  try {
    await fs.access(LOG_DIR);
  } catch {
    await fs.mkdir(LOG_DIR, { recursive: true });
  }
}

// 清理超过 maxDays 天的日志文件
async function cleanOldLogs(maxDays = 7) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffDate = cutoff.toISOString().split('T')[0];
  const files = await fs.readdir(LOG_DIR);
  for (const file of files) {
    const match = file.match(/-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (match && match[1] < cutoffDate) {
      await fs.unlink(path.join(LOG_DIR, file)).catch(console.error);
    }
  }
}

// 通用日志写入
async function writeLog(type: 'login' | 'admin' | 'menu', data: any) {
  await ensureLogDir();
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${type}-${date}.jsonl`;
  const filePath = path.join(LOG_DIR, fileName);
  const logLine = JSON.stringify({ timestamp: new Date().toISOString(), type, ...data }) + '\n';
  await fs.appendFile(filePath, logLine, 'utf-8');
  
  // 每小时最多清理一次
  const now = Date.now();
  if (now - lastCleanTime > CLEAN_INTERVAL) {
    lastCleanTime = now;
    await cleanOldLogs(7);
  }
}

// 记录登录日志
export async function logLogin(
  email: string,
  ip: string,
  userAgent: string,
  success: boolean,
  message?: string
) {
  await writeLog('login', { email, ip, userAgent, success, message });
}

// 记录管理员操作日志（添加/删除）
export async function logAdminAction(
  operatorEmail: string,
  action: 'add' | 'delete',
  targetEmail: string,
  targetName: string,
  ip: string,
  userAgent: string
) {
  await writeLog('admin', { operatorEmail, action, targetEmail, targetName, ip, userAgent });
}

// 记录菜单访问日志
export async function logMenuAccess(
  email: string,
  path: string,
  menuName: string,
  ip: string,
  userAgent: string
) {
  await writeLog('menu', { email, path, menuName, ip, userAgent });
}

// 读取日志（分页、筛选）
export async function getLogs(options: {
  type?: 'login' | 'admin' | 'menu';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { type, startDate, endDate, page = 1, limit = 50 } = options;
  const files = await fs.readdir(LOG_DIR);
  
  const relevantFiles = files.filter(f => {
    if (type && !f.startsWith(type)) return false;
    const match = f.match(/-(\d{4}-\d{2}-\d{2})\.jsonl$/);
    if (!match) return false;
    const fileDate = match[1];
    if (startDate && fileDate < startDate) return false;
    if (endDate && fileDate > endDate) return false;
    return true;
  });

  let allLogs: any[] = [];
  for (const file of relevantFiles) {
    const content = await fs.readFile(path.join(LOG_DIR, file), 'utf-8');
    const lines = content.trim().split('\n').filter(l => l);
    const logs = lines.map(line => JSON.parse(line));
    allLogs.push(...logs);
  }

  allLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const total = allLogs.length;
  const paginated = allLogs.slice((page - 1) * limit, page * limit);
  return { logs: paginated, total, page, limit };
}