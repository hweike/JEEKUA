// lib/umami/client.ts

const UMAMI_API_URL = process.env.UMAMI_API_URL;
const UMAMI_USERNAME = process.env.UMAMI_USERNAME;
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD;
const VERIFICATION_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!UMAMI_API_URL || !UMAMI_USERNAME || !UMAMI_PASSWORD) {
  console.warn('[Umami] 环境变量未完全配置: UMAMI_API_URL, UMAMI_USERNAME, UMAMI_PASSWORD 必须设置');
}

interface AuthResponse {
  token: string;
  user?: {
    id: string;
    username: string;
    role?: string;
  };
}

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  if (!UMAMI_API_URL || !UMAMI_USERNAME || !UMAMI_PASSWORD) {
    throw new Error('[Umami] 认证凭证未配置');
  }

  try {
    // ✅ 构建请求头，包含 Vercel 绕过密钥
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (VERIFICATION_SECRET) {
      headers['x-vercel-protection-bypass'] = VERIFICATION_SECRET;
    }

    const response = await fetch(`${UMAMI_API_URL}/api/auth/login`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        username: UMAMI_USERNAME,
        password: UMAMI_PASSWORD,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Umami 认证失败 (${response.status}): ${errorText}`);
    }

    const data: AuthResponse = await response.json();
    cachedToken = data.token;
    // 设置过期时间为 25 天后 (Token 实际有效期 30 天)
    tokenExpiry = Date.now() + 25 * 24 * 60 * 60 * 1000;
    return cachedToken;
  } catch (error) {
    console.error('[Umami] 获取 Token 失败:', error);
    throw error;
  }
}

export async function fetchUmami<T = any>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = await getToken();
  const url = `${UMAMI_API_URL}${endpoint}`;

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  // ✅ 添加 Vercel 部署保护绕过头（虽然已经在 getToken 中添加，但为了保险也加上）
  if (VERIFICATION_SECRET) {
    headers['x-vercel-protection-bypass'] = VERIFICATION_SECRET;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = '无法获取错误详情';
    }
    throw new Error(`Umami API 错误 (${response.status}): ${errorText}`);
  }

  return response.json();
}

export function clearTokenCache(): void {
  cachedToken = null;
  tokenExpiry = null;
}