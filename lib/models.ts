import fs from 'fs';
import path from 'path';

const MODELS_DIR = path.join(process.cwd(), 'models');

export interface ModelField {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'richText' | 'image' | 'number' | 'autoNumber' | 'relation';
  required?: boolean;
  maxLength?: number;
  autoGenerate?: { prefix?: string; digits: number; startFrom: number };
  description?: string;
}

export interface FixedAttribute {
  name: string;
  label: string;
  type: string;
  required?: boolean;
}

export interface CustomAttributeSlot {
  slotName: string;
  label: string;
  type: string;
}

export interface PriceTier {
  maxTiers: number;
  fields: ModelField[];
}

export interface ProductModel {
  modelName: string;
  description?: string;
  version: string;
  fields: ModelField[];
  fixedAttributes: FixedAttribute[];
  customAttributes: {
    maxSlots: number;
    slots: CustomAttributeSlot[];
    description?: string;
  };
  priceTiers: PriceTier;
  fileNamingRule: {
    pattern: string;
    description?: string;
  };
}

// 获取所有模型文件
export function getModelList(): { fileName: string; modelName: string }[] {
  if (!fs.existsSync(MODELS_DIR)) return [];
  const files = fs.readdirSync(MODELS_DIR).filter(f => f.endsWith('.json'));
  return files.map(file => {
    const fullPath = path.join(MODELS_DIR, file);
    try {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const model = JSON.parse(content);
      return { fileName: file, modelName: model.modelName };
    } catch {
      return { fileName: file, modelName: file };
    }
  });
}

// 获取单个模型详情
export function getModel(fileName: string): ProductModel | null {
  const filePath = path.join(MODELS_DIR, fileName);
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}