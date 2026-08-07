/* ==========================================================================
   都市地图 — 城郊·家·公司·超市·商业街·小吃街·牌店
   ========================================================================== */

import { AppState } from './state.js';

/** 地点 → 背景图映射 */
var LOCATION_BG = {
  'card_shop': 'assets/backgrounds/card_shop.jpg',
  'suburb':    'assets/backgrounds/suburb.jpg',
  'home':      'assets/backgrounds/home.jpg',
  'market':    'assets/backgrounds/market.jpg',
  'company':   'assets/backgrounds/company.jpg',
  'food':      'assets/backgrounds/food.jpg',
  'mall':      'assets/backgrounds/mall.jpg'
};

/** 切换地点背景图 */
function setLocationBg(locId) {
  var bgEl = document.getElementById('location-bg');
  if (!bgEl) return;
  var src = LOCATION_BG[locId];
  if (!src) return;

  // 交叉淡入淡出：先淡出，换图，再淡入
  bgEl.classList.remove('active');
  setTimeout(function () {
    bgEl.style.backgroundImage = 'url("' + src + '")';
    bgEl.classList.add('active');
  }, 300);
}

var LOCATIONS = [
  { id: 'card_shop', name: '牌店', icon: 'disc',       x: 50, y: 80, color: '#E0B0FF',
    desc: '街角的老牌店，空调总是开得很足，空气里弥漫着卡包开封后的油墨香。几个常客趴在桌上组牌，偶尔为一张卡的强度争得面红耳赤。这里是你的根据地——你的故事，就从这张磨损的牌桌开始。' },
  { id: 'suburb', name: '城郊',   icon: 'tree-pine',    x: 15, y: 18, color: '#A5D6A7',
    desc: '远离市中心的水泥森林，这里只有低矮的平房和一条不知名的小河。河水很浅，清澈得能看见底下的鹅卵石。傍晚时分的风凉凉的，草丛里偶尔传来窸窣的水声——好像有什么人正躲在叶片后面偷偷看着你。' },
  { id: 'home',    name: '家',     icon: 'home',        x: 25, y: 55, color: '#D4A574',
    desc: '你的出租屋，不大但足够遮风挡雨。角落里摆着一个空荡荡的大鱼缸，月光透过窗帘投下淡淡的光影。白月霸占了沙发，冰箱里塞满了苏昀偷偷多放的布丁。在这个处处潜伏着疯狂的都市里，只有这扇门后面是安全的。' },
  { id: 'market',  name: '超市',   icon: 'store',        x: 35, y: 35, color: '#B9F6CA',
    desc: '街角的便利超市，自动门永远叮咚作响。货架上整齐码着关东煮、便当和你最爱的那款薯片。收银台后面的店长总是穿着一袭白裙，彩虹色的长发松松地挽在脑后。你每次来，她都能从柜台下面"恰好"拿出你昨天念叨过的东西。' },
  { id: 'company', name: '公司',   icon: 'building-2',   x: 70, y: 25, color: '#80D8FF',
    desc: '一栋灰色的写字楼，你在这里消磨掉每周四十个小时的生命。林仪的总裁办公室在顶层，柳月的工位就在你斜对面——她总能找到各种理由跑过来问你"不会用复印机"。小心，这里的每一个眼神都藏着你看不见的暗流。' },
  { id: 'food',    name: '小吃街', icon: 'utensils',     x: 80, y: 45, color: '#FFAB40',
    desc: '一条永远飘着香气的小巷，蒸汽从各家摊位的蒸笼里咕嘟咕嘟地冒出来。刚出笼的包子白嫩嫩的，一个金发的女孩系着围裙在摊位前忙得脚不沾地，偶尔抬起手背擦擦汗。她的呆毛总是比她的脑子先一步注意到你。' },
  { id: 'mall',    name: '商业街', icon: 'shopping-bag', x: 65, y: 65, color: '#FF80AB',
    desc: '城市的商业动脉，霓虹灯和橱窗把整条街照得五光十色。咖啡店、服装店、还有一家总是挤满人的甜品屋。傍晚时分，下班的年轻人们在这里闲逛放松——但某个粉色头发的女孩可能正悄悄跟在你身后十步远的地方。' }
];

