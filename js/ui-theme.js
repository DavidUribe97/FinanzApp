/**
 * Tema oscuro/claro — carga desde localStorage y toggle con persistencia. 2 funciones, 0 imports de la app.
 */
import { THEME_KEY } from './config.js';

/** Carga el tema guardado en localStorage y lo aplica al body. */
export function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.body.setAttribute('data-theme', saved);
}

/** Alterna entre tema oscuro y claro, persistiendo la elección. */
export function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}
