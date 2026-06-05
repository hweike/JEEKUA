import { supabase } from '../lib/supabase/client';

const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || '000001';

async function clearDiscoveryTables() {
  // 清空 sync_logs 表（按 site_id 删除）
  const { error: syncError } = await supabase
    .from('sync_logs')
    .delete()
    .eq('site_id', SITE_ID);
  if (syncError) {
    console.error('Failed to delete sync_logs:', syncError);
    process.exit(1);
  }
  console.log('✅ 已清空 sync_logs 表');

  // 清空 page_contents 表（按 site_id 删除）
  const { error: contentError } = await supabase
    .from('page_contents')
    .delete()
    .eq('site_id', SITE_ID);
  if (contentError) {
    console.error('Failed to delete page_contents:', contentError);
    process.exit(1);
  }
  console.log('✅ 已清空 page_contents 表');

  // 清空 site_configs 表（按 site_id 删除）
  const { error: configError } = await supabase
    .from('site_configs')
    .delete()
    .eq('site_id', SITE_ID);
  if (configError) {
    console.error('Failed to delete site_configs:', configError);
    process.exit(1);
  }
  console.log('✅ 已清空 site_configs 表');

  // 清空 pages 表（按 site_id 删除）
  const { error: pageError } = await supabase
    .from('pages')
    .delete()
    .eq('site_id', SITE_ID);
  if (pageError) {
    console.error('Failed to delete pages:', pageError);
    process.exit(1);
  }
  console.log('✅ 已清空 pages 表');

  console.log('✅ 所有 Discovery 相关表已清空');
  process.exit(0);
}

clearDiscoveryTables().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});