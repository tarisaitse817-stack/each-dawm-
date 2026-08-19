/* ==========================================================================
   光之回响 (Echoes of Light) — 地图系统
   展示全部 16 个场景（缩略背景+名称），玩家点击即进入所选场景。
   进入走统一 travelTo 流程：翻页动画 + 自动对话输入态 + AI 旁白。
   ========================================================================== */

import { SCENES } from './scenes-data.js?v=25';
import { SceneView } from './scene.js?v=25';
import { AppState } from './state.js?v=25';
import { el, makeOverlay } from './sillytavern/ui/dom.js?v=25';

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
          close();
          // 从地图进入：翻页方向用 bottom（页面上翻入场）
          SceneView.travelTo(scene.id, 'bottom');
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
