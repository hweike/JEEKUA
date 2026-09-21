// src/utils/format-helper.js
// 纯函数，不依赖任何 Chrome API
// 包含格式化 + 日志功能

/**
 * 格式化时间戳
 */
export function formatTimestamp() {
  return new Date().toLocaleTimeString();
}

/**
 * 截断文本
 */
export function truncateText(text, maxLength) {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

/**
 * 获取日志前缀
 */
export function getLogPrefix(type) {
  var map = {
    ok: '✅',
    err: '❌',
    warn: '⚠️',
    info: 'ℹ️',
    success: '✅',
    error: '❌'
  };
  return map[type] || 'ℹ️';
}

/**
 * 获取日志 CSS 类名
 */
export function getLogClass(type) {
  var map = {
    ok: 'ok',
    err: 'err',
    warn: 'warn',
    info: 'info',
    success: 'ok',
    error: 'err'
  };
  return map[type] || 'info';
}

/**
 * ⭐ 日志级别配置（新增）
 */
var LOG_LEVELS = {
  ok: { prefix: '✅', cls: 'ok' },
  err: { prefix: '❌', cls: 'err' },
  warn: { prefix: '⚠️', cls: 'warn' },
  info: { prefix: 'ℹ️', cls: 'info' },
  success: { prefix: '✅', cls: 'ok' },
  error: { prefix: '❌', cls: 'err' }
};

/**
 * ⭐ 获取日志配置（新增）
 */
export function getLogConfig(type) {
  return LOG_LEVELS[type] || LOG_LEVELS.info;
}

/**
 * ⭐ 格式化日志（带时间戳）（新增）
 */
export function formatLog(message, type) {
  var config = getLogConfig(type);
  var time = formatTimestamp();
  return '[' + time + '] ' + config.prefix + ' ' + message;
}

/**
 * 格式化日志消息（已有）
 */
export function formatLogMessage(message, type) {
  var prefix = getLogPrefix(type);
  var time = formatTimestamp();
  return '[' + time + '] ' + prefix + ' ' + message;
}

/**
 * 生成日志 HTML（已有）
 */
export function createLogHtml(message, type) {
  var cls = getLogClass(type);
  var prefix = getLogPrefix(type);
  var time = formatTimestamp();
  return '<span class="' + cls + '">[' + time + '] ' + prefix + ' ' + message + '</span>';
}

/**
 * 生成日志 HTML（createLogEntry 别名，方便使用）
 */
export function createLogEntry(message, type) {
  return createLogHtml(message, type);
}

/**
 * 生成日志文本（用于 Popup 或控制台）
 */
export function createLogText(message, type) {
  var prefix = getLogPrefix(type);
  var time = formatTimestamp();
  return '[' + time + '] ' + prefix + ' ' + message;
}