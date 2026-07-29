/* ==========================================================================
   光之回响 (Echoes of Light) — 伙伴界面模块
   ========================================================================== */

import { AppState } from './state.js';
import { Notifications } from './notifications.js';

/* ==========================================================================
   常量
   ========================================================================== */

/** 立绘渐变色映射（按 companion id） */
var PORTRAIT_GRADIENTS = {
  'ying': 'linear-gradient(135deg, #1a237e 0%, #4FC3F7 50%, #81C784 100%)',
  'jin': 'linear-gradient(135deg, #1a0a0a 0%, #6d1b1b 50%, #ff6b35 100%)',
  'lan': 'linear-gradient(135deg, #0d2b1a 0%, #388E3C 50%, #81C784 100%)',
  'unknown1': 'linear-gradient(135deg, #1a1a1a 0%, #333 50%, #555 100%)'
};

/** 默认立绘渐变色 */
var DEFAULT_PORTRAIT_GRADIENT = 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)';

/** 立绘图标映射 */
var PORTRAIT_ICONS = {
  'ying': 'sun',
  'jin': 'moon',
  'lan': 'wind',
  'unknown1': 'help-circle'
};

/** 状态 → CSS 类名映射 */
var STATUS_CLASS_MAP = {
  '休整': 'rest',
  '外出探索': 'explore',
  '探索': 'explore',
  '紧张': 'tense'
};

/** 上次亲和度快照（用于变化检测） */
var _lastAffectionMap = {};

/** 前一次 companions 引用，用于 shimmer */
var _prevCompanions = null;

/* ==========================================================================
   CompanionsPanel 单例
   ========================================================================== */

