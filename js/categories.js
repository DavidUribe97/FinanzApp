/**
 * CRUD de categorías y subcategorías. Persiste en localStorage
 * + sync a Firestore vía callback. Incluye migración de formato legacy
 * (strings a objetos {name, emoji}).
 * Nunca importa firebase-sync.js directo.
 */
import { state } from './state.js';
import { CATS_KEY, DEFAULT_CATEGORIES } from './config.js';

let syncToFirestoreFn = () => {};
/** Registra el callback de sync a Firestore para disparar después de cada escritura. */
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

/** Carga categorías desde localStorage o usa los valores por defecto, y ejecuta migración. */
export function loadCategories() {
  const raw = localStorage.getItem(CATS_KEY);
  if (raw) {
    try {
      state.categoriesData = JSON.parse(raw);
      migrateSubcats();
      return;
    } catch {
      console.warn('Categorias corruptas en localStorage, usando defaults');
    }
  }
  state.categoriesData = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
}

/** Convierte subcategorías legacy (string) al formato actual {name, emoji}. */
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

/** Persiste categorías en localStorage y dispara sync a Firestore. */
export function saveCategories() {
  localStorage.setItem(CATS_KEY, JSON.stringify(state.categoriesData));
  syncToFirestoreFn();
}

/** Devuelve los nombres de las categorías de un tipo (ingreso/gasto). */
export function getCatNames(type) {
  return (state.categoriesData[type] || []).map(c => c.name);
}

/** Busca y devuelve el emoji de una categoría por su nombre. */
export function getCatEmoji(name) {
  for (const arr of Object.values(state.categoriesData)) {
    const found = arr.find(c => c.name === name);
    if (found) return found.emoji;
  }
  return '📋';
}

/** Devuelve los nombres de las subcategorías de una categoría específica. */
export function getSubCatNames(type, catName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return [];
  return cat.subcats.map(s => typeof s === 'string' ? s : s.name);
}

/** Devuelve el emoji de una subcategoría, o el de su categoría padre como fallback. */
export function getSubCatEmoji(type, catName, subName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return getCatEmoji(catName);
  const sub = cat.subcats.find(s => (typeof s === 'string' ? s : s.name) === subName);
  if (!sub) return getCatEmoji(catName);
  if (typeof sub === 'string') return '📋';
  return sub.emoji || '📋';
}

/** Devuelve los nombres de todas las categorías de tipo gasto. */
export function getAllGastoNames() {
  return (state.categoriesData.gasto || []).map(c => c.name);
}
