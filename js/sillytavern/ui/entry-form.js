/**
 * 世界书条目字段编辑器（EntryForm 的 vanilla 移植）
 * 渲染到给定容器；onChange(patch) 由宿主更新草稿。
 */

import { clampNumber } from '../editor-utils.js?v=35';
import { el, fieldRow } from './dom.js?v=35';

const POSITIONS = [
  { value: 'before_char', label: 'before_char (角色前)' },
  { value: 'after_char', label: 'after_char (角色后)' },
  { value: 'before_example', label: 'before_example (示例前)' },
  { value: 'after_example', label: 'after_example (示例后)' },
  { value: 'at_depth', label: 'at_depth (按深度)' },
  { value: 'example_msg_top', label: 'example_msg_top' },
  { value: 'example_msg_bottom', label: 'example_msg_bottom' },
  { value: 'outlet', label: 'outlet' },
];

const LOGICS = [
  { value: 'and_any', label: 'and_any (与/任一)' },
  { value: 'not_all', label: 'not_all (非全部)' },
  { value: 'not_any', label: 'not_any (无任一)' },
  { value: 'and_all', label: 'and_all (与/全部)' },
];

function chipInput(value, onChange, placeholder) {
  const box = el('div', { class: 'st-chips' });

  function renderChips() {
    box.replaceChildren();
    value.forEach((v, i) => {
      box.append(el('span', { class: 'st-chip' }, [
        v,
        el('button', {
          class: 'st-chip-x',
          title: '移除',
          on: { click: () => onChange(value.filter((_, j) => j !== i)) },
        }, '×'),
      ]));
    });
    box.append(el('input', {
      class: 'st-chip-input',
      type: 'text',
      placeholder: placeholder ?? '回车添加',
      on: {
        keydown: (e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        },
        blur: add,
      },
    }));
  }

  function add() {
    const input = box.querySelector('.st-chip-input');
    if (!input) return;
    const v = input.value.trim();
    if (!v || value.includes(v)) { renderChips(); return; }
    onChange([...value, v]);
  }

  renderChips();
  return box;
}

const CHAR_MATCH_FIELDS = [
  ['matchPersonaDescription', '人设描述'],
  ['matchCharacterDescription', '角色描述'],
  ['matchCharacterPersonality', '角色性格'],
  ['matchCharacterDepthPrompt', '角色深度提示'],
  ['matchScenario', '场景'],
  ['matchCreatorNotes', '创建者备注'],
];

