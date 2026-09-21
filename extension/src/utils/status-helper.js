// src/utils/status-helper.js
// 纯函数，不依赖任何 Chrome API

/**
 * 获取采集状态结果
 * Popup 和悬浮面板共用，确保输出一致
 */
export function getCollectStatus(result, rawData) {
  const title = rawData?.title || rawData?.product_name || '商品';
  const price = rawData?.price || '';
  const shortTitle = title.length > 20 ? title.substring(0, 20) + '...' : title;
  
  // 1. 失败
  if (!result || !result.success) {
    return {
      type: 'error',
      statusType: 'error',
      statusText: `❌ 采集失败: ${result?.error || '未知错误'}`,
      shortStatus: '❌ 采集失败',
      bannerText: `⚠️ ${result?.error || '采集失败，请重试'}`,
      bannerType: 'disconnected',
      logMessage: `❌ 采集失败: ${result?.error || '未知错误'}`,
      logType: 'err',
      saved: 0,
      exists: 0,
      failed: result?.failed || 0,
      tagText: '🔴 失败'
    };
  }
  
  // 2. 新商品保存成功
  if (result.saved > 0) {
    const priceText = price ? ` ${price}` : '';
    return {
      type: 'success',
      statusType: 'ready',
      statusText: `✅ 采集成功（${result.saved} 条） ${shortTitle}${priceText}`,
      shortStatus: `✅ 采集成功（${result.saved} 条）`,
      bannerText: `✅ 已保存 ${result.saved} 条商品数据`,
      bannerType: 'connected',
      logMessage: `✅ 采集成功！已保存 ${result.saved} 条商品数据 (${title})${priceText}`,
      logType: 'ok',
      saved: result.saved,
      exists: 0,
      failed: 0,
      tagText: '🟢 已连接'
    };
  }
  
  // 3. 商品已存在（重复采集）
  if (result.exists > 0 && result.saved === 0) {
    return {
      type: 'info',
      statusType: 'ready',
      statusText: `ℹ️ 已采集（${result.exists} 条） ${shortTitle}`,
      shortStatus: `ℹ️ 已采集（${result.exists} 条）`,
      bannerText: `ℹ️ 该商品已采集（${result.exists} 条），无需重复采集`,
      bannerType: 'connected',
      logMessage: `ℹ️ 该商品已采集（${result.exists} 条），无需重复采集: ${title}`,
      logType: 'warn',
      saved: 0,
      exists: result.exists,
      failed: 0,
      tagText: '🟢 已连接'
    };
  }
  
  // 4. 保存失败
  if (result.failed > 0 && result.saved === 0) {
    return {
      type: 'warn',
      statusType: 'error',
      statusText: `❌ 采集失败（${result.failed} 条）`,
      shortStatus: `❌ 采集失败`,
      bannerText: `⚠️ ${result.failed} 条数据保存失败`,
      bannerType: 'disconnected',
      logMessage: `❌ 采集失败，${result.failed} 条数据保存失败: ${result.error || '未知错误'}`,
      logType: 'err',
      saved: 0,
      exists: 0,
      failed: result.failed,
      tagText: '🔴 失败'
    };
  }
  
  // 5. 未知状态
  return {
    type: 'warn',
    statusType: 'error',
    statusText: '⚠️ 采集完成，状态未知',
    shortStatus: '⚠️ 状态未知',
    bannerText: '请检查独立站配置',
    bannerType: 'disconnected',
    logMessage: '⚠️ 采集完成，状态未知',
    logType: 'warn',
    saved: 0,
    exists: 0,
    failed: 0,
    tagText: '🔴 未知'
  };
}