export var CompanionsPanel = {

  /* ======================================================================
     init — 初始化伙伴面板
     ====================================================================== */
  init: function () {
    // 记录初始亲和度快照
    var companions = AppState.get('companions');
    _prevCompanions = JSON.parse(JSON.stringify(companions));
    companions.forEach(function (c) {
      _lastAffectionMap[c.id] = c.affection;
    });

    this.render();

    // 订阅 companions 变化 → 检测亲和度变化并触发流光
    AppState.subscribe('companions', function (newCompanions) {
      var oldMap = _lastAffectionMap;
      newCompanions.forEach(function (c) {
        if (oldMap[c.id] !== undefined && oldMap[c.id] !== c.affection) {
          CompanionsPanel._triggerAffectionShimmer(c.id);
        }
      });
      // 更新快照
      newCompanions.forEach(function (c) {
        _lastAffectionMap[c.id] = c.affection;
      });
      // 不自动重新渲染 — 保持面板内容一致
    });
  },

  /* ======================================================================
     render — 渲染伙伴面板 HTML
     ====================================================================== */
  render: function () {
    var panel = document.getElementById('panel-companions');
    if (!panel) return;

    var companions = AppState.get('companions');
    var cardsHtml = '';

    companions.forEach(function (c, index) {
      cardsHtml += CompanionsPanel._renderCard(c, index);
    });

    panel.innerHTML =
      '<div class="companions-header">' +
        '<h2 class="companions-title">伙伴</h2>' +
        '<div class="companions-divider"></div>' +
      '</div>' +
      '<div class="companions-list">' +
        cardsHtml +
      '</div>' +
      '<div class="companions-footer">— 在未来旅程中结识新的伙伴…… —</div>';

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderCard — 渲染单个伙伴卡片
     ====================================================================== */
  _renderCard: function (companion, index) {
    var name = companion.name || '???';
    var affection = companion.affection != null ? companion.affection : 0;
    var location = companion.location || '???';
    var status = companion.status || '未知';
    var unlocked = companion.unlocked !== false;
    var background = companion.background || '???';

    var portraitGradient = PORTRAIT_GRADIENTS[companion.id] || DEFAULT_PORTRAIT_GRADIENT;
    var portraitIcon = PORTRAIT_ICONS[companion.id] || 'user';
    var statusClass = STATUS_CLASS_MAP[status] || 'unknown';
    var cardLockedClass = unlocked ? '' : ' locked';
    var nameLockedClass = unlocked ? '' : ' locked-name';
    var iconLockedClass = unlocked ? '' : ' locked-icon';

    var starsHtml = this._renderStars(companion.id, affection, unlocked);

    // 入场动画延迟
    var animDelay = (0.1 + index * 0.12).toFixed(2) + 's';

    var html =
      '<div class="companion-card' + cardLockedClass + '" data-companion-id="' + this._escapeHtml(companion.id) + '" style="animation-delay: ' + animDelay + ';">' +
        // 立绘区
        '<div class="companion-portrait" style="background: ' + portraitGradient + ';">' +
          '<i data-lucide="' + portraitIcon + '" class="portrait-icon' + iconLockedClass + '"></i>' +
        '</div>' +
        // 信息区
        '<div class="companion-info">' +
          '<div class="companion-name' + nameLockedClass + '">' + this._escapeHtml(name) + '</div>' +
          '<div class="companion-affection">' +
            starsHtml +
            (unlocked ? '<span class="affection-label">' + affection + '</span>' : '') +
          '</div>' +
          '<div class="companion-meta">' +
            '<span class="companion-location">' +
              '<i data-lucide="map-pin" class="location-icon"></i>' +
              this._escapeHtml(location) +
            '</span>' +
            '<span class="status-tag ' + statusClass + '">' + this._escapeHtml(status) + '</span>' +
          '</div>' +
          (unlocked ? '<div class="companion-desc">' + this._escapeHtml(background) + '</div>' : '') +
        '</div>' +
      '</div>';

    return html;
  },

  /* ======================================================================
     _renderStars — 渲染好感度星星（SVG）
     5 颗星，每颗 20%，填充率 = affection / 100
     ====================================================================== */
  _renderStars: function (companionId, affection, unlocked) {
    var maxStars = 5;
    var totalFilled = (affection / 100) * maxStars;
    var html = '<div class="affection-stars">';

    for (var i = 0; i < maxStars; i++) {
      var fillPercent = Math.max(0, Math.min(100, Math.round((totalFilled - i) / 1 * 100)));
      var gradId = 'star-' + companionId + '-' + i;
      var fillColor = unlocked ? '#FFD54F' : '#555';
      var emptyColor = unlocked ? 'rgba(85,85,85,0.4)' : 'rgba(50,50,50,0.3)';

      html +=
        '<svg class="affection-star" width="18" height="18" viewBox="0 0 24 24">' +
          '<defs>' +
            '<linearGradient id="' + gradId + '" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0%" stop-color="' + fillColor + '"/>' +
              '<stop offset="' + fillPercent + '%" stop-color="' + fillColor + '"/>' +
              '<stop offset="' + fillPercent + '%" stop-color="' + emptyColor + '"/>' +
              '<stop offset="100%" stop-color="' + emptyColor + '"/>' +
            '</linearGradient>' +
          '</defs>' +
          '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#' + gradId + ')" stroke="' + (unlocked ? '#FFD54F' : '#444') + '" stroke-width="0.5"/>' +
        '</svg>';
    }

    html += '</div>';
    return html;
  },

  /* ======================================================================
     _triggerAffectionShimmer — 触发好感度变化流光动画
     ====================================================================== */
  _triggerAffectionShimmer: function (companionId) {
    var panel = document.getElementById('panel-companions');
    if (!panel) return;

    var card = panel.querySelector('.companion-card[data-companion-id="' + companionId + '"]');
    if (!card) return;

    card.classList.add('affection-shimmer');

    // 2s 后移除
    setTimeout(function () {
      card.classList.remove('affection-shimmer');
    }, 2000);
  },

  /* ======================================================================
     _escapeHtml — HTML 转义
     ====================================================================== */
  _escapeHtml: function (str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
