// lib/products/task/taskStore.ts
import sql from '@/lib/db/admin';

export interface ProductTask {
  id: string;
  status: 'pending' | 'success' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export const taskStore = {
  async create(taskId: string) {
    try {
      await sql`
        INSERT INTO public.product_tasks (id, status)
        VALUES (${taskId}, 'pending')
      `;
    } catch (error: any) {
      throw new Error(`创建任务失败: ${error.message}`);
    }
  },

  async setSuccess(taskId: string, result: any) {
    try {
      await sql`
        UPDATE public.product_tasks
        SET status = 'success',
            result = ${sql.json(result)},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${taskId}
      `;
    } catch (error: any) {
      console.error('更新任务为成功失败:', error);
    }
  },

  async setFailed(taskId: string, errorMsg: string) {
    try {
      await sql`
        UPDATE public.product_tasks
        SET status = 'failed',
            error = ${errorMsg},
            updated_at = ${new Date().toISOString()}
        WHERE id = ${taskId}
      `;
    } catch (error: any) {
      console.error('更新任务为失败失败:', error);
    }
  },

  async get(taskId: string): Promise<ProductTask | null> {
    try {
      const rows = await sql<ProductTask[]>`
        SELECT * FROM public.product_tasks
        WHERE id = ${taskId}
        LIMIT 1
      `;
      return rows[0] || null;
    } catch (error: any) {
      throw new Error(`查询任务失败: ${error.message}`);
    }
  },

  async cleanOldTasks(days: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    try {
      await sql`
        DELETE FROM public.product_tasks
        WHERE created_at < ${cutoff.toISOString()}
      `;
    } catch (error: any) {
      console.error('清理过期任务失败:', error);
    }
  },
};