// lib/account/verification.ts
import sql from '@/lib/db/admin';

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveVerificationCode(
  email: string,
  code: string,
  type: 'login' | 'register'
): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  try {
    await sql`
      INSERT INTO public.verification_codes (email, code, type, expires_at)
      VALUES (${email}, ${code}, ${type}, ${expiresAt})
    `;
  } catch (error: any) {
    throw new Error(`saveVerificationCode failed: ${error.message}`);
  }
}

export async function verifyCode(
  email: string,
  code: string,
  type: 'login' | 'register'
): Promise<boolean> {
  try {
    const rows = await sql<{ id: number }[]>`
      SELECT id FROM public.verification_codes
      WHERE email = ${email}
        AND code = ${code}
        AND type = ${type}
        AND expires_at > ${new Date().toISOString()}
      ORDER BY created_at DESC
      LIMIT 1
    `;
    if (!rows[0]) return false;

    // 使用后立即删除
    await sql`
      DELETE FROM public.verification_codes
      WHERE id = ${rows[0].id}
    `;
    return true;
  } catch {
    return false;
  }
}