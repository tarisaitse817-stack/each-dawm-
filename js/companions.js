/* ==========================================================================
   光之回响 (Echoes of Light) — 伙伴界面模块（重构版）
   用户要求：取消头像+简略介绍/详细介绍；每行 = 角色CG(左) + 名称/好感度/醋意值(右)
   + 「联系」按钮（全屏角色CG + 电话开场白 + AI 根据上下文生成通话内容）
   数据源：data/characters.json（静态图鉴） + AppState companions（运行时好感/状态）
   ========================================================================== */

import { AppState } from './state.js?v=51';
import { AiClient } from './ai.js?v=51';
import { EventPanel } from './event.js?v=51';

/* ==========================================================================
   常量
   ========================================================================== */

/** 图片版本号：换图/重裁后 bump 刷新浏览器缓存 */
const COMPANION_ASSET_V = '1';

/** 默认主题（characters.json 缺 theme 时兜底） */
var DEFAULT_THEME = { glow: 'rgba(212, 165, 116, 0.15)', accent: '#D4A574' };

/** 图鉴静态数据缓存（characters.json） */
var _characters = null;
var _charactersById = {};

/** 电话浮层 DOM（惰性创建） */
var _phoneEl = null;
var _phoneImgEl = null;
var _phoneTextEl = null;
var _phoneStatusEl = null;
var _phoneBusy = false;

/** 上次亲和度快照（用于变化检测） */
var _lastAffectionMap = {};

/** 前一次 companions 引用，用于 shimmer */
var _prevCompanions = null;

/* ==========================================================================
   工具函数
   ========================================================================== */

/** 好感度/醋意值长条（好感度粉红、醋意值紫） */
function _statBar(label, value, fillClass) {
  return '<div class="stat-bar">' +
    '<div class="stat-bar-head"><span class="stat-bar-label">' + label + '</span><span class="stat-bar-value">' + value + ' / 100</span></div>' +
    '<div class="stat-bar-track"><div class="stat-bar-fill ' + fillClass + '" style="width:' + value + '%"></div></div>' +
  '</div>';
}

