/**
 * 单本世界书条目编辑器（LorebookEditorModal 的 vanilla 移植）
 */

import { createDefaultEntry, updateEntry, removeEntry } from '../editor-utils.js?v=39';
import { saveLorebook } from '../database.js?v=39';
import { el, makeOverlay } from './dom.js?v=39';
import { renderEntryForm } from './entry-form.js?v=39';

function entryLabel(e) {
  if (e.comment?.trim()) return e.comment;
  if (e.content.trim()) return e.content.trim().slice(0, 30);
  if (e.keys.length) return e.keys.join(', ');
  return '(未命名条目)';
}

export function openLorebookEditorModal(lorebook, onSaved) {
  let draft = JSON.parse(JSON.stringify(lorebook)); // 深拷贝编辑副本
  let selectedId = lorebook.entries[0]?.id ?? null;

  const { panel, close } = makeOverlay(() => { cleanup(); }, { zIndex: 1200, center: true });
  panel.classList.add('st-editor');

  const nameInput = el('input', { class: 'st-input st-editor-name', type: 'text', value: draft.name });
  const saveBtn = el('button', { class: 'st-btn st-btn-green', on: { click: handleSave } }, '保存');
  const entryList = el('div', { class: 'st-editor-list' });
  const formBox = el('div', { class: 'st-editor-form' });

  function isDirty() {
    return (
      draft.name !== lorebook.name ||
      draft.entries.length !== lorebook.entries.length ||
      draft.entries.some((e, i) => e !== lorebook.entries[i]) ||
      draft.recursiveScanning !== lorebook.recursiveScanning ||
      draft.caseSensitive !== lorebook.caseSensitive ||
      draft.matchWholeWords !== lorebook.matchWholeWords
    );
  }

  function tryClose() {
    if (isDirty() && !confirm('放弃未保存的修改?')) return;
    close();
  }

  async function handleSave() {
    try {
      await saveLorebook(draft);
      onSaved && onSaved();
      close();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  }

  function renderList() {
    entryList.replaceChildren(
      el('button', {
        class: 'st-btn',
        on: { click: () => {
          const e = createDefaultEntry();
          draft = { ...draft, entries: [...draft.entries, e], updatedAt: Date.now() };
          selectedId = e.id;
          renderAll();
        } },
      }, '+ 新建条目'),
    );
    if (draft.entries.length === 0) {
      entryList.append(el('div', { class: 'st-empty' }, '暂无条目,点上方按钮新建'));
      return;
    }
    for (const e of draft.entries) {
      entryList.append(el('div', {
        class: 'st-editor-entry' + (e.id === selectedId ? ' active' : ''),
        on: { click: () => { selectedId = e.id; renderAll(); } },
      }, [
        el('span', { class: 'st-editor-entry-label' }, entryLabel(e)),
        el('button', {
          class: 'st-editor-entry-x',
          title: '删除',
          on: { click: (ev) => {
            ev.stopPropagation();
            if (!confirm('确定删除此条目?')) return;
            draft = removeEntry(draft, e.id);
            if (selectedId === e.id) {
              const remaining = draft.entries.filter((x) => x.id !== e.id);
              selectedId = remaining[0]?.id ?? null;
            }
            renderAll();
          } },
        }, '×'),
      ]));
    }
  }

  function renderForm() {
    formBox.replaceChildren();
    const selected = draft.entries.find((e) => e.id === selectedId) ?? null;
    if (!selected) {
      formBox.append(el('div', { class: 'st-empty' }, '选择左侧条目或新建一条'));
      return;
    }
    renderEntryForm(formBox, selected, (patch) => {
      draft = updateEntry(draft, selected.id, patch);
      refreshSaveState();
    });
  }

  function refreshSaveState() {
    const dirty = isDirty();
    saveBtn.disabled = !dirty;
    saveBtn.classList.toggle('disabled', !dirty);
  }

  function renderAll() {
    nameInput.value = draft.name;
    renderList();
    renderForm();
    refreshSaveState();
  }

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, '编辑世界书:'),
      nameInput,
      saveBtn,
      el('button', { class: 'st-close', on: { click: tryClose } }, '×'),
    ]),
    el('div', { class: 'st-editor-main' }, [entryList, formBox]),
    el('footer', { class: 'st-editor-footer' }, [
      el('label', {}, [
        el('input', {
          type: 'checkbox',
          checked: draft.recursiveScanning,
          on: { change: (e) => {
            draft = { ...draft, recursiveScanning: e.target.checked, updatedAt: Date.now() };
            refreshSaveState();
          } },
        }),
        ' 递归扫描',
      ]),
      el('label', {}, [
        el('input', {
          type: 'checkbox',
          checked: draft.caseSensitive,
          on: { change: (e) => {
            draft = { ...draft, caseSensitive: e.target.checked, updatedAt: Date.now() };
            refreshSaveState();
          } },
        }),
        ' 区分大小写',
      ]),
      el('label', {}, [
        el('input', {
          type: 'checkbox',
          checked: draft.matchWholeWords,
          on: { change: (e) => {
            draft = { ...draft, matchWholeWords: e.target.checked, updatedAt: Date.now() };
            refreshSaveState();
          } },
        }),
        ' 全词匹配',
      ]),
    ]),
  );

  nameInput.addEventListener('input', () => {
    draft = { ...draft, name: nameInput.value, updatedAt: Date.now() };
    refreshSaveState();
  });

  function cleanup() { /* 无订阅 */ }

  renderAll();
  return { close };
}
