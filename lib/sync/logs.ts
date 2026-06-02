import fs from 'fs';
import path from 'path';

const LOGS_DIR = path.join(process.cwd(), 'data', 'sync-logs');
const LOGS_FILE = path.join(LOGS_DIR, 'logs.json');

export interface SyncLog {
  id: string;
  syncType: string;   // page, menu, header, footer, videoCategory, video, productCategory, product, doc, blog, blogPost
  sourceLocale: string;
  targetLocale: string;
  status: 'success' | 'failed';
  errorMsg?: string;
  operator: string;
  createdAt: string;
  itemId?: string;
}

export function addLog(log: SyncLog) {
  if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });
  let logs: SyncLog[] = [];
  if (fs.existsSync(LOGS_FILE)) {
    logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  }
  logs.unshift(log);
  if (logs.length > 1000) logs = logs.slice(0, 1000);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs, null, 2));
}

export function getLogs(filter?: Partial<SyncLog>): SyncLog[] {
  if (!fs.existsSync(LOGS_FILE)) return [];
  let logs = JSON.parse(fs.readFileSync(LOGS_FILE, 'utf-8'));
  if (filter) {
    logs = logs.filter(l => 
      (!filter.syncType || l.syncType === filter.syncType) &&
      (!filter.targetLocale || l.targetLocale === filter.targetLocale) &&
      (!filter.sourceLocale || l.sourceLocale === filter.sourceLocale)
    );
  }
  return logs;
}

export function clearLogsByType(syncType: string): void {
  const logs = getLogs(); // 获取所有日志
  const filtered = logs.filter(log => log.syncType !== syncType);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(filtered, null, 2));
}