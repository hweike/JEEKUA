// lib/litechat/services/admin.service.ts
import sql from '@/lib/db/admin';

export interface AdminInfo {
  id: string;
  email: string;
  name: string;
  nickname?: string;
  avatar_url?: string;
  online_status: 'online' | 'offline' | 'busy' | 'away';
  online_start_time: string;
  online_end_time: string;
  default_welcome: string;
  offline_reply: string;
}

/**
 * 将北京时间字符串转换为 UTC 时间分钟数
 */
function beijingTimeToUTCMinutes(beijingTime: string): number {
  if (!beijingTime) return 0;
  const [hours, minutes] = beijingTime.split(':').map(Number);
  let utcHours = hours - 8;
  if (utcHours < 0) {
    utcHours += 24;
  }
  return utcHours * 60 + minutes;
}

function getCurrentUTCMinutes(): number {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

/**
 * 获取管理员的实时在线状态
 */
export function getAdminOnlineStatus(admin: AdminInfo): {
  status: 'online' | 'offline' | 'busy' | 'away';
  isOnline: boolean;
  statusText: string;
} {
  if (admin.online_status === 'busy') {
    return { status: 'busy', isOnline: true, statusText: '忙碌' };
  }
  if (admin.online_status === 'away') {
    return { status: 'away', isOnline: false, statusText: '离开' };
  }
  if (admin.online_status === 'offline') {
    return { status: 'offline', isOnline: false, statusText: '离线' };
  }

  const currentUTCMinutes = getCurrentUTCMinutes();
  const startUTCMinutes = beijingTimeToUTCMinutes(admin.online_start_time);
  const endUTCMinutes = beijingTimeToUTCMinutes(admin.online_end_time);

  let isInTimeRange = false;
  if (startUTCMinutes <= endUTCMinutes) {
    isInTimeRange = currentUTCMinutes >= startUTCMinutes && currentUTCMinutes <= endUTCMinutes;
  } else {
    isInTimeRange = currentUTCMinutes >= startUTCMinutes || currentUTCMinutes <= endUTCMinutes;
  }

  return {
    status: isInTimeRange ? 'online' : 'offline',
    isOnline: isInTimeRange,
    statusText: isInTimeRange ? '在线' : '离线',
  };
}

/**
 * 通过管理员 ID 获取管理员信息
 */
export async function getAdminInfoById(adminId: string): Promise<AdminInfo | null> {
  try {
    const rows = await sql<AdminInfo[]>`
      SELECT id, email, name, nickname, avatar_url, online_status,
             online_start_time, online_end_time, default_welcome, offline_reply
      FROM public.admin_users
      WHERE id = ${adminId}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    return null;
  }
}

/**
 * 获取会话的当前管理员信息
 */
export async function getConversationAdminInfo(conversationId: string): Promise<{
  admin: AdminInfo | null;
  displayName: string;
  avatarUrl: string | null;
  onlineStatus: 'online' | 'offline' | 'busy' | 'away';
  isOnline: boolean;
  statusText: string;
} | null> {
  // 1. 获取会话信息
  let agentId: string | null = null;
  try {
    const rows = await sql<{ agent_id: string | null }[]>`
      SELECT agent_id FROM chat.conversations
      WHERE id = ${conversationId}
      LIMIT 1
    `;
    if (!rows[0]) {
      console.error('获取会话失败: 会话不存在');
      return null;
    }
    agentId = rows[0].agent_id;
  } catch (error) {
    console.error('获取会话失败:', error);
    return null;
  }

  // 2. 未分配管理员
  if (!agentId) {
    return {
      admin: null,
      displayName: '客服团队',
      avatarUrl: null,
      onlineStatus: 'online',
      isOnline: true,
      statusText: '在线',
    };
  }

  // 3. 获取管理员信息
  const admin = await getAdminInfoById(agentId);
  if (!admin) {
    return {
      admin: null,
      displayName: '客服团队',
      avatarUrl: null,
      onlineStatus: 'online',
      isOnline: true,
      statusText: '在线',
    };
  }

  const onlineInfo = getAdminOnlineStatus(admin);

  return {
    admin,
    displayName: admin.nickname || admin.name,
    avatarUrl: admin.avatar_url || null,
    onlineStatus: onlineInfo.status,
    isOnline: onlineInfo.isOnline,
    statusText: onlineInfo.statusText,
  };
}