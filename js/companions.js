/* ==========================================================================
   光之回响 (Echoes of Light) — 伙伴界面模块（图鉴版）
   数据源：data/characters.json（静态图鉴） + AppState companions（运行时好感/状态）
   ========================================================================== */

import { AppState } from './state.js?v=11';
import { Notifications } from './notifications.js?v=11';

/* ==========================================================================
   常量
   ========================================================================== */

/** 默认主题（characters.json 缺 theme 时兜底） */
var DEFAULT_THEME = { glow: 'rgba(212, 165, 116, 0.15)', accent: '#D4A574' };

/** 状态 → CSS 类名映射 */
var STATUS_CLASS_MAP = {
  '休整': 'rest',
  '外出探索': 'explore',
  '探索': 'explore',
  '紧张': 'tense',
  '暗中窥视': 'stalker',
  '职场施压': 'pressure',
  '温柔守望': 'warm',
  '兄控模式': 'brocon',
  '未曾谋面': 'stranger'
};

/** 图鉴静态数据缓存（characters.json） */
var _characters = null;
var _charactersById = {};

/** 详情弹层 DOM（惰性创建） */
var _detailEl = null;
var _detailPortraitEl = null;
var _detailBodyEl = null;

/** 上次亲和度快照（用于变化检测） */
var _lastAffectionMap = {};

/** 前一次 companions 引用，用于 shimmer */
var _prevCompanions = null;

/* ==========================================================================
   CompanionsPanel 单例
   ========================================================================== */

