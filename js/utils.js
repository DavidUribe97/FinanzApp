import { MAX_DESC_LENGTH, MAX_AMOUNT, EMOJIS } from './config.js';
import { state } from './state.js';

/**
 * Helpers de UI. Escape HTML, formateo COP, generación de IDs,
 * validación de montos, renderizado de emoji picker y lookups de estado.
 */

/** Atajo para document.getElementById. */
export const $ = id => document.getElementById(id);

/** Escapa HTML para prevenir XSS en innerHTML. */
export const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

/** Formatea número como COP sin decimales. */
export const formatCOP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

/** Formatea COP abreviado (1.5M, 50K). */
export const formatCOPShort = n => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return formatCOP(n);
};

/** Elimina tags HTML y trunca a maxLen. */
export function sanitizeStr(str, maxLen = MAX_DESC_LENGTH) {
  return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

/** Retorna mensaje de error si el monto es inválido, null si es válido. */
export function validateAmount(amount) {
  if (!amount || amount <= 0) return 'Ingresa un monto válido';
  if (amount > MAX_AMOUNT) return 'El monto no puede superar $' + MAX_AMOUNT.toLocaleString('es-CO');
  return null;
}

/** Descarga un Blob como archivo con nombre dado. */
export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Genera UUID; fallback a timestamp+random si crypto no disponible. */
export function generateId() {
  try { return crypto.randomUUID(); } catch { return Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
}

/** Codifica código de sala para usar como ID de documento Firestore. */
export function safeRoomCode(code) {
  return encodeURIComponent(code);
}

/** Retorna new Date() — stub para facilitar testing futuro. */
export function getToday() {
  return new Date();
}

/** Convierte 'YYYY-MM-DD' a Date en hora local (sin offset de zona horaria). */
export function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Convierte un Date a string 'YYYY-MM-DD' en hora local. */
export function toLocalDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Renderiza grilla de emojis en un contenedor con callback de selección. */
export function renderEmojiPicker(selected, onSelect, pickerId) {
  const picker = $(pickerId || 'emojiPicker');
  if (!picker) return;
  picker.style.display = 'grid';
  picker.innerHTML = EMOJIS.map(e =>
    `<button data-emoji="${e}" class="${e === (selected || '📋') ? 'selected' : ''}">${e}</button>`
  ).join('');
  picker.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (onSelect) {
        onSelect(btn.dataset.emoji);
      } else {
        $('catManagerEmoji').value = btn.dataset.emoji;
      }
      picker.style.display = 'none';
    });
  });
}

/** Convierte el id de un miembro en su nombre legible para la UI. */
export function getWhoLabel(who) {
  return state.members[who] || state.members['compartido'] || 'Compartido 👥';
}
