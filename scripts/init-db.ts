import getDb from '../lib/db';

// 这会触发数据库初始化，创建所有表
getDb();
console.log('Database initialized');