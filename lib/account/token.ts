import { sign, verify } from '@/lib/auth/jwt';

export async function generateCustomerToken(customerId: string): Promise<string> {
  return sign({ customerId, role: 'customer' }, { expiresIn: '7d' });
}

export async function verifyCustomerToken(token: string): Promise<{ customerId: string; role: string } | null> {
  try {
    const decoded = await verify(token);
    if (decoded.role !== 'customer') return null;
    return { customerId: decoded.customerId, role: decoded.role };
  } catch {
    return null;
  }
}