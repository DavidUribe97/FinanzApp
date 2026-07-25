/**
 * Gestión de miembros y cuentas. CRUD con persistencia en localStorage
 * + sync a Firestore vía callback. Provee helpers para selects de UI
 * (updateAccountSelector, getMemberBadgeStyle).
 * Nunca importa firebase-sync.js directo.
 */
import { state } from './state.js';
import { MEMBERS_KEY, ACCOUNTS_KEY, DEFAULT_MEMBERS, DEFAULT_ACCOUNTS, CASH_ACCOUNTS, MEMBER_COLORS } from './config.js';
import { $, esc, formatCOPShort, getWhoLabel } from './utils.js';
export { getWhoLabel };
import { getAccountBalance } from './data.js';

let syncToFirestoreFn = () => {};
/** Registra el callback de sync a Firestore para disparar después de cada escritura. */
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

/** Carga la lista de miembros desde localStorage o aplica los valores por defecto. */
export function loadMembers() {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    state.members = raw ? JSON.parse(raw) : { ...DEFAULT_MEMBERS };
  } catch {
    console.warn('Miembros corruptos en localStorage, usando defaults');
    state.members = { ...DEFAULT_MEMBERS };
  }
}

/** Persiste miembros en localStorage y dispara sync a Firestore. */
export function saveMembers() {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members));
  syncToFirestoreFn();
}

/** Devuelve los ids de todos los miembros registrados. */
export function getMemberIds() {
  return Object.keys(state.members);
}

/** Devuelve la lista de miembros como array de { id, name }. */
export function getMemberList() {
  return Object.entries(state.members).map(([id, name]) => ({ id, name }));
}

/** Carga las cuentas de cada miembro desde localStorage o aplica los valores por defecto. */
export function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    state.accounts = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  } catch {
    console.warn('Cuentas corruptas en localStorage, usando defaults');
    state.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }
}

/** Persiste cuentas en localStorage y dispara sync a Firestore. */
export function saveAccounts() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
  syncToFirestoreFn();
}

/** Devuelve las cuentas de un miembro específico, o las compartidas como fallback. */
export function getAccountsForMember(memberId) {
  return state.accounts[memberId] || state.accounts['compartido'] || ['Efectivo'];
}

/** Devuelve todas las cuentas de miembros individuales (excluye compartido). */
export function getAllAccountsForMember() {
  const result = [];
  for (const [memberId, accts] of Object.entries(state.accounts)) {
    if (memberId === 'compartido') continue;
    const label = state.members[memberId] || memberId;
    accts.forEach(a => result.push({ memberId, label, account: a }));
  }
  return result;
}

/** Devuelve todas las cuentas de todos los miembros incluyendo compartido. */
export function getAllAccounts() {
  const result = [];
  for (const [memberId, accts] of Object.entries(state.accounts)) {
    const label = state.members[memberId] || memberId;
    accts.forEach(a => result.push({ memberId, label, account: a }));
  }
  return result;
}

/** Indica si un nombre de cuenta corresponde a una cuenta de efectivo. */
export function isCashAccount(accountName) {
  return CASH_ACCOUNTS.some(c => accountName.toLowerCase().includes(c));
}

/** Devuelve 'efectivo' o 'digital' según el nombre de la cuenta. */
export function getPaymentMethod(accountName) {
  return isCashAccount(accountName) ? 'efectivo' : 'digital';
}

/** Convierte el valor interno del método de pago a su etiqueta legible. */
export function getPaymentLabel(method) {
  return method === 'efectivo' ? 'Efectivo' : 'Digital';
}

/** Puebla un select del DOM con las cuentas disponibles para un miembro y tipo de transacción. */
export function updateAccountSelector(memberId, selectId, type = 'ingreso') {
  const sel = $(selectId);
  if (!sel) return;
  const container = sel.closest('.account-select-row, .form-group');

  if (memberId === 'compartido' && type === 'ingreso') {
    if (container) container.style.display = 'none';
    sel.innerHTML = '';
    return;
  }
  if (container) container.style.display = '';

  const prev = sel.dataset.prevValue || '';

  if (type === 'gasto') {
    const all = getAllAccountsForMember();
    sel.innerHTML = all.map(({ memberId: mid, label, account }) => {
      const fullKey = `${mid}:${account}`;
      const bal = getAccountBalance(fullKey);
      const balText = formatCOPShort(bal);
      const display = `${account} (${label})`;
      return `<option value="${esc(fullKey)}">${esc(display)} — ${balText}</option>`;
    }).join('');
  } else {
    const accts = getAccountsForMember(memberId);
    sel.innerHTML = accts.map(a => {
      const fullKey = `${memberId}:${a}`;
      const bal = getAccountBalance(fullKey);
      const balText = formatCOPShort(bal);
      return `<option value="${esc(fullKey)}">${esc(a)} (${balText})</option>`;
    }).join('');
  }

  if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  sel.dataset.prevValue = sel.value;
}

/** Separa un valor de select 'miembro:cuenta' en { who, account }. */
export function parseAccountValue(val) {
  if (!val) return { who: 'yo', account: 'Efectivo' };
  const idx = val.indexOf(':');
  if (idx === -1) return { who: 'yo', account: val };
  return { who: val.slice(0, idx), account: val.slice(idx + 1) };
}

/** Devuelve el estilo de color (bg, text) para el badge de un miembro dado. */
export function getMemberBadgeStyle(who) {
  const ids = Object.keys(state.members);
  const idx = ids.indexOf(who);
  if (idx === -1) return { bg: 'rgba(0,212,170,0.15)', color: 'var(--accent-green)' };
  const c = MEMBER_COLORS[idx % MEMBER_COLORS.length];
  return { bg: c.bg, color: c.text };
}
