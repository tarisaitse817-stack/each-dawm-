/* ==========================================================================
   光之回响 (Echoes of Light) — Particles 粒子系统
   CSS 驱动浮动粒子 + Canvas 战斗粒子预留
   ========================================================================== */

export const Particles = {

  /**
   * 初始化环境粒子系统
   * 在 #particles-canvas 下层创建 #ambient-particles 容器，
   * 生成 20 个浮动粒子点，每个粒子随机位置、大小、动画延迟和浮动半径
   */
  init() {
    // 避免重复创建
    if (document.getElementById('ambient-particles')) return;

    // 创建容器
    var container = document.createElement('div');
    container.id = 'ambient-particles';

    // 插入到 particles-canvas 之前（下层）
    var canvas = document.getElementById('particles-canvas');
    if (canvas && canvas.parentNode) {
      canvas.parentNode.insertBefore(container, canvas);
    } else {
      document.body.appendChild(container);
    }

    // 颜色选项：灵火蓝 / 暖金辉
    var colors = ['#4FC3F7', '#FFD54F'];

    // 生成 20 个粒子
    for (var i = 0; i < 20; i++) {
      var dot = document.createElement('div');
      dot.className = 'particle-dot';

      var size = 2 + Math.random() * 4;           // 2–6px
      var dx = (Math.random() - 0.5) * 80;        // –40 ~ 40px
      var dy = (Math.random() - 0.5) * 80;
      var duration = 3 + Math.random() * 3;        // 3–6s
      var delay = Math.random() * 5;               // 0–5s
      var color = colors[Math.floor(Math.random() * colors.length)];

      dot.style.cssText =
        'left:' + (Math.random() * 100) + '%;' +
        'top:' + (Math.random() * 100) + '%;' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        '--dx:' + dx + 'px;' +
        '--dy:' + dy + 'px;' +
        '--duration:' + duration + 's;' +
        '--delay:' + delay + 's;' +
        'background:' + color + ';';

      container.appendChild(dot);
    }
  },

  /**
   * 战斗粒子爆发（预留 — Task 14 实现完整 Canvas 粒子效果）
   * @param {number} x - 爆发中心 X 坐标
   * @param {number} y - 爆发中心 Y 坐标
   * @param {number} count - 粒子数量
   * @param {string} color - 粒子颜色
   */
  spawnBattleParticles(x, y, count, color) {
    // 预留：Task 14 实现 Canvas 粒子爆发效果
    console.log('[Particles] Battle particle burst at (' + x + ', ' + y + '), count=' + count + ', color=' + color);
  }
};
