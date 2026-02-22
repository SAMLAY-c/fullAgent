/**
 * 前端公共工具库
 * 提供跨页面共享的工具函数
 */

(function(global) {
  'use strict';

  const utils = {
    /**
     * 转义 HTML 特殊字符，防止 XSS 攻击
     * @param {string} text - 需要转义的文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
      return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    },

    /**
     * 格式化时间为本地日期时间字符串
     * @param {string|Date} ts - 时间戳或 Date 对象
     * @returns {string} 格式化后的时间字符串
     */
    formatTime(ts) {
      if (!ts) return '-';
      try {
        return new Date(ts).toLocaleString();
      } catch {
        return String(ts);
      }
    },

    /**
     * 格式化时间为短格式（HH:MM）
     * @param {string|Date} isoOrDate - ISO 字符串或 Date 对象
     * @returns {string} 格式化后的时间字符串 (HH:MM)
     */
    formatTimeShort(isoOrDate) {
      const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
      if (Number.isNaN(date.getTime())) {
        return '--:--';
      }
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    },

    /**
     * 格式化日期时间为本地格式
     * @param {string|Date} isoOrDate - ISO 字符串或 Date 对象
     * @returns {string} 格式化后的日期时间字符串
     */
    formatDateTime(isoOrDate) {
      const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
      if (Number.isNaN(date.getTime())) return '--';
      return date.toLocaleString('zh-CN');
    },

    /**
     * 格式化时间为自定义格式 (YYYY-MM-DD HH:MM)
     * @param {string|Date|number} ts - 时间戳、日期字符串或 Date 对象
     * @returns {string} 格式化后的时间字符串
     */
    formatTimeCustom(ts) {
      if (!ts) return '-';
      const d = new Date(ts);
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    },

    /**
     * 计算相对时间（多久之前）
     * @param {number} ts - 时间戳
     * @returns {string} 相对时间描述
     */
    humanAgo(ts) {
      if (!ts) return '-';
      const now = Date.now();
      const diff = Math.max(0, now - ts);
      const m = Math.floor(diff / 60000);
      if (m < 1) return '刚刚';
      if (m < 60) return `${m} 分钟前`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} 小时前`;
      const d = Math.floor(h / 24);
      if (d < 30) return `${d} 天前`;
      const mo = Math.floor(d / 30);
      if (mo < 12) return `${mo} 个月前`;
      const y = Math.floor(mo / 12);
      return `${y} 年前`;
    }
  };

  // 导出到全局对象
  global.utils = global.utils || {};
  Object.assign(global.utils, utils);

  // 同时导出为独立函数，保持向后兼容
  global.escapeHtml = utils.escapeHtml;
  global.formatTime = utils.formatTime;
  global.formatTimeShort = utils.formatTimeShort;
  global.formatDateTime = utils.formatDateTime;
  global.formatTimeCustom = utils.formatTimeCustom;
  global.humanAgo = utils.humanAgo;

})(typeof window !== 'undefined' ? window : global);
