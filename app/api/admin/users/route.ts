// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/jwt';
import { getUsers, addUser, deleteUser, findUserByEmail } from '@/lib/auth/users';
import { logAdminAction } from '@/lib/logger';

// 辅助函数：检查当前用户是否为超级管理员
async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  const payload = await getCurrentUser(request);
  if (!payload) return false;
  const user = await findUserByEmail(payload.username);
  return user?.role === 'super';
}

// 获取所有用户（仅超级管理员可访问）
export async function GET(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const users = await getUsers();
  const safeUsers = users.map(({ id, email, name, englishName, createdAt, mustChangePassword }) => ({
    id,
    email,
    name,
    englishName,
    createdAt,
    mustChangePassword,
  }));
  return NextResponse.json(safeUsers);
}

// 添加新用户（仅超级管理员可访问）
export async function POST(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { email, name, englishName, password } = await request.json();
  if (!email || !name || !englishName || !password) {
    return NextResponse.json({ error: '邮箱、姓名、英文名和密码都不能为空' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: '密码长度至少6位' }, { status: 400 });
  }

  const result = await addUser(email, name, englishName, password);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 记录管理员操作日志
  const payload = await getCurrentUser(request);
  const operatorEmail = payload.username;
  // 增强 IP 获取逻辑
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() 
        : request.headers.get('x-real-ip') 
        || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  await logAdminAction(operatorEmail, 'add', email, name, ip, userAgent);

  return NextResponse.json({ success: true });
}

// 删除用户（仅超级管理员可访问，且不能删除自己）
export async function DELETE(request: NextRequest) {
  if (!(await isSuperAdmin(request))) {
    return NextResponse.json({ error: '无权限' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
  }

  // 获取被删除用户的信息（在删除前）
  const users = await getUsers();
  const targetUser = users.find(u => u.id === id);
  if (!targetUser) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  // 获取当前登录用户信息
  const payload = await getCurrentUser(request);
  const currentUser = await findUserByEmail(payload.username);
  if (currentUser.id === id) {
    return NextResponse.json({ error: '不能删除自己的账号' }, { status: 403 });
  }

  const result = await deleteUser(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // 记录管理员操作日志
  const operatorEmail = payload.username;
  // 增强 IP 获取逻辑
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() 
        : request.headers.get('x-real-ip') 
        || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  await logAdminAction(operatorEmail, 'delete', targetUser.email, targetUser.name, ip, userAgent);

  return NextResponse.json({ success: true });
}