function _escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

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
      var resp = await fetch('data/characters.json?v=1');
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
      cardsHtml += self._renderRow(c, index);
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

    // 绑定「联系」按钮（事件委托）
    var list = panel.querySelector('.companions-list');
    if (list) {
      list.addEventListener('click', function (e) {
        var btn = e.target.closest('.contact-btn');
        if (btn) self._openPhone(btn.getAttribute('data-companion-id'));
      });
    }

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderRow — 渲染单个伙伴行：CG 左 + 名称/好感度/醋意值/联系 右
     ====================================================================== */
  _renderRow: function (companion, index) {
    var meta = _charactersById[companion.id] || {};
    var unlocked = companion.unlocked !== false;
    var name = unlocked ? (companion.name || '???') : '???';
    var affection = Math.min(100, Math.max(0, Number(companion.affection) || 0));
    var jealousy = Math.min(100, Math.max(0, Number(companion.jealousy) || 0));

    var theme = (meta.theme && meta.theme.glow) ? meta.theme : DEFAULT_THEME;
    var animDelay = (0.1 + index * 0.12).toFixed(2) + 's';

    // CG 区：有 CG 显示全图；未解锁显示剪影
    var cgHtml;
    if (unlocked && meta.introImage) {
      cgHtml = '<img src="' + meta.introImage + '?v=' + COMPANION_ASSET_V + '" alt="' + _escapeHtml(name) + '" class="companion-cg-img" loading="lazy">';
    } else if (unlocked && !meta.introImage) {
      cgHtml = '<i data-lucide="image-off" class="companion-cg-icon"></i>';
    } else {
      cgHtml = '<i data-lucide="help-circle" class="companion-cg-icon"></i>';
    }

    // 右侧信息：名称 + 好感度 + 醋意值 + 联系按钮（未解锁不显示）
    var statsHtml = unlocked
      ? _statBar('好感度', affection, 'fill-affection') + _statBar('醋意值', jealousy, 'fill-jealousy')
      : '<div class="companion-desc">尚未解锁</div>';
    var contactHtml = unlocked
      ? '<button class="contact-btn" data-companion-id="' + _escapeHtml(companion.id) + '">联系</button>'
      : '';

    var html =
      '<div class="companion-card' + (unlocked ? '' : ' locked') + '" data-companion-id="' + _escapeHtml(companion.id) + '" style="animation-delay: ' + animDelay + '; --companion-glow: ' + theme.glow + '; --companion-accent: ' + theme.accent + ';">' +
        '<div class="companion-cg">' + cgHtml + '</div>' +
        '<div class="companion-info">' +
          '<div class="companion-name' + (unlocked ? '' : ' locked-name') + '">' + _escapeHtml(name) + '</div>' +
          statsHtml +
          '<div class="companion-actions">' + contactHtml + '</div>' +
        '</div>' +
      '</div>';

    return html;
  },

  /* ======================================================================
     电话浮层 — 「联系」按钮：全屏角色CG + 固定开场白 + AI 按上下文生成通话
     ====================================================================== */
  _openPhone: function (companionId) {
    var meta = _charactersById[companionId];
    if (!meta || _phoneBusy) return;

    var companion = (AppState.get('companions') || []).find(function (c) { return c.id === companionId; });
    if (companion && companion.unlocked === false) return; // 未解锁角色不可联系
    var name = companion ? companion.name : meta.name;

    if (!_phoneEl) this._buildPhoneEl();
    if (!_phoneEl) return;

    _phoneImgEl.style.display = '';
    _phoneImgEl.src = meta.introImage + '?v=' + COMPANION_ASSET_V;
    _phoneImgEl.onerror = function () { _phoneImgEl.style.display = 'none'; };
    _phoneTextEl.innerHTML = '';
    _phoneStatusEl.textContent = '';

    // 过渡动画：先强制渲染隐藏态，再切 active
    _phoneEl.classList.remove('active');
    void _phoneEl.offsetHeight;
    _phoneEl.classList.add('active');

    // 固定开场白（用户文案）
    var fixedLine = '你向' + name + '打了个电话，几乎是瞬间般的，电话被接起';
    _appendPhoneLine(fixedLine, 'phone-line-player');
    EventPanel.pushNarrativeQuietly('（行动）' + fixedLine);

    _phoneBusy = true;
    var state = AppState.get();
    var aiOn = state.settings && state.settings.aiEnabled !== false;
    if (!aiOn) {
      _appendPhoneLine('api连接错误，检查一下api哦~', 'phone-line-ai');
      _phoneBusy = false;
      return;
    }

    _phoneStatusEl.textContent = '… 电话接通中';
    var prompt = '（系统提示：你正在与' + name + '通电话，电话几乎是瞬间就被接起。请完全以' + name + '的口吻，结合她的性格与当前情境，输出她接起电话后说的1-3句话，直接输出对话内容，不要旁白，不要任何标签。）';
    AiClient.chat(prompt).then(function (result) {
      _phoneStatusEl.textContent = '';
      _appendPhoneLine(result.narrative, 'phone-line-ai');
      EventPanel.pushNarrativeQuietly('（电话）' + name + '：' + result.narrative);
      _phoneBusy = false;
    }).catch(function (err) {
      _phoneStatusEl.textContent = '';
      _appendPhoneLine('api连接错误，检查一下api哦~', 'phone-line-ai');
      _phoneBusy = false;
    });
  },

  _buildPhoneEl: function () {
    _phoneEl = document.createElement('div');
    _phoneEl.id = 'phone-call-overlay';
    _phoneEl.innerHTML =
      '<div class="phone-backdrop"></div>' +
      '<button class="phone-close" id="phone-close">挂断 ✕</button>' +
      '<img class="phone-cg" id="phone-cg" alt="">' +
      '<div class="phone-panel">' +
        '<div class="phone-text" id="phone-text"></div>' +
        '<div class="phone-status" id="phone-status"></div>' +
      '</div>';
    document.body.appendChild(_phoneEl);

    _phoneImgEl = document.getElementById('phone-cg');
    _phoneTextEl = document.getElementById('phone-text');
    _phoneStatusEl = document.getElementById('phone-status');

    // 同步到实例属性，供 app.js Esc 分支（CompanionsPanel._phoneEl）判断
    this._phoneEl = _phoneEl;

    var self = this;
    document.getElementById('phone-close').addEventListener('click', function () {
      self._closePhone();
    });
    _phoneEl.querySelector('.phone-backdrop').addEventListener('click', function () {
      self._closePhone();
    });
  },

  _closePhone: function () {
    if (!_phoneEl) return;
    _phoneEl.classList.remove('active');
    if (_phoneImgEl) { _phoneImgEl.src = ''; }
    if (_phoneTextEl) _phoneTextEl.innerHTML = '';
    if (_phoneStatusEl) _phoneStatusEl.textContent = '';
    _phoneBusy = false;
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
  }
};

/* ==========================================================================
   电话浮层工具
   ========================================================================== */

function _appendPhoneLine(text, cls) {
  if (!_phoneTextEl) return;
  var el = document.createElement('div');
  el.className = 'phone-line ' + (cls || '');
  el.textContent = text;
  _phoneTextEl.appendChild(el);
  _phoneTextEl.scrollTop = _phoneTextEl.scrollHeight;
}