export function renderEntryForm(container, value, onChange) {
  const isAtDepth = value.position === 'at_depth';

  container.append(
    el('div', { class: 'st-entry-form' }, [
      fieldRow('关键词 (主)', chipInput(value.keys, (keys) => onChange({ keys }))),
      fieldRow('次级关键词 (selective 时启用)', chipInput(value.secondaryKeys, (secondaryKeys) => onChange({ secondaryKeys }))),
      fieldRow('备注 (comment)', el('input', {
        class: 'st-input',
        type: 'text',
        value: value.comment ?? '',
        placeholder: '留空时使用内容前 30 字',
        on: { input: (e) => onChange({ comment: e.target.value }) },
      })),
      fieldRow('内容 (content)', el('textarea', {
        class: 'st-textarea st-entry-content',
        on: { input: (e) => onChange({ content: e.target.value }) },
      }, value.content)),

      el('div', { class: 'st-row' }, [
        fieldRow('位置 (position)', el('select', {
          class: 'st-select',
          on: { change: (e) => onChange({ position: e.target.value }) },
        }, POSITIONS.map((p) => el('option', { value: p.value, selected: value.position === p.value }, p.label)))),
        isAtDepth && fieldRow('深度 (depth)', el('input', {
          class: 'st-input st-num',
          type: 'number',
          value: value.depth ?? 4,
          on: { input: (e) => onChange({ depth: clampNumber(e.target.value, 0, 999, 4) }) },
        })),
        isAtDepth && fieldRow('角色 (role)', el('select', {
          class: 'st-select',
          on: { change: (e) => onChange({ role: Number(e.target.value) }) },
        }, [
          el('option', { value: 0, selected: (value.role ?? 0) === 0 }, 'system'),
          el('option', { value: 1, selected: value.role === 1 }, 'user'),
          el('option', { value: 2, selected: value.role === 2 }, 'assistant'),
        ])),
        fieldRow('优先级 (order)', el('input', {
          class: 'st-input st-num',
          type: 'number',
          value: value.order,
          on: { input: (e) => onChange({ order: clampNumber(e.target.value, 0, 9999, 100) }) },
        })),
      ]),

      el('div', { class: 'st-row st-checks' }, [
        el('label', {}, [
          el('input', {
            type: 'checkbox',
            checked: value.constant,
            on: { change: (e) => onChange({ constant: e.target.checked }) },
          }),
          ' 常驻 (constant)',
        ]),
        el('label', {}, [
          el('input', {
            type: 'checkbox',
            checked: value.selective,
            on: { change: (e) => onChange({ selective: e.target.checked }) },
          }),
          ' 选择性 (selective)',
        ]),
        value.selective && el('select', {
          class: 'st-select',
          on: { change: (e) => onChange({ selectiveLogic: e.target.value }) },
        }, LOGICS.map((l) => el('option', { value: l.value, selected: value.selectiveLogic === l.value }, l.label))),
        el('label', {}, [
          el('input', {
            type: 'checkbox',
            checked: value.useProbability ?? false,
            on: { change: (e) => onChange({ useProbability: e.target.checked }) },
          }),
          ' 启用概率',
        ]),
        value.useProbability && el('input', {
          class: 'st-input st-num',
          type: 'number',
          min: 0,
          max: 100,
          value: value.probability,
          on: { input: (e) => onChange({ probability: clampNumber(e.target.value, 0, 100, 100) }) },
        }),
      ]),

      el('details', { class: 'st-advanced' }, [
        el('summary', {}, '高级设置'),
        el('div', { class: 'st-advanced-body' }, [
          fieldRow('扫描深度 (scanDepth)', el('input', {
            class: 'st-input st-num',
            type: 'number',
            value: value.scanDepth ?? 0,
            on: { input: (e) => onChange({ scanDepth: clampNumber(e.target.value, 0, 999, 0) }) },
          })),
          el('div', { class: 'st-row st-checks' }, [
            el('label', {}, [
              el('input', {
                type: 'checkbox',
                checked: value.caseSensitive ?? false,
                on: { change: (e) => onChange({ caseSensitive: e.target.checked }) },
              }),
              ' 区分大小写',
            ]),
            el('label', {}, [
              el('input', {
                type: 'checkbox',
                checked: value.matchWholeWords ?? false,
                on: { change: (e) => onChange({ matchWholeWords: e.target.checked }) },
              }),
              ' 全词匹配',
            ]),
            el('label', {}, [
              el('input', {
                type: 'checkbox',
                checked: value.excludeRecursion ?? false,
                on: { change: (e) => onChange({ excludeRecursion: e.target.checked }) },
              }),
              ' 排除递归',
            ]),
            el('label', {}, [
              el('input', {
                type: 'checkbox',
                checked: value.preventRecursion ?? false,
                on: { change: (e) => onChange({ preventRecursion: e.target.checked }) },
              }),
              ' 阻止递归',
            ]),
            el('label', {}, [
              el('input', {
                type: 'checkbox',
                checked: value.addMemo ?? false,
                on: { change: (e) => onChange({ addMemo: e.target.checked }) },
              }),
              ' 添加备注 (addMemo)',
            ]),
          ]),
          el('div', { class: 'st-row' }, [
            fieldRow('sticky', el('input', {
              class: 'st-input st-num',
              type: 'number',
              value: value.sticky ?? 0,
              on: { input: (e) => onChange({ sticky: clampNumber(e.target.value, 0, 9999, 0) }) },
            })),
            fieldRow('cooldown', el('input', {
              class: 'st-input st-num',
              type: 'number',
              value: value.cooldown ?? 0,
              on: { input: (e) => onChange({ cooldown: clampNumber(e.target.value, 0, 9999, 0) }) },
            })),
            fieldRow('delay', el('input', {
              class: 'st-input st-num',
              type: 'number',
              value: value.delay ?? 0,
              on: { input: (e) => onChange({ delay: clampNumber(e.target.value, 0, 9999, 0) }) },
            })),
            fieldRow('weight', el('input', {
              class: 'st-input st-num',
              type: 'number',
              value: value.weight ?? 100,
              on: { input: (e) => onChange({ weight: clampNumber(e.target.value, 0, 9999, 100) }) },
            })),
          ]),
          fieldRow('分组 (group)', el('input', {
            class: 'st-input',
            type: 'text',
            value: value.group ?? '',
            on: { input: (e) => onChange({ group: e.target.value }) },
          })),
          el('label', {}, [
            el('input', {
              type: 'checkbox',
              checked: value.useGroupScoring ?? false,
              on: { change: (e) => onChange({ useGroupScoring: e.target.checked }) },
            }),
            ' 分组评分',
          ]),
          el('fieldset', { class: 'st-fieldset' }, [
            el('legend', {}, '字符卡匹配'),
            el('div', { class: 'st-row st-checks' },
              CHAR_MATCH_FIELDS.map(([k, label]) => el('label', {}, [
                el('input', {
                  type: 'checkbox',
                  checked: value[k] ?? false,
                  on: { change: (e) => onChange({ [k]: e.target.checked }) },
                }),
                ` ${label}`,
              ]))),
          ]),
          fieldRow('decorators (逗号分隔)', el('input', {
            class: 'st-input',
            type: 'text',
            value: (value.decorators ?? []).join(', '),
            on: { input: (e) => onChange({
              decorators: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            }) },
          })),
          fieldRow('characterFilter (JSON,留空表示无)', el('textarea', {
            class: 'st-textarea st-json',
            on: { input: (e) => {
              const raw = e.target.value.trim();
              if (!raw) {
                onChange({ characterFilter: undefined });
                return;
              }
              try {
                onChange({ characterFilter: JSON.parse(raw) });
              } catch {
                // 输入中 JSON 解析失败静默忽略
              }
            } },
          }, value.characterFilter ? JSON.stringify(value.characterFilter, null, 2) : '')),
        ]),
      ]),
    ])
  );
}
