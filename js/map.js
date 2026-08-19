/* ==========================================================================
   光之回响 (Echoes of Light) — 地图系统
   展示全部 16 个场景（缩略背景+名称），玩家点击即进入所选场景。
   进入走统一 travelTo 流程：翻页动画 + 自动对话输入态 + AI 旁白。
   ========================================================================== */

import { SCENES } from './scenes-data.js?v=29';
import { SceneView } from './scene.js?v=29';
import { AppState } from './state.js?v=29';
import { el, makeOverlay } from './sillytavern/ui/dom.js?v=29';

export function openMap() {
  const { panel, close } = makeOverlay(() => {}, { zIndex: 1105, center: true });
  panel.classList.add('map-panel');

  const currentId = AppState.get('currentSceneId');
  const grid = el('div', { class: 'map-grid' });

  for (const scene of Object.values(SCENES)) {
    const isCurrent = scene.id === currentId;
    const card = el('div', {
      class: 'map-card' + (isCurrent ? ' current' : ''),
      title: scene.description || scene.name,
      on: {
        click: () => {
          if (isCurrent) { close(); return; } // 已在当前场景
          // 用户要求：选图过渡动画 —— 中间缩略图迅速放大占满全屏，再切入场景
          const rect = card.getBoundingClientRect();
          close();
          zoomToScene(scene, rect, function () {
            SceneView.travelTo(scene.id, null, { instantBg: true });
          });
        },
      },
    }, [
      el('div', { class: 'map-card-bg', style: { backgroundImage: `url('${scene.bg}')` } }),
      el('div', { class: 'map-card-name' }, scene.name),
      isCurrent && el('div', { class: 'map-card-here' }, '当前'),
    ]);
    grid.append(card);
  }

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, '地图'),
      el('span', { style: { flex: 1 } }),
      el('button', { class: 'st-close', on: { click: () => close() } }, '×'),
    ]),
    el('div', { class: 'map-body' }, grid),
  );

  return { close };
}

/**
 * 缩略图放大入场动画（用户要求）：选中的地图卡从原位置（FLIP）迅速放大
 * 占满整个屏幕（~0.55s），完成后回调切换场景。
 * @param {Object} scene - 目标场景
 * @param {DOMRect} cardRect - 卡片在屏幕上的位置
 * @param {Function} onDone - 缩放完成回调
 */
function zoomToScene(scene, cardRect, onDone) {
  const overlay = document.createElement('div');
  overlay.id = 'map-zoom';
  overlay.style.backgroundImage = `url('${scene.bg}')`;
  // FLIP：起点 = 卡片中心，缩放 = 卡片尺寸/视口尺寸
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const dx = (cardRect.left + cardRect.width / 2) - vw / 2;
  const dy = (cardRect.top + cardRect.height / 2) - vh / 2;
  const sx = cardRect.width / vw;
  const sy = cardRect.height / vh;
  overlay.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
  overlay.style.borderRadius = '10px';
  document.body.appendChild(overlay);
  void overlay.offsetHeight; // 起点帧生效
  overlay.classList.add('zooming'); // 过渡到全屏
  setTimeout(function () {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    if (onDone) onDone();
  }, 620);
}
