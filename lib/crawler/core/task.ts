// lib/crawler/core/task.ts
import fs from 'fs/promises';
import path from 'path';
import { CrawlerRule, TaskData, RULES_DIR, TASKS_DIR } from '../types';

export async function ensureDirs() {
  await fs.mkdir(RULES_DIR, { recursive: true });
  await fs.mkdir(TASKS_DIR, { recursive: true });
}

export async function getRule(ruleId: string): Promise<CrawlerRule | null> {
  await ensureDirs();
  try {
    const filePath = path.join(RULES_DIR, `${ruleId}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function saveTask(taskId: string, data: Partial<TaskData>) {
  await ensureDirs();
  const taskDir = path.join(TASKS_DIR, taskId);
  await fs.mkdir(taskDir, { recursive: true });
  const metaPath = path.join(taskDir, 'meta.json');
  let existing: TaskData = {
    taskId,
    ruleId: '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  try {
    const content = await fs.readFile(metaPath, 'utf-8');
    existing = JSON.parse(content);
  } catch {}
  const merged = { ...existing, ...data, updatedAt: new Date().toISOString() };
  const tempPath = metaPath + '.tmp';
  await fs.writeFile(tempPath, JSON.stringify(merged, null, 2));
  await fs.rename(tempPath, metaPath);
}

export async function getTask(taskId: string): Promise<TaskData | null> {
  await ensureDirs();
  try {
    const metaPath = path.join(TASKS_DIR, taskId, 'meta.json');
    const content = await fs.readFile(metaPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}