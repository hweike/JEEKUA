import { getDb } from '../lib/db';

const db = getDb();

// 清空 Discovery 相关表（保留表结构）
db.exec(`DELETE FROM pages;`);
db.exec(`DELETE FROM page_contents;`);
db.exec(`DELETE FROM site_configs;`);
db.exec(`DELETE FROM sync_logs;`);

console.log('✅ 已清空 pages, page_contents, site_configs, sync_logs 表');
process.exit(0);