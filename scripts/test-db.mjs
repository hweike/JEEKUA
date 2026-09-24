// scripts/test-db.mjs
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL 未配置');
  process.exit(1);
}

const masked = connectionString.replace(/:([^:@]+)@/, ':***@');
console.log('连接串:', masked);

const sql = postgres(connectionString, {
  max: 1,
  connect_timeout: 10,
  prepare: false,
});

try {
  const result = await sql`
    SELECT NOW() AS now, current_database() AS db, version() AS ver
  `;
  console.log('✅ 连接成功');
  console.log('时间:', result[0].now);
  console.log('数据库:', result[0].db);
  console.log('版本:', result[0].ver.split(',')[0]);
} catch (err) {
  console.error('❌ 连接失败');
  console.error('  message:', err.message);
  console.error('  code:', err.code);
  console.error('  errno:', err.errno);
  console.error('  syscall:', err.syscall);
  console.error('  address:', err.address);
  console.error('  port:', err.port);
  console.error('  stack:', err.stack);
  process.exit(1);
} finally {
  await sql.end();
}