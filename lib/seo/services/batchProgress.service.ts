// lib/seo/services/batchProgress.service.ts

/**
 * 批量任务进度管理服务（内存存储）
 * 
 * 职责：
 * - 管理批量任务的进度状态
 * - 支持任务创建、更新、查询
 * - 自动清理过期任务
 * 
 * 特点：
 * - 纯内存存储，服务重启后数据丢失
 * - 每个任务最多保留 10 分钟
 * - 支持并发控制（默认每次处理 5 个）
 */

import { randomUUID } from 'crypto';

// =====================================================
// 类型定义
// =====================================================

export type BatchJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BatchJobItem {
  pageId: string;
  locale?: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  error?: string;
}

export interface BatchJobProgress {
  jobId: string;
  jobType: 'analyze' | 'generate';
  status: BatchJobStatus;
  total: number;
  completed: number;
  failed: number;
  details: BatchJobItem[];
  startTime: number;
  updateTime: number;
}

export interface BatchJobOptions {
  /** 并发数，默认 5 */
  concurrency?: number;
  /** 任务超时时间（毫秒），默认 5 分钟 */
  timeout?: number;
  /** 进度保留时间（毫秒），默认 10 分钟 */
  ttl?: number;
}

// =====================================================
// 主服务类
// =====================================================

export class BatchProgressService {
  private jobs = new Map<string, BatchJobProgress>();
  private options: Required<BatchJobOptions>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: BatchJobOptions = {}) {
    this.options = {
      concurrency: options.concurrency ?? 5,
      timeout: options.timeout ?? 5 * 60 * 1000, // 5 分钟
      ttl: options.ttl ?? 10 * 60 * 1000, // 10 分钟
    };

    // 启动定期清理（每 2 分钟检查一次）
    this.startCleanup();
  }

  /**
   * 创建新任务
   */
  createJob(
    jobType: 'analyze' | 'generate',
    pageIds: string[],
    options?: { locale?: string; targetLocales?: string[] }
  ): string {
    const jobId = randomUUID();

    const details: BatchJobItem[] = pageIds.map((pageId) => ({
      pageId,
      locale: options?.locale || (options?.targetLocales?.[0] || 'en'),
      status: 'pending',
    }));

    this.jobs.set(jobId, {
      jobId,
      jobType,
      status: 'pending',
      total: pageIds.length,
      completed: 0,
      failed: 0,
      details,
      startTime: Date.now(),
      updateTime: Date.now(),
    });

    return jobId;
  }

  /**
   * 获取任务进度
   */
  getJob(jobId: string): BatchJobProgress | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return this.sanitizeJob(job);
  }

  /**
   * 更新任务状态
   */
  updateJobStatus(jobId: string, status: BatchJobStatus): void {
    const job = this.jobs.get(jobId);
    if (!job) return;
    job.status = status;
    job.updateTime = Date.now();
  }

  /**
   * 更新单个项目的状态
   */
  updateItem(
    jobId: string,
    pageId: string,
    status: 'pending' | 'processing' | 'success' | 'failed',
    error?: string
  ): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const item = job.details.find((d) => d.pageId === pageId);
    if (!item) return;

    // 如果状态变化，更新计数
    if (item.status === 'pending' && (status === 'success' || status === 'failed')) {
      // 从 pending 变为 success/failed，计数由调用方增加
    }
    if (item.status === 'processing' && (status === 'success' || status === 'failed')) {
      // 从 processing 变为 success/failed
    }

    item.status = status;
    if (error) item.error = error;
    job.updateTime = Date.now();
  }

  /**
   * 标记项目为成功（并增加完成计数）
   */
  markItemSuccess(jobId: string, pageId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const item = job.details.find((d) => d.pageId === pageId);
    if (!item) return;

    if (item.status !== 'success') {
      item.status = 'success';
      job.completed++;
      job.updateTime = Date.now();
    }
  }

  /**
   * 标记项目为失败（并增加失败计数）
   */
  markItemFailed(jobId: string, pageId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const item = job.details.find((d) => d.pageId === pageId);
    if (!item) return;

    if (item.status !== 'failed') {
      item.status = 'failed';
      item.error = error;
      job.failed++;
      job.updateTime = Date.now();
    }
  }

  /**
   * 标记项目为处理中
   */
  markItemProcessing(jobId: string, pageId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const item = job.details.find((d) => d.pageId === pageId);
    if (!item) return;

    if (item.status === 'pending') {
      item.status = 'processing';
      job.updateTime = Date.now();
    }
  }

  /**
   * 检查任务是否完成
   */
  isJobComplete(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    return job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled';
  }

  /**
   * 删除任务（强制清理）
   */
  removeJob(jobId: string): void {
    this.jobs.delete(jobId);
  }

  /**
   * 获取所有运行中的任务
   */
  getRunningJobs(): BatchJobProgress[] {
    const result: BatchJobProgress[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === 'running' || job.status === 'pending') {
        result.push(this.sanitizeJob(job));
      }
    }
    return result;
  }

  /**
   * 清理过期任务
   */
  cleanup(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [jobId, job] of this.jobs) {
      // 已完成的任务超过 TTL 则删除
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        now - job.updateTime > this.options.ttl
      ) {
        toRemove.push(jobId);
      }
      // 运行中的任务超过超时时间则标记为失败
      if (job.status === 'running' && now - job.startTime > this.options.timeout) {
        job.status = 'failed';
        job.updateTime = now;
      }
    }

    for (const jobId of toRemove) {
      this.jobs.delete(jobId);
    }
  }

  /**
   * 启动定期清理
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000); // 每 2 分钟
  }

  /**
   * 停止清理定时器（用于服务关闭）
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 清理敏感信息，只返回最近 50 条明细
   */
  private sanitizeJob(job: BatchJobProgress): BatchJobProgress {
    // 只返回最近 50 条明细
    const details = job.details.slice(-50);
    return {
      ...job,
      details,
    };
  }
}

// 导出单例实例
export const batchProgressService = new BatchProgressService({
  concurrency: 5,
  timeout: 5 * 60 * 1000, // 5 分钟
  ttl: 10 * 60 * 1000, // 10 分钟
});