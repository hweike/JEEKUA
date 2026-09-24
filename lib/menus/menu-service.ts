// lib/menus/menu-service.ts
import sql from '@/lib/db/admin';

const DEFAULT_SITE_ID = '000001';

export class MenuService {
  /**
   * 获取单个菜单（导航/底部/自定义）—— 无记录时返回 null
   */
  async getMenu(menuId: string, locale: string): Promise<any> {
    try {
      const rows = await sql<{ config: any }[]>`
        SELECT config FROM site_configs
        WHERE id = ${menuId}
          AND site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      return rows[0]?.config ?? null;
    } catch (error) {
      console.error(`[MenuService] getMenu error for ${menuId}, ${locale}:`, error);
      return null;
    }
  }

  /**
   * 保存单个菜单
   * 如果 data 为 null，则删除该记录
   */
  async saveMenu(menuId: string, locale: string, data: any): Promise<void> {
    // 如果 data 为 null，执行删除操作
    if (data === null) {
      try {
        await sql`
          DELETE FROM site_configs
          WHERE id = ${menuId}
            AND site_id = ${DEFAULT_SITE_ID}
            AND locale = ${locale}
        `;
      } catch (error: any) {
        console.error(`[MenuService] deleteMenu error for ${menuId}, ${locale}:`, error);
        throw new Error(`删除菜单失败: ${error.message}`);
      }
      return;
    }

    if (!data) {
      console.error('[MenuService] saveMenu failed: data is empty');
      throw new Error('保存菜单失败: 数据不能为空');
    }

    try {
      await sql`
        INSERT INTO site_configs (id, site_id, locale, config, "updatedAt")
        VALUES (${menuId}, ${DEFAULT_SITE_ID}, ${locale}, ${sql.json(data)}, ${new Date().toISOString()})
        ON CONFLICT (id, site_id, locale)
        DO UPDATE SET
          config = ${sql.json(data)},
          "updatedAt" = ${new Date().toISOString()}
      `;
    } catch (error: any) {
      console.error(`[MenuService] saveMenu error for ${menuId}, ${locale}:`, error);
      throw new Error(`保存菜单失败: ${error.message}`);
    }
  }

  /**
   * 获取自定义菜单列表 —— 无记录时返回 null
   */
  async getCustomMenus(locale: string): Promise<any[] | null> {
    try {
      const rows = await sql<{ config: any }[]>`
        SELECT config FROM site_configs
        WHERE id = 'custom_menus'
          AND site_id = ${DEFAULT_SITE_ID}
          AND locale = ${locale}
        LIMIT 1
      `;
      const config = rows[0]?.config;
      if (!config) return null;
      return Array.isArray(config) ? config : null;
    } catch {
      return null;
    }
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
    try {
      const rows = await sql<{ locale: string }[]>`
        SELECT locale FROM site_configs
        WHERE site_id = ${DEFAULT_SITE_ID}
          AND id IN ('navigation', 'footer-menu', 'custom_menus')
      `;
      const locales = new Set<string>();
      for (const row of rows) {
        if (row.locale) locales.add(row.locale);
      }
      return locales.size ? Array.from(locales).sort() : ['zh', 'en'];
    } catch {
      return ['zh', 'en'];
    }
  }

  /**
   * 获取默认菜单结构
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