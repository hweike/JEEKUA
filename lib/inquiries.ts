// lib/inquiries/index.ts
import { getPrivateStorage } from '@/lib/storage/factory';

// 私有桶中的基础前缀
const STORAGE_PREFIX = 'data/inquiries';

/**
 * 查找询盘文件在私有桶中的 Key（通过 ID）
 * @param id 询盘ID
 * @returns 存储 Key，如果未找到则返回 null
 */
async function findInquiryKey(id: string): Promise<string | null> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_PREFIX}/`;
  try {
    const keys = await storage.list(prefix);
    // 查找以 `${id}.json` 结尾的文件（路径格式：.../年/月/${id}.json）
    const targetKey = keys.find(key => key.endsWith(`/${id}.json`));
    return targetKey || null;
  } catch (error) {
    console.error('查找询盘文件失败:', error);
    return null;
  }
}

/**
 * 保存询盘
 * @param inquiry 询盘数据（不含 id, createdAt, read 字段）
 * @returns 生成的询盘 ID
 */
export async function saveInquiry(inquiry: any): Promise<string> {
  const timestamp = new Date().toISOString();
  const year = timestamp.slice(0, 4);
  const month = timestamp.slice(5, 7);
  const id = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const key = `${STORAGE_PREFIX}/${year}/${month}/${id}.json`;

  const data = {
    id,
    createdAt: timestamp,
    read: false,
    ...inquiry,
  };

  const storage = getPrivateStorage();
  await storage.write(key, JSON.stringify(data, null, 2), {
    contentType: 'application/json',
  });
  return id;
}

/**
 * 获取所有询盘（按时间倒序）
 */
export async function getInquiries(): Promise<any[]> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_PREFIX}/`;
  const inquiries: any[] = [];

  try {
    const keys = await storage.list(prefix);
    const jsonKeys = keys.filter(key => key.endsWith('.json'));

    for (const key of jsonKeys) {
      try {
        const content = await storage.read(key, 'utf8');
        const data = JSON.parse(content as string);
        inquiries.push(data);
      } catch (err) {
        console.error(`读取询盘文件失败: ${key}`, err);
      }
    }
  } catch (error: any) {
    if (!(error?.message?.includes('File not found') || error?.code === 'NoSuchKey')) {
      console.error('获取询盘列表失败:', error);
    }
    // 目录不存在时返回空数组
    return [];
  }

  // 按创建时间倒序排列
  return inquiries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * 获取单个询盘
 * @param id 询盘ID
 */
export async function getInquiryById(id: string): Promise<any | null> {
  const key = await findInquiryKey(id);
  if (!key) return null;

  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (err) {
    console.error(`读取询盘 ${id} 失败:`, err);
    return null;
  }
}

/**
 * 标记询盘为已读
 * @param id 询盘ID
 * @returns 是否成功
 */
export async function markAsRead(id: string): Promise<boolean> {
  const key = await findInquiryKey(id);
  if (!key) return false;

  const storage = getPrivateStorage();
  try {
    const content = await storage.read(key, 'utf8');
    const data = JSON.parse(content as string);
    data.read = true;
    await storage.write(key, JSON.stringify(data, null, 2), {
      contentType: 'application/json',
    });
    return true;
  } catch (err) {
    console.error(`更新询盘 ${id} 失败:`, err);
    return false;
  }
}