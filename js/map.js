/* ==========================================================================
   都市地图 — 家·公司·商业街·超市·小吃街
   ========================================================================== */

import { AppState } from './state.js';

var LOCATIONS = [
  { id: 'home',    name: '家',     icon: 'home',        x: 20, y: 55, color: '#FFD54F' },
  { id: 'company', name: '公司',   icon: 'building-2',   x: 70, y: 25, color: '#80D8FF' },
  { id: 'mall',    name: '商业街', icon: 'shopping-bag', x: 60, y: 65, color: '#FF80AB' },
  { id: 'market',  name: '超市',   icon: 'store',        x: 35, y: 25, color: '#B9F6CA' },
  { id: 'food',    name: '小吃街', icon: 'utensils',     x: 80, y: 50, color: '#FFAB40' }
];

var _currentLocation = 'home';

export var MapPanel = {
  init: function () {
    this.render();
    // 同步到 state（保持兼容）
    var nodes = LOCATIONS.map(function (l) {
      return { id: l.id, name: l.name, type: 'city', x: l.x, y: l.y, status: l.id === _currentLocation ? 'completed' : 'available', connections: [], desc: '' };
    });
    AppState.set('mapNodes', nodes);
  },

  render: function () {
    var panel = document.getElementById('panel-map');
    if (!panel) return;

    var self = this;
    var dots = LOCATIONS.map(function (loc) {
      var isHere = loc.id === _currentLocation;
      return '<div class="city-loc' + (isHere ? ' here' : '') + '" ' +
        'style="left:' + loc.x + '%;top:' + loc.y + '%;border-color:' + loc.color + '" ' +
        'data-id="' + loc.id + '">' +
        '<div class="city-loc-dot" style="background:' + loc.color + '"></div>' +
        '<span class="city-loc-label">' + loc.name + '</span>' +
        (isHere ? '<span class="city-loc-here">📍</span>' : '') +
        '</div>';
    }).join('');

    panel.innerHTML =
      '<div class="city-map">' +
        '<div class="city-map-bg">' +
          // Simple road lines
          '<svg class="city-roads" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            '<line x1="20" y1="55" x2="35" y2="25" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="35" y1="25" x2="70" y2="25" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="20" y1="55" x2="60" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="60" y1="65" x2="80" y2="50" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="70" y1="25" x2="80" y2="50" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="20" y1="55" x2="70" y2="25" stroke="rgba(255,255,255,0.10)" stroke-width="0.2" stroke-dasharray="1,2"/>' +
          '</svg>' +
        '</div>' +
        '<div class="city-locs">' + dots + '</div>' +
      '</div>' +
      '<div class="city-info">' +
        '<div class="city-info-item">📍 当前位置：<strong>' + self._getLocName(_currentLocation) + '</strong></div>' +
        '<div class="city-info-item">🏠 安全屋里，塞壬正在等你回家</div>' +
      '</div>';

    // Bind click events
    var self2 = this;
    panel.querySelectorAll('.city-loc').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.dataset.id;
        if (id !== _currentLocation) {
          self2._travel(id);
        }
      });
    });

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  _getLocName: function (id) {
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === id) return LOCATIONS[i].name;
    }
    return '未知';
  },

  _travel: function (toId) {
    var fromName = this._getLocName(_currentLocation);
    var toName = this._getLocName(toId);
    _currentLocation = toId;

    // Add travel narrative
    var history = AppState.get('narrativeHistory') || [];
    var travelMsg;
    if (toId === 'home') {
      travelMsg = '你推开家门，熟悉的温暖气息扑面而来。鱼缸里的塞壬听到动静，紫色的眼眸立刻亮了起来。';
    } else if (toId === 'company') {
      travelMsg = '你挤过早高峰的地铁，拖着疲惫的身躯走进公司大楼。今天又是一天的社畜生活。';
    } else if (toId === 'mall') {
      travelMsg = '商业街上人来人往，各种店铺的招牌在阳光下闪闪发光。不远处似乎有人在朝你招手。';
    } else if (toId === 'market') {
      travelMsg = '便利店的自动门叮咚一声打开。收银台后面，虹天气惊喜地抬起头，彩虹色的刘海微微颤动。';
    } else if (toId === 'food') {
      travelMsg = '小吃街上飘着各种诱人的香气。艾克利西娅正系着围裙在包子铺门口忙碌，看到你走过来，呆毛猛地竖起。';
    }
    if (travelMsg) {
      history.push(travelMsg);
      AppState.set('narrativeHistory', history);
    }

    // 回家时推进时间到晚上
    if (toId === 'home' && window.App && typeof window.App.advanceTime === 'function') {
      window.App.advanceTime(180); // +3 hours
    }

    // 刷新地图
    var panel = document.getElementById('panel-map');
    if (panel) {
      var self = this;
      panel.querySelectorAll('.city-loc').forEach(function (el) {
        el.classList.toggle('here', el.dataset.id === _currentLocation);
        var hereMark = el.querySelector('.city-loc-here');
        if (el.dataset.id === _currentLocation && !hereMark) {
          var mark = document.createElement('span');
          mark.className = 'city-loc-here';
          mark.textContent = '📍';
          el.appendChild(mark);
        } else if (el.dataset.id !== _currentLocation && hereMark) {
          hereMark.remove();
        }
      });
      var infoLoc = panel.querySelector('.city-info-item strong');
      if (infoLoc) infoLoc.textContent = toName;
    }
  }
};
