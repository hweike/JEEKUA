// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables');
}

// ========== 自定义 fetch：超时控制 + 监控 ==========
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

  // 10 秒超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(input, {
      ...init,
      signal: controller.signal,
    });

    const duration = Date.now() - startTime;

    // 记录慢请求（> 3秒）
    if (duration > 3000) {
      console.warn(`[Supabase] 慢请求 (${duration}ms): ${url.slice(0, 120)}`);
    }

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;

    if (error?.name === 'AbortError') {
      console.error(`[Supabase] 请求超时 (${duration}ms): ${url.slice(0, 120)}`);
      throw new Error(`Supabase request timeout after ${duration}ms`);
    }

    console.error(`[Supabase] 请求失败 (${duration}ms): ${url.slice(0, 120)}`, error?.message);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};
// ========================================================

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: supabaseFetch,
  },
});