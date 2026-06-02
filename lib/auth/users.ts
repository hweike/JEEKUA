// lib/auth/users.ts
import fs from 'fs/promises';
import path from 'path';
import { hashPassword } from './password';

export interface User {
  id: string;
  email: string;
  name: string;
  englishName: string;
  passwordHash: string;
  createdAt: string;
  mustChangePassword: boolean;
  role: 'super' | 'admin';  // 新增：super=超级管理员，admin=普通管理员
}

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

async function ensureDataDir() { /* 同之前 */ }

export async function getUsers(): Promise<User[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    // 默认管理员：邮箱 admin@admin.com，密码 admin123
    const defaultAdmin: User = {
      id: '1',
      email: 'admin@admin.com',
      name: '超级管理员',
      englishName: 'Admin',
      passwordHash: await hashPassword('admin123'),
      createdAt: new Date().toISOString(),
      mustChangePassword: true,
      role: 'super',   // 设置为超级管理员
    };

    await fs.writeFile(USERS_FILE, JSON.stringify([defaultAdmin], null, 2));
    return [defaultAdmin];
  }
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const users = await getUsers();
  return users.find(u => u.email === email);
}

export async function addUser(email: string, name: string, englishName: string, plainPassword: string): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  if (users.length >= 3) return { success: false, error: '最多只能创建 3 个管理员账号' };
  if (users.some(u => u.email === email)) return { success: false, error: '邮箱已存在' };
  const passwordHash = await hashPassword(plainPassword);
  const newUser: User = {
    id: Date.now().toString(),
    email,
    name,
    englishName,
    passwordHash,
    createdAt: new Date().toISOString(),
    mustChangePassword: true, // 新账号首次登录强制改密码
    role: 'admin',
  };
  users.push(newUser);
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  return { success: true };
}

export async function deleteUser(id: string): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  if (users.length <= 1) return { success: false, error: '至少保留一个管理员账号' };
  const newUsers = users.filter(u => u.id !== id);
  if (newUsers.length === users.length) return { success: false, error: '用户不存在' };
  await fs.writeFile(USERS_FILE, JSON.stringify(newUsers, null, 2));
  return { success: true };
}

export async function updatePassword(email: string, newPasswordHash: string): Promise<void> {
  const users = await getUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    user.passwordHash = newPasswordHash;
    user.mustChangePassword = false;
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  }
}

export async function updateUserProfile(email: string, data: { name: string; englishName: string; email: string }): Promise<{ success: boolean; error?: string }> {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) return { success: false, error: '用户不存在' };
  // 如果修改了邮箱，检查新邮箱是否已被其他用户使用
  if (data.email !== email && users.some(u => u.email === data.email)) {
    return { success: false, error: '新邮箱已被占用' };
  }
  users[userIndex].name = data.name;
  users[userIndex].englishName = data.englishName;
  users[userIndex].email = data.email;
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
  return { success: true };
}