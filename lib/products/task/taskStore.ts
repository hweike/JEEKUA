// lib/products/task/taskStore.ts
import { supabase } from '@/lib/supabase/client';

export interface ProductTask {
  id: string;
  status: 'pending' | 'success' | 'failed';
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
}

export const taskStore = {
  /**
   * 创建新任务
   */
  async create(taskId: string) {
    const { error } = await supabase
      .from('product_tasks')
      .insert({ id: taskId, status: 'pending' });
    if (error) throw new Error(`创建任务失败: ${error.message}`);
  },

  /**
   * 标记任务成功
   */
  async setSuccess(taskId: string, result: any) {
    const { error } = await supabase
      .from('product_tasks')
      .update({
        status: 'success',
        result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) console.error('更新任务为成功失败:', error);
  },

  /**
   * 标记任务失败
   */
  async setFailed(taskId: string, errorMsg: string) {
    const { error } = await supabase
      .from('product_tasks')
      .update({
        status: 'failed',
        error: errorMsg,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);
    if (error) console.error('更新任务为失败失败:', error);
  },

  /**
   * 查询任务
   */
  async get(taskId: string): Promise<ProductTask | null> {
    const { data, error } = await supabase
      .from('product_tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();
    if (error) throw new Error(`查询任务失败: ${error.message}`);
    return data;
  },

  /**
   * 清理过期任务（可选，可定时调用）
   */
  async cleanOldTasks(days: number = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const { error } = await supabase
      .from('product_tasks')
      .delete()
      .lt('created_at', cutoff.toISOString());
    if (error) console.error('清理过期任务失败:', error);
  },
};