var _currentLocation = 'card_shop';

export var MapPanel = {
  init: function () {
    this.render();
    // 显示初始地点背景
    setLocationBg(_currentLocation);
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
            // 牌店 → 家 → 城郊
            '<line x1="50" y1="80" x2="25" y2="55" stroke="rgba(255,255,255,0.18)" stroke-width="0.35"/>' +
            '<line x1="25" y1="55" x2="15" y2="18" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            // 家 → 超市 → 公司
            '<line x1="25" y1="55" x2="35" y2="35" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="35" y1="35" x2="70" y2="25" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            // 牌店 → 商业街 → 小吃街
            '<line x1="50" y1="80" x2="65" y2="65" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            '<line x1="65" y1="65" x2="80" y2="45" stroke="rgba(255,255,255,0.15)" stroke-width="0.3"/>' +
            // 超市 → 小吃街（横向连接）
            '<line x1="35" y1="35" x2="80" y2="45" stroke="rgba(255,255,255,0.10)" stroke-width="0.2" stroke-dasharray="1,2"/>' +
            // 公司 → 小吃街
            '<line x1="70" y1="25" x2="80" y2="45" stroke="rgba(255,255,255,0.12)" stroke-width="0.25"/>' +
          '</svg>' +
        '</div>' +
        '<div class="city-locs">' + dots + '</div>' +
      '</div>' +
      '<div class="city-info">' +
        '<div class="city-info-item">📍 当前位置：<strong>' + self._getLocName(_currentLocation) + '</strong></div>' +
        '<div class="city-info-desc">' + self._getLocDesc(_currentLocation) + '</div>' +
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

  _getLocDesc: function (id) {
    for (var i = 0; i < LOCATIONS.length; i++) {
      if (LOCATIONS[i].id === id) return LOCATIONS[i].desc || '';
    }
    return '';
  },

  _travel: function (toId) {
    var fromName = this._getLocName(_currentLocation);
    var toName = this._getLocName(toId);
    _currentLocation = toId;

    // 切换地点背景
    setLocationBg(toId);

    // Add travel narrative
    var history = AppState.get('narrativeHistory') || [];
    var travelMsg;
    if (toId === 'home') {
      travelMsg = '你推开家门，熟悉的温暖气息扑面而来。房间里静悄悄的，只有窗外的街灯在窗帘上投下淡淡的影子。鱼缸空荡荡地摆在角落，水面泛着细碎的光。';
    } else if (toId === 'company') {
      travelMsg = '你挤过早高峰的地铁，拖着疲惫的身躯走进公司大楼。打卡机的电子音在空荡的大厅里回响——今天又是不折不扣的社畜日常。';
    } else if (toId === 'mall') {
      travelMsg = '商业街上人来人往，各种店铺的招牌在阳光下闪闪发光。空气中混杂着咖啡香和烤面包的气味，不远处似乎有人在朝你招手。';
    } else if (toId === 'market') {
      travelMsg = '便利店的自动门叮咚一声打开。店里飘着关东煮的暖意，收银台后面传来一声轻轻的"欢迎光临"，货架间隐约能看到一抹彩虹色的发丝。';
    } else if (toId === 'food') {
      travelMsg = '小吃街上飘着各种诱人的香气。刚出笼的包子冒着白蒙蒙的热气，一个围着围裙的金发身影在摊位间忙前忙后，偶尔抬起手臂擦擦额头的汗。';
    } else if (toId === 'card_shop') {
      travelMsg = '推开牌店的玻璃门，熟悉的空调凉意混着卡包的味道扑面而来。柜台后面的展示柜里陈列着各种稀有卡牌，墙上的决斗垫微微泛着磨损的光泽。这是你每周都会消磨几个下午的老地方。';
    } else if (toId === 'suburb') {
      travelMsg = '走出城区，高楼逐渐被低矮的民房取代。城郊的空气清冷了许多，远处能听见不知从哪条小河流来的潺潺水声。路边的草丛在微风里轻轻摇曳，好像有什么东西正躲在叶片后面。';
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
      var infoDesc = panel.querySelector('.city-info-desc');
      if (infoDesc) infoDesc.textContent = self._getLocDesc(toId);
    }
  }
};
