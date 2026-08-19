/**
 * prompt_order 排序编辑器（PromptOrderEditor 的 vanilla 移植）
 * 渲染到容器；onChange(next) 由宿主更新草稿。
 */

import { movePromptItem } from '../editor-utils.js?v=25';
import { el } from './dom.js?v=25';

export function renderPromptOrderEditor(container, value, onChange) {
  if (value.length === 0) {
    container.append(el('div', { class: 'st-hint' },
      '当前预设没有 prompt_order 数组。导入 SillyTavern 预设或新建默认预设以获得标准顺序。'));
    return;
  }

  const list = el('div', { class: 'st-order-list' });

  function renderItems() {
    list.replaceChildren();
    value.forEach((item, idx) => {
      list.append(el('div', { class: 'st-order-item' }, [
        el('input', {
          type: 'checkbox',
          checked: item.enabled !== false,
          on: { change: (e) => {
            const next = value.slice();
            next[idx] = { ...next[idx], enabled: e.target.checked };
            onChange(next);
          } },
        }),
        el('code', { class: 'st-order-id' }, item.identifier),
        el('span', { class: 'st-order-name' }, item.name ?? item.identifier),
        el('button', {
          class: 'st-btn-sm',
          disabled: idx === 0,
          title: '上移',
          on: { click: () => {
            const next = movePromptItem(value, idx, idx - 1);
            if (next !== value) onChange(next);
          } },
        }, '↑'),
        el('button', {
          class: 'st-btn-sm',
          disabled: idx === value.length - 1,
          title: '下移',
          on: { click: () => {
            const next = movePromptItem(value, idx, idx + 1);
            if (next !== value) onChange(next);
          } },
        }, '↓'),
      ]));
    });
  }

  renderItems();
  container.append(list);
}
