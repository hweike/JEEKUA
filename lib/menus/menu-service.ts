// lib/menus/menu-service.ts
import { supabase } from '@/lib/supabase/client';

const DEFAULT_SITE_ID = '000001';

export class MenuService {
  /**
   * 获取单个菜单（导航/底部/自定义）—— 无记录时返回 null
   */
  async getMenu(menuId: string, locale: string): Promise<any> {
    const { data, error } = await supabase
      .from('site_configs')
      .select('config')
      .eq('id', menuId)
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (error) {
      console.error(`[MenuService] getMenu error for ${menuId}, ${locale}:`, error);
      return null;
    }
    return data?.config ?? null;
  }

  /**
   * 保存单个菜单
   * 如果 data 为 null，则删除该记录
   */
  async saveMenu(menuId: string, locale: string, data: any): Promise<void> {
    // 如果 data 为 null，执行删除操作
    if (data === null) {
      const { error } = await supabase
        .from('site_configs')
        .delete()
        .eq('id', menuId)
        .eq('site_id', DEFAULT_SITE_ID)
        .eq('locale', locale);

      if (error) {
        console.error(`[MenuService] deleteMenu error for ${menuId}, ${locale}:`, error);
        throw new Error(`删除菜单失败: ${error.message}`);
      }
      return;
    }

    if (!data) {
      console.error('[MenuService] saveMenu failed: data is empty');
      throw new Error('保存菜单失败: 数据不能为空');
    }
    const payload = {
      id: menuId,
      site_id: DEFAULT_SITE_ID,
      locale,
      config: data,
      updatedAt: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('site_configs')
      .upsert(payload, { onConflict: 'id, site_id, locale' });

    if (error) {
      console.error(`[MenuService] saveMenu error for ${menuId}, ${locale}:`, error);
      throw new Error(`保存菜单失败: ${error.message}`);
    }
  }

  /**
   * 获取自定义菜单列表 —— 无记录时返回 null
   */
  async getCustomMenus(locale: string): Promise<any[] | null> {
    const { data, error } = await supabase
      .from('site_configs')
      .select('config')
      .eq('id', 'custom_menus')
      .eq('site_id', DEFAULT_SITE_ID)
      .eq('locale', locale)
      .maybeSingle();

    if (error || !data?.config) {
      return null;
    }
    return Array.isArray(data.config) ? data.config : null;
  }

  /**
   * 保存自定义菜单列表
   */
  async saveCustomMenus(locale: string, menus: any[]): Promise<void> {
    if (!Array.isArray(menus)) {
      console.error('[MenuService] saveCustomMenus failed: menus is not an array');
      throw new Error('自定义菜单必须是数组');
    }
    await this.saveMenu('custom_menus', locale, menus);
  }

  /**
   * 获取所有已存在的语言（从菜单配置中）
   */
  async getAvailableMenuLocales(): Promise<string[]> {
    const { data } = await supabase
      .from('site_configs')
      .select('locale')
      .eq('site_id', DEFAULT_SITE_ID)
      .in('id', ['navigation', 'footer-menu', 'custom_menus']);

    const locales = new Set<string>();
    if (data) {
      data.forEach(row => locales.add(row.locale));
    }
    return locales.size ? Array.from(locales).sort() : ['zh', 'en'];
  }

  /**
   * 获取默认菜单结构（仅供上层使用，不直接返回给前端）
   */
  getDefaultMenu(menuId: string): any {
    if (menuId === 'custom_menus') return [];
    return {
      id: menuId,
      name: menuId === 'navigation' ? '主导航' : '底部菜单',
      isEditable: false,
      items: [],
    };
  }
}

export const menuService = new MenuService();