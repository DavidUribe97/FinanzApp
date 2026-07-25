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

export function getAllAccountsForMember() {
  const result = [];
  for (const [memberId, accts] of Object.entries(state.accounts)) {
    if (memberId === 'compartido') continue;
    const label = state.members[memberId] || memberId;
    accts.forEach(a => result.push({ memberId, label, account: a }));
  }
  return result;
}

export function getAllAccounts() {
  const result = [];
  for (const [memberId, accts] of Object.entries(state.accounts)) {
    const label = state.members[memberId] || memberId;
    accts.forEach(a => result.push({ memberId, label, account: a }));
  }
  return result;
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
    const all = getAllAccountsForMember().filter(({ memberId: mid, account }) => {
      return getAccountBalance(`${mid}:${account}`) > 0;
    });
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

export function parseAccountValue(val) {
  const idx = val.indexOf(':');
  if (idx === -1) return { who: 'yo', account: val };
  return { who: val.slice(0, idx), account: val.slice(idx + 1) };
}

export function getMemberBadgeStyle(who) {
  const ids = Object.keys(state.members);
  const idx = ids.indexOf(who);
  if (idx === -1) return { bg: 'rgba(0,212,170,0.15)', color: 'var(--accent-green)' };
  const c = MEMBER_COLORS[idx % MEMBER_COLORS.length];
  return { bg: c.bg, color: c.text };
}
