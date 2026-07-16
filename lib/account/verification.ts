import { supabase } from '@/lib/supabase/client';

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveVerificationCode(email: string, code: string, type: 'login' | 'register'): Promise<void> {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('verification_codes')
    .insert({ email, code, type, expires_at: expiresAt });
  if (error) throw new Error(`saveVerificationCode failed: ${error.message}`);
}

export async function verifyCode(email: string, code: string, type: 'login' | 'register'): Promise<boolean> {
  const { data, error } = await supabase
    .from('verification_codes')
    .select('id')
    .eq('email', email)
    .eq('code', code)
    .eq('type', type)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data || data.length === 0) return false;
  await supabase.from('verification_codes').delete().eq('id', data[0].id);
  return true;
}