// lib/litechat/services/admin.service.ts
import { supabase } from '@/lib/supabase/client';

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
 * 北京时间 = UTC+8
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

/**
 * 获取当前 UTC 时间分钟数
 */
function getCurrentUTCMinutes(): number {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
}

/**
 * 获取管理员的实时在线状态（已修正时区）
 * - 管理员设置的时间按北京时间解读
 * - 服务器时间按 UTC 比较
 */
export function getAdminOnlineStatus(admin: AdminInfo): {
  status: 'online' | 'offline' | 'busy' | 'away';
  isOnline: boolean;
  statusText: string;
} {
  // 如果状态是 busy 或 away，直接返回
  if (admin.online_status === 'busy') {
    return { status: 'busy', isOnline: true, statusText: '忙碌' };
  }
  if (admin.online_status === 'away') {
    return { status: 'away', isOnline: false, statusText: '离开' };
  }
  if (admin.online_status === 'offline') {
    return { status: 'offline', isOnline: false, statusText: '离线' };
  }

  // online_status === 'online'，检查时间段
  const currentUTCMinutes = getCurrentUTCMinutes();
  const startUTCMinutes = beijingTimeToUTCMinutes(admin.online_start_time);
  const endUTCMinutes = beijingTimeToUTCMinutes(admin.online_end_time);

  let isInTimeRange = false;
  if (startUTCMinutes <= endUTCMinutes) {
    isInTimeRange = currentUTCMinutes >= startUTCMinutes && currentUTCMinutes <= endUTCMinutes;
  } else {
    // 跨天（如 22:00 - 06:00）
    isInTimeRange = currentUTCMinutes >= startUTCMinutes || currentUTCMinutes <= endUTCMinutes;
  }

  return {
    status: isInTimeRange ? 'online' : 'offline',
    isOnline: isInTimeRange,
    statusText: isInTimeRange ? '在线' : '离线',
  };
}

/**
 * 解析时间字符串为分钟数（保留，供其他场景使用）
 */
function parseTimeToMinutes(time: string): number {
  if (!time) return 0;
  const parts = time.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

/**
 * 通过管理员 ID 获取管理员信息
 */
export async function getAdminInfoById(adminId: string): Promise<AdminInfo | null> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, name, nickname, avatar_url, online_status, online_start_time, online_end_time, default_welcome, offline_reply')
    .eq('id', adminId)
    .maybeSingle();

  if (error || !data) {
    console.error('获取管理员信息失败:', error);
    return null;
  }
  return data;
}

/**
 * 获取会话的当前管理员信息（用于前台显示）
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
  const { data: conversation, error: convError } = await supabase
    .schema('chat')
    .from('conversations')
    .select('agent_id')
    .eq('id', conversationId)
    .maybeSingle();

  if (convError || !conversation) {
    console.error('获取会话失败:', convError);
    return null;
  }

  // 2. 如果会话未分配管理员，返回默认信息
  if (!conversation.agent_id) {
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
  const admin = await getAdminInfoById(conversation.agent_id);
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