// lib/CRM/types.ts
export type CustomerStage = 
  | '潜在客户' | '询盘客户' | '样单客户' | '成交客户' | '复购客户';

export type CustomerScale = 
  | '大型生产型企业' | '大型贸易型企业' | '大型自用型企业'
  | '中小生产型企业' | '中小贸易型企业' | '中小自用型企业';

export type EmailSubscription = '已订阅' | '未订阅';

export interface Customer {
  site_id: string;            // 数据库字段，保持 snake_case
  id: string;
  first_name: string;        // 保持 snake_case（前端直接使用）
  last_name: string;         // 保持 snake_case
  name: string;              // 别名/全名，管理员专用
  country: string;
  country_code: string;
  email: string;
  phone: string;
  whatsapp: string;
  companyName: string;       // ← 改为 camelCase
  address: string;
  stage?: CustomerStage;
  importance?: 0 | 1 | 2 | 3;
  scale?: CustomerScale;
  notes: string;
  website: string;
  flag: string;
  emailSubscribed: EmailSubscription; // ← 改为 camelCase
  emailVerified: boolean;    // ← camelCase
  lastLogin?: string;        // ← camelCase
  passwordHash: string;      // ← camelCase
  role: 'customer' | 'admin';
  source: 'manual' | 'register';
  createdAt: string;         // ← camelCase
  updatedAt: string;         // ← camelCase
}

export interface Address {
  id: number;
  site_id: string;
  customer_id: string;
  recipient: string;
  phone: string;
  country_code: string;
  company: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;        // ← camelCase
  createdAt: string;         // ← camelCase
  updatedAt: string;         // ← camelCase
}

// 运行时常量
export const STAGES: CustomerStage[] = [
  '潜在客户', '询盘客户', '样单客户', '成交客户', '复购客户'
];
export const SCALES: CustomerScale[] = [
  '大型生产型企业', '大型贸易型企业', '大型自用型企业',
  '中小生产型企业', '中小贸易型企业', '中小自用型企业'
];