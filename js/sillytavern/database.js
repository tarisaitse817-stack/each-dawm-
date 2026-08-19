/**
 * IndexedDB Database Layer (vanilla JS port)
 * 依赖：lib/dexie.min.js（script 标签先行加载，暴露全局 window.Dexie）
 */

import { DEFAULT_SETTINGS, createDefaultPreset } from './types.js?v=19';

const Dexie = window.Dexie;
if (!Dexie) {
  throw new Error('[sillytavern] Dexie 未加载：请在 index.html 中先引入 lib/dexie.min.js');
}

const DB_NAME = 'SillyTavernWebDB';
const DB_VERSION = 3;

class AppDatabase extends Dexie {
  constructor() {
    super(DB_NAME);
    this.version(1).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(2).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    });
    this.version(3).stores({
      lorebooks: 'id, name, updatedAt',
      presets: 'id, name, updatedAt',
      settings: 'key',
      chats: 'id, name, updatedAt',
    }).upgrade(async (tx) => {
      const settings = await tx.table('settings').toCollection().toArray();
      for (const s of settings) {
        if (s.uiMode === undefined) s.uiMode = 'game';
        if (s.customTags === undefined) s.customTags = ['maintext', 'option', 'sum', 'vars', 'thinking', 'think'];
        if (s.thinkingDisplay === undefined) s.thinkingDisplay = 'fold';
        if (s.formatPromptTemplate === undefined) s.formatPromptTemplate = '';
        if (s.api && s.api.secondary === undefined) {
          s.api.secondary = { enabled: false, baseUrl: '', apiKey: '', model: '' };
        }
        await tx.table('settings').put(s);
      }
    });
  }
}

let dbInstance = null;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new AppDatabase();
  }
  return dbInstance;
}

export async function initializeDatabase() {
  const db = getDatabase();

  const presetCount = await db.presets.count();
  if (presetCount === 0) {
    const defaultPreset = createDefaultPreset();
    await db.presets.add({
      ...defaultPreset,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  const settingsCount = await db.settings.count();
  if (settingsCount === 0) {
    await db.settings.put({ ...DEFAULT_SETTINGS, key: 'settings' });
  }
}

export async function clearAllData() {
  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

export async function exportAllData() {
  const db = getDatabase();
  const [lorebooks, presets, settings, chats] = await Promise.all([
    db.lorebooks.toArray(),
    db.presets.toArray(),
    db.settings.toArray(),
    db.chats.toArray(),
  ]);
  return {
    version: DB_VERSION,
    exportedAt: Date.now(),
    lorebooks,
    presets,
    settings,
    chats,
  };
}

export async function importAllData(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('备份格式无效');
  }
  const db = getDatabase();
  await db.transaction('rw', db.lorebooks, db.presets, db.settings, db.chats, async () => {
    await db.lorebooks.clear();
    await db.presets.clear();
    await db.settings.clear();
    await db.chats.clear();
    if (Array.isArray(backup.lorebooks)) await db.lorebooks.bulkPut(backup.lorebooks);
    if (Array.isArray(backup.presets)) await db.presets.bulkPut(backup.presets);
    if (Array.isArray(backup.settings)) await db.settings.bulkPut(backup.settings);
    if (Array.isArray(backup.chats)) await db.chats.bulkPut(backup.chats);
  });
}

export async function getLorebooks() {
  return getDatabase().lorebooks.toArray();
}

export async function saveLorebook(lorebook) {
  await getDatabase().lorebooks.put(lorebook);
  return lorebook.id;
}

export async function deleteLorebook(id) {
  await getDatabase().lorebooks.delete(id);
}

export async function getPresets() {
  return getDatabase().presets.toArray();
}

export async function savePreset(preset) {
  await getDatabase().presets.put(preset);
  return preset.id;
}

export async function deletePreset(id) {
  await getDatabase().presets.delete(id);
}

export async function getSettings() {
  const all = await getDatabase().settings.toArray();
  return all[0];
}

export async function saveSettings(settings) {
  await getDatabase().settings.put({ ...settings, key: 'settings' });
}

export async function getChats() {
  return getDatabase().chats.toArray();
}

export async function saveChat(chat) {
  await getDatabase().chats.put(chat);
  return chat.id;
}

export async function deleteChat(id) {
  await getDatabase().chats.delete(id);
}

export async function setVariables(chatId, variables) {
  const db = getDatabase();
  const chat = await db.chats.get(chatId);
  if (!chat) return;
  chat.variables = variables;
  chat.updatedAt = Date.now();
  await db.chats.put(chat);
}