export var CompanionsPanel = {

  /* ======================================================================
     loadCharacters — 加载图鉴数据（失败不阻塞，返回空）
     ====================================================================== */
  loadCharacters: async function () {
    if (_characters) return _characters;
    try {
      var resp = await fetch('data/characters.json');
      if (resp.ok) {
        var data = await resp.json();
        _characters = data.characters || [];
        _charactersById = {};
        _characters.forEach(function (c) { _charactersById[c.id] = c; });
        console.log('[CompanionsPanel] 图鉴数据: ' + _characters.length + ' 人');
      }
    } catch (e) {
      console.warn('[CompanionsPanel] characters.json 加载失败，关系页显示空状态');
    }
    return _characters || [];
  },

  /* ======================================================================
     init — 初始化伙伴面板
     ====================================================================== */
  init: function () {
    var companions = AppState.get('companions');
    _prevCompanions = JSON.parse(JSON.stringify(companions));
    companions.forEach(function (c) {
      _lastAffectionMap[c.id] = c.affection;
    });

    var self = this;
    this.loadCharacters().then(function () { self.render(); });

    // 订阅 companions 变化 → 检测亲和度变化并触发流光
    AppState.subscribe('companions', function (newCompanions) {
      var oldMap = _lastAffectionMap;
      newCompanions.forEach(function (c) {
        if (oldMap[c.id] !== undefined && oldMap[c.id] !== c.affection) {
          CompanionsPanel._triggerAffectionShimmer(c.id);
        }
      });
      newCompanions.forEach(function (c) {
        _lastAffectionMap[c.id] = c.affection;
      });
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
    var self = this;

    if (!_characters || _characters.length === 0) {
      panel.innerHTML =
        '<div class="companions-header">' +
          '<h2 class="companions-title">伙伴</h2>' +
          '<div class="companions-divider"></div>' +
        '</div>' +
        '<div class="companions-empty">图鉴数据加载失败，请检查 data/characters.json</div>';
      return;
    }

    companions.forEach(function (c, index) {
      cardsHtml += self._renderCard(c, index);
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

    // 绑定卡片点击（事件委托）
    var list = panel.querySelector('.companions-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var card = e.target.closest('.companion-card');
        if (card) self._openDetail(card.getAttribute('data-companion-id'));
      });
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderCard — 渲染单个伙伴卡片
     ====================================================================== */
  _renderCard: function (companion, index) {
    var meta = _charactersById[companion.id] || {};
    var name = (companion.unlocked !== false) ? (companion.name || '???') : '???';
    var affection = companion.affection != null ? companion.affection : 0;
    var location = companion.location || '???';
    var status = companion.status || '未知';
    var unlocked = companion.unlocked !== false;
    var background = (meta.background || '').slice(0, 60) + '…';
    var avatar = companion.avatar || meta.avatar || '';

    var theme = (meta.theme && meta.theme.glow) ? meta.theme : DEFAULT_THEME;
    var statusClass = STATUS_CLASS_MAP[status] || 'unknown';
    var cardLockedClass = unlocked ? '' : ' locked';
    var nameLockedClass = unlocked ? '' : ' locked-name';

    var starsHtml = this._renderStars(companion.id, affection, unlocked);

    var animDelay = (0.1 + index * 0.12).toFixed(2) + 's';

    // 头像区：有头像图显示圆形缩略，否则图标占位；未解锁显示剪影
    var portraitHtml;
    if (unlocked && avatar) {
      portraitHtml =
        '<div class="companion-portrait" style="--companion-glow: ' + theme.glow + '; --companion-accent: ' + theme.accent + ';">' +
          '<img src="' + avatar + '" alt="' + this._escapeHtml(name) + '" class="portrait-img portrait-round" loading="lazy">' +
          '<div class="portrait-border"></div>' +
        '</div>';
    } else if (unlocked && !avatar) {
      portraitHtml =
        '<div class="companion-portrait" style="--companion-glow: ' + theme.glow + '; --companion-accent: ' + theme.accent + ';">' +
          '<i data-lucide="user" class="portrait-icon"></i>' +
        '</div>';
    } else {
      portraitHtml =
        '<div class="companion-portrait portrait-locked">' +
          '<i data-lucide="help-circle" class="portrait-icon locked-icon"></i>' +
        '</div>';
    }

    var html =
      '<div class="companion-card' + cardLockedClass + '" data-companion-id="' + this._escapeHtml(companion.id) + '" style="animation-delay: ' + animDelay + ';">' +
        portraitHtml +
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
     详情弹层 — 点击卡片展示全图 + 详细介绍
     ====================================================================== */
  _openDetail: function (companionId) {
    var meta = _charactersById[companionId];
    if (!meta) return;

    var companion = (AppState.get('companions') || []).find(function (c) { return c.id === companionId; });
    if (companion && companion.unlocked === false) return; // 未解锁角色不展示详情
    var affection = companion ? companion.affection : meta.affection;

    if (!_detailEl) this._buildDetailEl();
    if (!_detailEl) return;

    // 全图
    _detailPortraitEl.innerHTML = '';
    var img = new Image();
    img.className = 'detail-intro-img';
    img.alt = meta.name;
    img.src = meta.introImage;
    img.onerror = function () {
      _detailPortraitEl.classList.add('detail-img-missing');
      _detailPortraitEl.textContent = '图片缺失';
    };
    _detailPortraitEl.appendChild(img);

    // 文案
    var body =
      '<h2 class="detail-name">' + this._escapeHtml(meta.name) + '</h2>' +
      '<div class="detail-nicknames">' + this._escapeHtml(meta.nicknames.join(' · ')) + '</div>' +
      '<div class="detail-section"><span class="detail-label">身份</span>' + this._escapeHtml(meta.identities.join('；')) + '</div>' +
      '<div class="detail-section"><span class="detail-label">背景</span>' + this._escapeHtml(meta.background) + '</div>' +
      '<div class="detail-section"><span class="detail-label">性格</span>' + this._escapeHtml(meta.personality) + '</div>' +
      '<div class="detail-section"><span class="detail-label">外貌</span>' + this._escapeHtml(meta.appearance) + '</div>' +
      '<div class="detail-affection">当前好感度：' + affection + ' / 100</div>';
    _detailBodyEl.innerHTML = body;

    _detailEl.classList.add('active');
  },

  _buildDetailEl: function () {
    _detailEl = document.createElement('div');
    _detailEl.id = 'companion-detail';
    _detailEl.innerHTML =
      '<div class="companion-detail-backdrop"></div>' +
      '<button class="companion-detail-close" id="companion-detail-close">关闭 ✕</button>' +
      '<div class="companion-detail-portrait" id="companion-detail-portrait"></div>' +
      '<div class="companion-detail-body" id="companion-detail-body"></div>';
    document.body.appendChild(_detailEl);

    _detailPortraitEl = document.getElementById('companion-detail-portrait');
    _detailBodyEl = document.getElementById('companion-detail-body');

    // 同步到实例属性，供 app.js Esc 分支（CompanionsPanel._detailEl）判断
    this._detailEl = _detailEl;
    this._detailPortraitEl = _detailPortraitEl;
    this._detailBodyEl = _detailBodyEl;

    var self = this;
    document.getElementById('companion-detail-close').addEventListener('click', function () {
      self._closeDetail();
    });
    _detailEl.querySelector('.companion-detail-backdrop').addEventListener('click', function () {
      self._closeDetail();
    });
  },

  _closeDetail: function () {
    if (!_detailEl) return;
    _detailEl.classList.remove('active');
    if (_detailPortraitEl) {
      _detailPortraitEl.innerHTML = '';
      _detailPortraitEl.classList.remove('detail-img-missing');
    }
    if (_detailBodyEl) _detailBodyEl.innerHTML = '';
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
      var fillColor = unlocked ? '#D4A574' : '#555';
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
          '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#' + gradId + ')" stroke="' + (unlocked ? '#D4A574' : '#444') + '" stroke-width="0.5"/>' +
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
