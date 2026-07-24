import { THEME_KEY } from './config.js';

export function loadTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'dark';
  document.body.setAttribute('data-theme', saved);
}

export function toggleTheme() {
  const current = document.body.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-theme', next);
  localStorage.setItem(THEME_KEY, next);
}
