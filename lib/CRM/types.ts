export type CustomerStage = 
  | '潜在客户' | '询盘客户' | '样单客户' | '成交客户' | '复购客户';

export type CustomerScale = 
  | '大型生产型企业' | '大型贸易型企业' | '大型自用型企业'
  | '中小生产型企业' | '中小贸易型企业' | '中小自用型企业';

export type EmailSubscription = '已订阅' | '未订阅';

export interface Customer {
  site_id: string;
  id: string;
  first_name: string;
  last_name: string;
  name: string;              // 别名/全名，管理员专用
  country: string;
  country_code: string;
  email: string;
  phone: string;
  whatsapp: string;
  company_name: string;
  address: string;           // 默认地址（旧字段）
  stage?: CustomerStage;
  importance?: 0 | 1 | 2 | 3;
  scale?: CustomerScale;
  notes: string;
  website: string;
  flag: string;
  email_subscribed: EmailSubscription;
  email_verified: boolean;
  last_login?: string;
  password_hash: string;
  role: 'customer' | 'admin';
  source: 'manual' | 'register'; // 必填
  created_at: string;
  updated_at: string;
}

export interface Address {
  id: number;
  site_id: string;
  customer_id: string;
  recipient: string;      // 全名（由 first_name + last_name 合并）
  phone: string;          // 完整电话号码（含区号）
  country_code: string;   // ISO 代码
  company: string;        // 新增
  province: string;
  city: string;
  district: string;
  detail: string;         // 详细地址（含公寓）
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

// 运行时常量
export const STAGES: CustomerStage[] = [
  '潜在客户', '询盘客户', '样单客户', '成交客户', '复购客户'
];
export const SCALES: CustomerScale[] = [
  '大型生产型企业', '大型贸易型企业', '大型自用型企业',
  '中小生产型企业', '中小贸易型企业', '中小自用型企业'
];