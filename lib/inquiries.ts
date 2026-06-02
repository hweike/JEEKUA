import fs from 'fs/promises';
import path from 'path';

const INQUIRIES_DIR = path.join(process.cwd(), 'data', 'inquiries');

// 保存询盘
export async function saveInquiry(inquiry: any) {
  const timestamp = new Date().toISOString();
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(5, 7);
  const dir = path.join(INQUIRIES_DIR, year, month);
  await fs.mkdir(dir, { recursive: true });

  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const filePath = path.join(dir, `${id}.json`);
  const data = {
    id,
    createdAt: timestamp,
    read: false,
    ...inquiry,
  };
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return id;
}

// 获取所有询盘（按时间倒序）
export async function getInquiries() {
  const inquiries: any[] = [];
  try {
    const years = await fs.readdir(INQUIRIES_DIR);
    for (const year of years) {
      const yearDir = path.join(INQUIRIES_DIR, year);
      const months = await fs.readdir(yearDir);
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const files = await fs.readdir(monthDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(monthDir, file);
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            inquiries.push(data);
          }
        }
      }
    }
  } catch (err) {
    // 目录不存在时返回空数组
    if (err.code !== 'ENOENT') console.error('读取询盘失败:', err);
  }
  // 按创建时间倒序排列
  return inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// 获取单个询盘
export async function getInquiryById(id: string) {
  // 遍历所有年份月份查找
  try {
    const years = await fs.readdir(INQUIRIES_DIR);
    for (const year of years) {
      const yearDir = path.join(INQUIRIES_DIR, year);
      const months = await fs.readdir(yearDir);
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const filePath = path.join(monthDir, `${id}.json`);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          return JSON.parse(content);
        } catch {}
      }
    }
  } catch {}
  return null;
}

// 标记询盘为已读
export async function markAsRead(id: string) {
  // 先找到文件
  try {
    const years = await fs.readdir(INQUIRIES_DIR);
    for (const year of years) {
      const yearDir = path.join(INQUIRIES_DIR, year);
      const months = await fs.readdir(yearDir);
      for (const month of months) {
        const monthDir = path.join(yearDir, month);
        const filePath = path.join(monthDir, `${id}.json`);
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          data.read = true;
          await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
          return true;
        } catch {}
      }
    }
  } catch {}
  return false;
}