import { MAX_DESC_LENGTH, MAX_AMOUNT } from './config.js';

export const $ = id => document.getElementById(id);

export const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

export const formatCOP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const formatCOPShort = n => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return formatCOP(n);
};

export function sanitizeStr(str, maxLen = MAX_DESC_LENGTH) {
  return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

export function validateAmount(amount) {
  if (!amount || amount <= 0) return 'Ingresa un monto válido';
  if (amount > MAX_AMOUNT) return 'El monto no puede superar $' + MAX_AMOUNT.toLocaleString('es-CO');
  return null;
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function generateId() {
  try { return crypto.randomUUID(); } catch { return Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
}

export function safeRoomCode(code) {
  return encodeURIComponent(code);
}
