// lib/supabase/client.ts
// ⚠️ 此文件仅用于 Supabase Realtime（LiteChat 实时推送）
// 数据查询已 100% 迁移到 postgres 直连（lib/db/admin.ts）
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables'
  );
}

/**
 * Supabase 客户端实例
 *
 * 用途：仅用于 Supabase Realtime（WebSocket）—— LiteChat 的实时消息推送
 *
 * 数据查询请不要使用此客户端：
 *   ❌ supabase.from('xxx').select()  ← 走 REST，会被 Cloudflare 拦截
 *   ✅ import sql from '@/lib/db/admin'; await sql`SELECT * FROM xxx`  ← 直连 PG
 *
 * 未来迁移腾讯云时：
 *   - 数据查询：改 DATABASE_URL
 *   - 实时推送：自托管 Supabase Realtime，改 NEXT_PUBLIC_SUPABASE_URL 指向自托管服务
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});