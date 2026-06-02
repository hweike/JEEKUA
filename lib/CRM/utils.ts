import { CustomerStage, CustomerScale } from './types';
import type { Customer } from './types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  return req.headers.get('x-real-ip') || '127.0.0.1';
}

export async function getCountryFromIp(ip: string): Promise<string> {
  if (ip === '127.0.0.1' || ip === '::1') return 'Local';
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
    const data = await res.json();
    return data.countryCode || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export function createSubscriberCustomer(email: string, country: string): Omit<Customer, 'id' | 'createdAt'> & { id?: string; createdAt?: string } {
  return {
    name: '',
    country,
    email,
    phone: '',
    whatsapp: '',
    companyName: '',
    address: '',
    stage: undefined,
    importance: undefined,
    scale: undefined,
    notes: '通过邮件订阅创建',
    website: '',
    flag: '',
    emailSubscribed: '已订阅',
  };
}