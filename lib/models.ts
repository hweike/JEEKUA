// lib/models/index.ts
import { getPrivateStorage } from '@/lib/storage/factory';

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

// 私有桶中的基础前缀
const STORAGE_PREFIX = 'models';

/**
 * 获取所有模型文件列表
 * @returns 包含文件名和模型名的数组
 */
export async function getModelList(): Promise<{ fileName: string; modelName: string }[]> {
  const storage = getPrivateStorage();
  const prefix = `${STORAGE_PREFIX}/`;
  try {
    const keys = await storage.list(prefix);
    const jsonKeys = keys.filter(key => key.endsWith('.json'));
    const result: { fileName: string; modelName: string }[] = [];
    for (const key of jsonKeys) {
      const fileName = key.split('/').pop() || '';
      try {
        const content = await storage.read(key, 'utf8');
        const model = JSON.parse(content as string);
        result.push({ fileName, modelName: model.modelName || fileName });
      } catch {
        result.push({ fileName, modelName: fileName });
      }
    }
    return result;
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return [];
    }
    console.error('获取模型列表失败:', error);
    return [];
  }
}

/**
 * 获取单个模型详情
 * @param fileName 模型文件名（如 'product.json'）
 * @returns 模型对象，不存在时返回 null
 */
export async function getModel(fileName: string): Promise<ProductModel | null> {
  const storage = getPrivateStorage();
  const key = `${STORAGE_PREFIX}/${fileName}`;
  try {
    const content = await storage.read(key, 'utf8');
    return JSON.parse(content as string);
  } catch (error: any) {
    if (error?.message?.includes('File not found') || error?.code === 'NoSuchKey') {
      return null;
    }
    console.error(`读取模型 ${fileName} 失败:`, error);
    return null;
  }
}