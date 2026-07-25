import { state } from './state.js';
import { STORAGE_KEY, BUDGET_KEY, MAX_AMOUNT } from './config.js';
import { $, downloadBlob, formatCOP } from './utils.js';
import { MONTHS } from './config.js';
import { getWhoLabel } from './members.js';

let syncToFirestoreFn = () => {};
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    state.transactions = raw ? JSON.parse(raw) : [];
  } catch {
    state.transactions = [];
  }
  try {
    const bRaw = localStorage.getItem(BUDGET_KEY);
    state.budgets = bRaw ? JSON.parse(bRaw) : {};
  } catch {
    state.budgets = {};
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
}

export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  syncToFirestoreFn();
}

export function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
  syncToFirestoreFn();
}

export function getFilteredTransactions(month, year) {
  return state.transactions.filter(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

export function getDisplayTransactions() {
  const monthFiltered = getFilteredTransactions(state.currentMonth, state.currentYear);
  const search = $('searchInput')?.value.toLowerCase().trim() || '';
  const typeFilter = $('filterType')?.value || 'todos';
  const whoFilter = $('filterWho')?.value || 'todos';
  return monthFiltered.filter(tx => {
    if (typeFilter !== 'todos' && tx.type !== typeFilter) return false;
    if (whoFilter !== 'todos' && (tx.who || 'yo') !== whoFilter) return false;
    if (search) {
      const inDesc = tx.description && tx.description.toLowerCase().includes(search);
      const inCat = tx.category.toLowerCase().includes(search);
      const inSubcat = tx.subcategory && tx.subcategory.toLowerCase().includes(search);
      if (!inDesc && !inCat && !inSubcat) return false;
    }
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));
}

export function getAccountBalance(accountKey) {
  return state.transactions
    .filter(tx => tx.account === accountKey)
    .reduce((sum, tx) => sum + (tx.type === 'ingreso' ? tx.amount : -tx.amount), 0);
}

export function getCumulativeBalance(month, year) {
  let balance = 0;
  state.transactions.forEach(tx => {
    const d = new Date(tx.date + 'T00:00:00');
    if (d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month)) {
      balance += tx.type === 'ingreso' ? tx.amount : -tx.amount;
    }
  });
  return balance;
}

export function getMonthRange(month, year) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end, days: end.getDate() };
}

export function addTransaction(data) {
  state.transactions.push(data);
  saveData();
}

export function editTransaction(id, data) {
  const idx = state.transactions.findIndex(tx => String(tx.id) === String(id));
  if (idx === -1) return false;
  state.transactions[idx] = { ...state.transactions[idx], ...data };
  saveData();
  return true;
}

export function deleteTransaction(id) {
  const tx = state.transactions.find(t => String(t.id) === String(id));
  if (!tx) return null;
  state.undoData = { ...tx };
  state.transactions = state.transactions.filter(t => String(t.id) !== String(id));
  saveData();
  return tx;
}

export function restoreTransaction() {
  if (state.undoData) {
    state.transactions.push(state.undoData);
    saveData();
    state.undoData = null;
    return true;
  }
  return false;
}

export function exportCSV() {
  const display = getDisplayTransactions();
  if (display.length === 0) return 'empty';
  const rows = [['Fecha','Tipo','Categoría','Subcategoría','Descripción','Quién','Cuenta','Monto']];
  display.forEach(tx => {
    const whoLabel = getWhoLabel(tx.who || 'yo');
    rows.push([tx.date, tx.type === 'ingreso' ? 'Ingreso' : 'Gasto', tx.category, tx.subcategory || '', tx.description || '', whoLabel, tx.account || '', tx.amount]);
  });
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `finanzas_${MONTHS[state.currentMonth]}_${state.currentYear}.csv`);
  return 'ok';
}

export function exportJSON() {
  const data = { transactions: state.transactions, budgets: state.budgets, categories: state.categoriesData, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `finanzas_backup_${state.currentYear}-${String(state.currentMonth+1).padStart(2,'0')}.json`);
}

export function isValidTx(tx) {
  return tx && typeof tx.id !== 'undefined' && typeof tx.type === 'string' && (tx.type === 'ingreso' || tx.type === 'gasto')
    && typeof tx.amount === 'number' && tx.amount > 0 && tx.amount <= MAX_AMOUNT
    && typeof tx.category === 'string' && tx.category.length <= 50
    && typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)
    && (!tx.who || typeof tx.who === 'string')
    && (!tx.description || typeof tx.description === 'string')
    && (!tx.subcategory || typeof tx.subcategory === 'string')
    && (!tx.account || typeof tx.account === 'string');
}

export function isValidCategories(cats) {
  if (!cats || typeof cats !== 'object') return false;
  for (const type of ['ingreso','gasto']) {
    const arr = cats[type];
    if (!Array.isArray(arr)) return false;
    for (const c of arr) {
      if (!c || typeof c.name !== 'string' || !c.name || typeof c.emoji !== 'string') return false;
      if (c.subcats) {
        if (!Array.isArray(c.subcats)) return false;
        for (const s of c.subcats) {
          if (typeof s === 'string') continue;
          if (!s || typeof s.name !== 'string' || typeof s.emoji !== 'string') return false;
        }
      }
    }
  }
  return true;
}

export function isValidBudgets(budgets) {
  if (!budgets || typeof budgets !== 'object') return false;
  for (const [cat, amount] of Object.entries(budgets)) {
    if (typeof cat !== 'string' || typeof amount !== 'number' || amount <= 0) return false;
  }
  return true;
}
