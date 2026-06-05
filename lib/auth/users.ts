// lib/auth/users.ts
import { hashPassword } from './password';
import { getPrivateStorage } from '@/lib/storage/factory'; // 根据你的实际路径调整

export interface User {
  id: string;
  email: string;
  name: string;
  englishName: string;
  passwordHash: string;
  createdAt: string;
  mustChangePassword: boolean;
  role: 'super' | 'admin';
}

// 在私有桶中的存储 key（去掉 data/ 前缀）
const USERS_KEY = 'users.json';

/**
 * 读取用户列表（从私有桶）
 */
export async function getUsers(): Promise<User[]> {
  const storage = getPrivateStorage();
  try {
    const content = await storage.read(`data/${USERS_KEY}`, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    // 文件不存在或读取失败 → 初始化默认管理员
    console.warn('Users file not found in R2, creating default admin...', error?.message);
    const defaultAdmin: User = {
      id: '1',
      email: 'admin@admin.com',
      name: '超级管理员',
      englishName: 'Admin',
      passwordHash: await hashPassword('admin123'),
      createdAt: new Date().toISOString(),
      mustChangePassword: true,
      role: 'super',
    };
    const users = [defaultAdmin];
    // 写入私有桶
    await storage.write(`data/${USERS_KEY}`, JSON.stringify(users, null, 2), {
      contentType: 'application/json',
    });
    return users;
  }
}

/**
 * 保存用户列表到私有桶
 */
async function saveUsers(users: User[]): Promise<void> {
  const storage = getPrivateStorage();
  await storage.write(`data/${USERS_KEY}`, JSON.stringify(users, null, 2), {
    contentType: 'application/json',
  });
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.email === email);
}

export async function addUser(
  email: string,
  name: string,
  englishName: string,
  plainPassword: string
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  if (users.length >= 3) {
    return { success: false, error: '最多只能创建 3 个管理员账号' };
  }
  if (users.some(u => u.email === email)) {
    return { success: false, error: '邮箱已存在' };
  }
  const passwordHash = await hashPassword(plainPassword);
  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    englishName,
    passwordHash,
    createdAt: new Date().toISOString(),
    mustChangePassword: true,
    role: 'admin',
  };
  users.push(newUser);
  await saveUsers(users);
  return { success: true };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  if (users.length <= 1) {
    return { success: false, error: '至少保留一个管理员账号' };
  }
  const newUsers = users.filter(u => u.id !== id);
  if (newUsers.length === users.length) {
    return { success: false, error: '用户不存在' };
  }
  await saveUsers(newUsers);
  return { success: true };
}

export async function updatePassword(email: string, newPasswordHash: string): Promise<void> {
  const users = await getUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false;
    await saveUsers(users);
  }
}

export async function updateUserProfile(
  email: string,
  data: { name: string; englishName: string; email: string }
): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) {
    return { success: false, error: '用户不存在' };
  }
  // 如果修改了邮箱，检查新邮箱是否已被其他用户使用
  if (data.email !== email && users.some(u => u.email === data.email)) {
    return { success: false, error: '新邮箱已被占用' };
  }
  users[userIndex].name = data.name;
  users[userIndex].englishName = data.englishName;
  users[userIndex].email = data.email;
  await saveUsers(users);
  return { success: true };
}