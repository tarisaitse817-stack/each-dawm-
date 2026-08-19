/**
 * 世界书种子导入：将桥接端 data/worldbook.json 转换为 ST 世界书条目入库
 * 仅在数据库无任何世界书时执行一次，不覆盖用户数据。
 *
 * bridge 条目格式：{ id, comment, keys[], content, constant, enabled, position(string), insertion_order }
 * ST 条目格式：{ id(uuid), keys, secondaryKeys, content, comment, order, position, selective, selectiveLogic, constant, probability, useProbability, addMemo }
 */

import { getLorebooks, saveLorebook } from './database.js?v=27';

/** 从内容 YAML 提取角色名（"name: 塞壬"）作为关键词 */
function extractNameFromContent(content) {
  const m = content.match(/^name:\s*([^\s\n]+)/m);
  return m ? m[1].trim() : null;
}

function convertEntry(e) {
  if (e.enabled === false) return null;
  const keys = Array.isArray(e.keys) ? e.keys.slice() : [];
  if (keys.length === 0 && !e.constant) {
    // 角色卡：无关键词且非常驻 → 用 YAML 中的 name 作触发词
    const name = extractNameFromContent(e.content || '');
    if (name) keys.push(name);
  }
  return {
    id: crypto.randomUUID(),
    keys,
    secondaryKeys: [],
    content: e.content || '',
    comment: e.comment,
    order: e.insertion_order ?? 100,
    position: e.position || 'after_char',
    selective: false,
    selectiveLogic: 'and_any',
    constant: !!e.constant,
    probability: 100,
    useProbability: false,
    addMemo: false,
  };
}

export async function seedWorldbookIfEmpty() {
  const existing = await getLorebooks();
  if (existing.length > 0) return false; // 已有数据（含用户自建/导入），不覆盖

  try {
    const resp = await fetch('data/worldbook.json');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const entries = (data.entries || [])
      .map(convertEntry)
      .filter(Boolean);

    if (entries.length === 0) {
      console.warn('[sillytavern] worldbook.json 无可用条目');
      return false;
    }

    const now = Date.now();
    await saveLorebook({
      id: crypto.randomUUID(),
      name: '光之回响世界书',
      description: '由 data/worldbook.json 自动导入（游戏世界观设定）',
      entries,
      recursiveScanning: false,
      caseSensitive: false,
      matchWholeWords: false,
      createdAt: now,
      updatedAt: now,
    });
    console.log('[sillytavern] 世界书种子导入完成: ' + entries.length + ' 条');
    return true;
  } catch (e) {
    console.warn('[sillytavern] 世界书种子导入失败:', e);
    return false;
  }
}
