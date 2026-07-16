// app/admin/discovery/seo/strategies/types/index.ts

export interface FieldConfig {
  enabled: boolean;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  minCount?: number;
  maxCount?: number;
  promptTemplate: string;
}

export interface StrategyFields {
  seo_title: FieldConfig;
  seo_description: FieldConfig;
  seo_keywords: FieldConfig;
}

export interface Strategy {
  id?: string;
  site_id: string | null;
  page_type: string;
  label: string;
  use_global_context: boolean;
  fields: StrategyFields;
  created_at?: string;
  updated_at?: string;
}

export interface GlobalConfig {
  site_id: string;
  site_name: string;
  brand_name: string;
  site_url: string;
  default_locale: string;
  supported_locales: string[];
  target_audience?: string;
  core_values?: string[];
}

export type FieldKey = keyof StrategyFields;