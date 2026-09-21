// lib/payment/types/carrier.ts

export interface Carrier {
  id: string;
  site_id?: string | null;        // ✅ 可选，NULL 表示公共数据
  key: string;                    // 唯一标识，如 dhl, fedex
  name_en: string;                // 英文名称
  name_cn: string;                // 中文名称
  name_hk?: string;               // 香港名称
  url?: string;                   // 官网地址
  shipping_methods: string[];     // 适用运输方式
  logo?: string;                  // Logo图片URL
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCarrierInput {
  site_id?: string | null;        // ✅ 可选
  key: string;
  name_en: string;
  name_cn: string;
  name_hk?: string;
  url?: string;
  shipping_methods: string[];
  logo?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateCarrierInput extends Partial<CreateCarrierInput> {
  id: string;
}