// lib/crawler/core/utils.ts
import { Page } from 'playwright';
import { getPrivateStorage } from '@/lib/storage/factory';

/**
 * 保存调试截图和 HTML 到私有桶（原保存到本地文件系统）
 * @param page Playwright 页面对象
 * @param taskId 任务 ID
 * @param prefix 文件名前缀（如 'error'）
 */
export async function saveDebugScreenshot(page: Page, taskId: string, prefix: string = 'error') {
  try {
    const timestamp = Date.now();
    // 在私有桶中的路径：crawler/tasks/{taskId}/{prefix}_{timestamp}.png/html
    const screenshotKey = `crawler/tasks/${taskId}/${prefix}_${timestamp}.png`;
    const htmlKey = `crawler/tasks/${taskId}/${prefix}_${timestamp}.html`;

    const storage = getPrivateStorage();

    // 截图：获取 Buffer 后上传
    const screenshotBuffer = await page.screenshot({ fullPage: true });
    await storage.write(screenshotKey, screenshotBuffer, { contentType: 'image/png' });

    // HTML：获取页面内容后上传
    const html = await page.content();
    await storage.write(htmlKey, html, { contentType: 'text/html' });

    console.log(`📁 Saved debug files to R2: ${screenshotKey}, ${htmlKey}`);
  } catch (err) {
    console.error('Failed to save debug info to R2:', err);
  }
}

/**
 * 带重试的异步函数执行（无需修改）
 */
export async function waitWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number = 2000
): Promise<T> {
  let lastError: any;
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`尝试 ${i+1}/${maxRetries+1} 失败:`, err);
      if (i < maxRetries) await new Promise(r => setTimeout(r, delayMs * (i+1)));
    }
  }
  throw lastError;
}

/**
 * 追加日志到任务日志文件（存储在私有桶中）
 * @param taskId 任务 ID
 * @param message 日志消息
 */
export async function appendTaskLog(taskId: string, message: string) {
  try {
    const storage = getPrivateStorage();
    // 统一路径：与截图一致使用 crawler/tasks/...（不包含 data/ 前缀）
    const logKey = `crawler/tasks/${taskId}/log.txt`;
    const timestamp = new Date().toISOString();
    // 日志行格式：[timestamp] [taskId] message
    const logLine = `[${timestamp}] [${taskId}] ${message}\n`;

    // 读取现有日志内容（如果存在）
    let existingContent = '';
    try {
      const existing = await storage.read(logKey, 'utf8');
      existingContent = existing as string;
    } catch (err) {
      // 文件不存在，忽略错误
    }

    // 拼接新内容并写回
    const newContent = existingContent + logLine;
    await storage.write(logKey, newContent, { contentType: 'text/plain' });
  } catch (err) {
    // 日志写入失败不应影响主流程，仅打印警告
    console.warn(`Failed to append log for task ${taskId}:`, err);
  }
}