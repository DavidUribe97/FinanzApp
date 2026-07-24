import { state } from './state.js';
import { MEMBERS_KEY, ACCOUNTS_KEY, DEFAULT_MEMBERS, DEFAULT_ACCOUNTS, CASH_ACCOUNTS, MEMBER_COLORS } from './config.js';
import { $, esc, formatCOPShort } from './utils.js';
import { getAccountBalance } from './data.js';

let syncToFirestoreFn = () => {};
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

export function loadMembers() {
  try {
    const raw = localStorage.getItem(MEMBERS_KEY);
    state.members = raw ? JSON.parse(raw) : { ...DEFAULT_MEMBERS };
  } catch {
    state.members = { ...DEFAULT_MEMBERS };
  }
}

export function saveMembers() {
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members));
  syncToFirestoreFn();
}

export function getMemberIds() {
  return Object.keys(state.members);
}

export function getMemberList() {
  return Object.entries(state.members).map(([id, name]) => ({ id, name }));
}

export function getWhoLabel(who) {
  return state.members[who] || state.members['compartido'] || 'Compartido 👥';
}

export function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    state.accounts = raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  } catch {
    state.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  }
}

export function saveAccounts() {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
  syncToFirestoreFn();
}

export function getAccountsForMember(memberId) {
  return state.accounts[memberId] || state.accounts['compartido'] || ['Efectivo'];
}

export function isCashAccount(accountName) {
  return CASH_ACCOUNTS.some(c => accountName.toLowerCase().includes(c));
}

export function getPaymentMethod(accountName) {
  return isCashAccount(accountName) ? 'efectivo' : 'digital';
}

export function getPaymentLabel(method) {
  return method === 'efectivo' ? 'Efectivo' : 'Digital';
}

export function updateAccountSelector(memberId, selectId) {
  const sel = $(selectId);
  if (!sel) return;
  const accts = getAccountsForMember(memberId);
  const prev = sel.value;
  sel.innerHTML = accts.map(a => {
    const bal = getAccountBalance(memberId, a);
    const balText = formatCOPShort(bal);
    return `<option value="${esc(a)}">${esc(a)} (${balText})</option>`;
  }).join('');
  if (accts.includes(prev)) sel.value = prev;
}

export function getMemberBadgeStyle(who) {
  const ids = Object.keys(state.members);
  const idx = ids.indexOf(who);
  if (idx === -1) return { bg: 'rgba(0,212,170,0.15)', color: 'var(--accent-green)' };
  const c = MEMBER_COLORS[idx % MEMBER_COLORS.length];
  return { bg: c.bg, color: c.text };
}
