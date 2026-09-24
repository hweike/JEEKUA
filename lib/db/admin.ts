// lib/db/admin.ts
import 'server-only';
import postgres from 'postgres';

// ============================================================
// 1. 连接串
// ============================================================
const rawConnectionString = process.env.DATABASE_URL;

if (!rawConnectionString) {
  throw new Error('[db] DATABASE_URL 未配置');
}

const connectionString: string = rawConnectionString;

// ============================================================
// 2. 自动检测提供商
// ============================================================
type DbProvider = 'supabase-pooler' | 'supabase-direct' | 'tencent' | 'generic';

function detectProvider(url: string): DbProvider {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const port = parsed.port;

    if (host.includes('supabase.com') || host.includes('supabase.co')) {
      return port === '6543' ? 'supabase-pooler' : 'supabase-direct';
    }
    if (
      host.includes('tencentcdb.com') ||
      host.includes('tencentcloudapi.com') ||
      host.includes('.cdb.tencentcloud')
    ) {
      return 'tencent';
    }
    return 'generic';
  } catch {
    return 'generic';
  }
}

const provider = detectProvider(connectionString);

// ============================================================
// 3. 按提供商选连接池参数
// ============================================================
interface PoolSettings {
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
  prepare: boolean;
  ssl: boolean | 'require' | 'prefer';
}

function getPoolSettings(provider: DbProvider): PoolSettings {
  const base: PoolSettings = {
    max: 5,
    idle_timeout: 10,
    connect_timeout: 15,
    max_lifetime: 60,
    prepare: true,
    ssl: 'prefer',
  };

  switch (provider) {
    case 'supabase-pooler':
      return { ...base, max: 5, prepare: false, ssl: 'require' };
    case 'supabase-direct':
      return { ...base, max: 10, prepare: true, ssl: 'require' };
    case 'tencent':
      return { ...base, max: 10, prepare: true, ssl: 'prefer' };
    case 'generic':
    default:
      return base;
  }
}

const poolSettings = getPoolSettings(provider);

const finalSettings: PoolSettings = {
  max: parseInt(process.env.DB_POOL_MAX || String(poolSettings.max), 10),
  idle_timeout: parseInt(process.env.DB_IDLE_TIMEOUT || String(poolSettings.idle_timeout), 10),
  connect_timeout: parseInt(process.env.DB_CONNECT_TIMEOUT || String(poolSettings.connect_timeout), 10),
  max_lifetime: parseInt(process.env.DB_MAX_LIFETIME || String(poolSettings.max_lifetime), 10),
  prepare: process.env.DB_PREPARE === 'false' ? false : poolSettings.prepare,
  ssl: process.env.DB_SSL === 'false' ? false : poolSettings.ssl,
};

// ============================================================
// 4. 类型解析器（✅ 用 OID 作为 key，兼容所有 postgres 版本）
// ============================================================
// PostgreSQL OID 参考：
// - 1700: NUMERIC / DECIMAL
// - 20:   INT8 / BIGINT
// - 21:   INT2 / SMALLINT  (postgres 库默认已转 number)
// - 23:   INT4 / INTEGER   (postgres 库默认已转 number)
// - 700:  FLOAT4 / REAL
// - 701:  FLOAT8 / DOUBLE PRECISION
const customTypes = {
  // NUMERIC / DECIMAL (OID 1700) → number
  1700: {
    to: 1700,
    serialize: (x: number | string) => String(x),
    parse: (x: string) => {
      const num = parseFloat(x);
      return isNaN(num) ? 0 : num;
    },
  },
  // BIGINT / INT8 (OID 20) → number（超出安全整数范围则保留 string）
  20: {
    to: 20,
    serialize: (x: number | bigint | string) => String(x),
    parse: (x: string) => {
      const num = Number(x);
      return Number.isSafeInteger(num) ? num : x;
    },
  },
};

// ============================================================
// 5. 创建连接池
// ============================================================
const sql = postgres(connectionString, {
  max: finalSettings.max,
  idle_timeout: finalSettings.idle_timeout,
  connect_timeout: finalSettings.connect_timeout,
  max_lifetime: finalSettings.max_lifetime,
  prepare: finalSettings.prepare,
  ssl: finalSettings.ssl,
  onnotice: () => {},
  types: customTypes,
  transform: {
    undefined: null,
  },
});

// ============================================================
// 6. 健康检查 & 关闭
// ============================================================
export async function testConnection(): Promise<{
  ok: boolean;
  host: string;
  port: string;
  database: string;
  provider: DbProvider;
  error?: string;
}> {
  try {
    const parsed = new URL(connectionString);
    const result = await sql`SELECT 1 AS ok`;
    return {
      ok: result[0]?.ok === 1,
      host: parsed.hostname,
      port: parsed.port,
      database: parsed.pathname.slice(1),
      provider,
    };
  } catch (error: any) {
    let parsed: URL | null = null;
    try {
      parsed = new URL(connectionString);
    } catch {}
    return {
      ok: false,
      host: parsed?.hostname ?? 'unknown',
      port: parsed?.port ?? 'unknown',
      database: parsed?.pathname.slice(1) ?? 'unknown',
      provider,
      error: error?.message || String(error),
    };
  }
}

export async function closeDb(): Promise<void> {
  await sql.end({ timeout: 5 });
}

// ============================================================
// 7. 导出
// ============================================================
export default sql;
export { provider };