// lib/supabase/admin-client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 未配置');
}
if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY 未配置');
}

// ========== 日志节流（30 秒内同一 URL 只打一次） ==========
const lastWarnedAt = new Map<string, number>();
const WARN_THROTTLE_MS = 30_000;

function warnThrottled(key: string, message: string) {
  const now = Date.now();
  const last = lastWarnedAt.get(key) || 0;
  if (now - last < WARN_THROTTLE_MS) return;
  lastWarnedAt.set(key, now);
  console.warn(message);
}

// ========== 事件派发（供前端 Toast 监听） ==========
function dispatchTimeoutEvent(url: string, duration: number) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('supabase-timeout', {
      detail: { url: url.slice(0, 200), duration },
    })
  );
}
// ==========================================

const supabaseFetch = async (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {
  const startTime = Date.now();
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const duration = Date.now() - startTime;

    if (duration > 3000) {
      warnThrottled(
        `slow:${url.slice(0, 100)}`,
        `[SupabaseAdmin] Slow request (${duration}ms): ${url.slice(0, 120)}`
      );
    }

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    if (error?.name === 'AbortError') {
      warnThrottled(
        `timeout:${url.slice(0, 100)}`,
        `[SupabaseAdmin] Request timeout (${duration}ms), fallback to defaults: ${url.slice(0, 120)}`
      );
      dispatchTimeoutEvent(url, duration);
      throw new Error(`Supabase admin request timeout after ${duration}ms`);
    }

    warnThrottled(
      `fail:${url.slice(0, 100)}`,
      `[SupabaseAdmin] Request failed (${duration}ms): ${url.slice(0, 120)} - ${error?.message}`
    );
    dispatchTimeoutEvent(url, duration);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: {
    fetch: supabaseFetch,
  },
  db: {
    schema: 'public',
  },
});

export function getSupabaseAdminClient() {
  return supabaseAdmin;
}