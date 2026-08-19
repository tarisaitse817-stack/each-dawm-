/**
 * 世界书管理面板（LorebookModal 的 vanilla 移植）
 */

import { sillytavernStore } from '../store.js?v=47';
import { getDatabase } from '../database.js?v=47';
import { importMultipleLorebooks, renameLorebook } from '../importer.js?v=47';
import { createDefaultLorebook } from '../editor-utils.js?v=47';
import { el, makeOverlay, showToast } from './dom.js?v=47';
import { openLorebookEditorModal } from './lorebook-editor-modal.js?v=47';

export function openLorebookModal() {
  const db = getDatabase();
  const { panel, close } = makeOverlay(() => { cleanup(); }, { zIndex: 1110 });
  panel.classList.add('st-lorebooks');

  const listBox = el('div', { class: 'st-lorebook-list' });

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, '世界书'),
      el('button', { class: 'st-close', on: { click: () => close() } }, '×'),
    ]),
    el('div', { class: 'st-toolbar' }, [
      el('button', {
        class: 'st-btn',
        on: { click: () => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;
          input.accept = '.json';
          input.onchange = async (e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length === 0) return;
            const inputs = await Promise.all(
              files.map(async (f) => ({ fileName: f.name, json: JSON.parse(await f.text()) }))
            );
            const { successes, failures } = importMultipleLorebooks(inputs);
            for (const s of successes) {
              await db.lorebooks.add({
                ...s.lorebook,
                id: crypto.randomUUID(),
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            }
            if (failures.length) {
              alert('导入失败：\n' + failures.map((f) => `${f.fileName}: ${f.error}`).join('\n'));
            }
            showToast(`导入完成：${successes.length} 成功${failures.length ? `，${failures.length} 失败` : ''}`);
            render();
            e.target.value = '';
          };
          input.click();
        } },
      }, '批量导入 JSON'),
      el('span', { class: 'st-hint' }, '支持多选 .json 文件'),
      el('button', {
        class: 'st-btn st-btn-green',
        on: { click: async () => {
          const name = prompt('新世界书名称', '新世界书');
          if (!name) return;
          const lb = createDefaultLorebook(name);
          await db.lorebooks.add(lb);
          render();
          openLorebookEditorModal(lb, () => render());
        } },
      }, '+ 新建'),
    ]),
    listBox,
  );

  function render() {
    listBox.replaceChildren();
    const lorebooks = sillytavernStore.lorebooks;
    const activeIds = new Set(sillytavernStore.activeLorebookIds);

    if (lorebooks.length === 0) {
      listBox.append(el('div', { class: 'st-empty' }, '暂无世界书,请导入 JSON 文件或点击「+ 新建」'));
      return;
    }

    for (const lb of lorebooks) {
      listBox.append(el('div', { class: 'st-lorebook-item' }, [
        el('label', { class: 'st-lorebook-head' }, [
          el('input', {
            type: 'checkbox',
            checked: activeIds.has(lb.id),
            on: { change: () => sillytavernStore.toggleLorebook(lb.id) },
          }),
          el('span', { class: 'st-lorebook-name', title: lb.name }, lb.name),
          el('span', { class: 'st-lorebook-count' }, `${lb.entries.length} 条`),
        ]),
        el('div', { class: 'st-lorebook-actions' }, [
          el('button', {
            class: 'st-btn-sm',
            on: { click: async () => {
              const v = prompt('新名称', lb.name);
              if (!v || v === lb.name) return;
              const existing = await db.lorebooks.where('name').equals(v).first();
              if (existing && existing.id !== lb.id) {
                const action = confirm(`已存在名为 "${v}" 的世界书。\n确定 = 合并（覆盖）\n取消 = 重新输入`);
                if (action) {
                  await db.lorebooks.delete(existing.id);
                  await db.lorebooks.put(renameLorebook(lb, v));
                } else {
                  return;
                }
              } else {
                await db.lorebooks.put(renameLorebook(lb, v));
              }
              render();
            } },
          }, '重命名'),
          el('button', {
            class: 'st-btn-sm',
            on: { click: () => openLorebookEditorModal(lb, () => render()) },
          }, '✎ 编辑'),
          el('button', {
            class: 'st-btn-sm st-btn-danger',
            on: { click: async () => {
              if (!confirm(`确定删除世界书 "${lb.name}"？`)) return;
              await sillytavernStore.deleteLorebook(lb.id);
              render();
            } },
          }, '删除'),
        ]),
      ]));
    }
  }

  const unsub = sillytavernStore.subscribe(render);
  function cleanup() { unsub(); }

  render();
  return { close };
}
