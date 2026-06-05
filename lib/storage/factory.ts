// lib/storage/factory.ts
import { R2Storage } from './r2-storage';

let privateStorage: R2Storage | null = null;
let publicStorage: R2Storage | null = null;

export function getPrivateStorage(): R2Storage {
  if (!privateStorage) privateStorage = new R2Storage('private');
  return privateStorage;
}

export function getPublicStorage(): R2Storage {
  if (!publicStorage) publicStorage = new R2Storage('public');
  return publicStorage;
}