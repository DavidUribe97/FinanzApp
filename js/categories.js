/**
 * CRUD de categorías y subcategorías. Persiste en localStorage
 * + sync a Firestore vía callback.
 * Nunca importa firebase-sync.js directo.
 */
import { state } from './state.js';
import { CATS_KEY, DEFAULT_CATEGORIES } from './config.js';

let syncToFirestoreFn = () => {};
/** Registra el callback de sync a Firestore para disparar después de cada escritura. */
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

/** Carga categorías desde localStorage o usa los valores por defecto. */
export function loadCategories() {
  const raw = localStorage.getItem(CATS_KEY);
  if (raw) {
    try {
      state.categoriesData = JSON.parse(raw);
      return;
    } catch {
      console.warn('Categorías corruptas en localStorage, usando defaults');
    }
  }
  state.categoriesData = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
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

/** Busca y devuelve el emoji de una categoría por tipo y nombre (fallback a otros tipos). */
export function getCatEmoji(type, name) {
  const arr = state.categoriesData[type] || [];
  const found = arr.find(c => c.name === name);
  if (found) return found.emoji;
  for (const arr2 of Object.values(state.categoriesData)) {
    const f = arr2.find(c => c.name === name);
    if (f) return f.emoji;
  }
  return '📋';
}

/** Devuelve los nombres de las subcategorías de una categoría específica. */
export function getSubCatNames(type, catName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return [];
  return cat.subcats.map(s => s.name);
}

/** Devuelve el emoji de una subcategoría, o el de su categoría padre como fallback. */
export function getSubCatEmoji(type, catName, subName) {
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  if (!cat || !cat.subcats) return getCatEmoji(type, catName);
  const sub = cat.subcats.find(s => s.name === subName);
  if (!sub) return getCatEmoji(type, catName);
  return sub.emoji || '📋';
}

/** Devuelve los nombres de todas las categorías de tipo gasto. */
export function getAllGastoNames() {
  return (state.categoriesData.gasto || []).map(c => c.name);
}
