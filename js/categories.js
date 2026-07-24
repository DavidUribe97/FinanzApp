import { state } from './state.js';
import { CATS_KEY, DEFAULT_CATEGORIES } from './config.js';

let syncToFirestoreFn = () => {};
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

export function loadCategories() {
  const raw = localStorage.getItem(CATS_KEY);
  if (raw) {
    try {
      state.categoriesData = JSON.parse(raw);
      migrateSubcats();
      return;
    } catch {}
  }
  state.categoriesData = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

export function migrateSubcats() {
  for (const type of ['ingreso', 'gasto']) {
    const arr = state.categoriesData[type];
    if (!Array.isArray(arr)) continue;
    arr.forEach(cat => {
      if (!cat.subcats || !Array.isArray(cat.subcats)) return;
      cat.subcats = cat.subcats.map(s => typeof s === 'string' ? { name: s, emoji: '📋' } : s);
    });
  }
}

export function saveCategories() {
  localStorage.setItem(CATS_KEY, JSON.stringify(state.categoriesData));
  syncToFirestoreFn();
}

export function getCatNames(type) {
  return (state.categoriesData[type] || []).map(c => c.name);
}

export function getCatEmoji(name) {
  for (const arr of Object.values(state.categoriesData)) {
    const found = arr.find(c => c.name === name);
    if (found) return found.emoji;
  }
  return '📋';
}

export function getSubCatNames(type, catName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return [];
  return cat.subcats.map(s => typeof s === 'string' ? s : s.name);
}

export function getSubCatEmoji(type, catName, subName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return getCatEmoji(catName);
  const sub = cat.subcats.find(s => (typeof s === 'string' ? s : s.name) === subName);
  if (!sub) return getCatEmoji(catName);
  if (typeof sub === 'string') return '📋';
  return sub.emoji || '📋';
}

export function getAllGastoNames() {
  return (state.categoriesData.gasto || []).map(c => c.name);
}
