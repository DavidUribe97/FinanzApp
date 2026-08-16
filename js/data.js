/**
 * CRUD de transacciones y presupuestos.
 * Maneja persistencia en localStorage y dispara sync a Firestore vía callback inyectado.
 * Nunca importa firebase-sync.js directo (regla 1 de dependencias).
 */
import { state } from './state.js';
import { STORAGE_KEY, BUDGET_KEY, MAX_AMOUNT, MONTHS, COMPARTIDO_ID } from './config.js';
import { $, downloadBlob, parseLocalDate, getWhoLabel, generateId, getToday, toLocalDateStr } from './utils.js';

/** Soft limit warning threshold for Firestore's 10K hard limit. */
const TX_SOFT_LIMIT = 9000;

/** Categoría reservada para transferencias internas entre cuentas — no aparece en UI ni en reportes. */
export const TRANSFER_CATEGORY = '_transfer';

let syncToFirestoreFn = () => {};
/** Registra el callback de sync a Firestore para disparar después de cada escritura. */
export function setSyncToFirestore(fn) { syncToFirestoreFn = fn; }

/** Cache de saldos por cuenta — se invalida al modificar transacciones. */
let accountBalanceCache = null;

/** Invalida la caché de saldos (llamar después de cada saveData o sync remoto). */
export function invalidateBalanceCache() { accountBalanceCache = null; }

/** Construye el mapa de saldos por cuenta desde todas las transacciones. */
function getBalanceMap() {
  if (accountBalanceCache) return accountBalanceCache;
  accountBalanceCache = {};
  state.transactions.forEach(tx => {
    const key = tx.account || 'yo:Efectivo';
    if (!accountBalanceCache[key]) accountBalanceCache[key] = 0;
    accountBalanceCache[key] += tx.type === 'ingreso' ? tx.amount : -tx.amount;
  });
  return accountBalanceCache;
}

/** Carga transacciones y presupuestos desde localStorage hacia el state global. */
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

/** Persiste transacciones en localStorage y dispara sync a Firestore. */
export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  invalidateBalanceCache();
  syncToFirestoreFn();
}

/** Persiste presupuestos en localStorage y dispara sync a Firestore. */
export function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
  syncToFirestoreFn();
}

/** Filtra transacciones del state por mes y año dados. */
export function getFilteredTransactions(month, year) {
  return state.transactions.filter(tx => {
    const d = parseLocalDate(tx.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
}

/** Filtra transacciones del mes excluyendo transferencias internas — para vistas de reporte/resumen. */
export function getFilteredTransactionsExcludingTransfers(month, year) {
  return getFilteredTransactions(month, year).filter(tx => tx.category !== TRANSFER_CATEGORY);
}

/** Aplica filtros de UI (búsqueda, tipo, quién) sobre las transacciones del mes actual. */
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

/** Suma ingresos menos gastos de una cuenta específica (usa caché). */
export function getAccountBalance(accountKey) {
  const map = getBalanceMap();
  return map[accountKey] || 0;
}

/** Calcula el saldo acumulado de todas las cuentas hasta el inicio del mes dado. */
export function getCumulativeBalance(month, year) {
  let balance = 0;
  state.transactions.forEach(tx => {
    const d = parseLocalDate(tx.date);
    if (d.getFullYear() < year || (d.getFullYear() === year && d.getMonth() < month)) {
      balance += tx.type === 'ingreso' ? tx.amount : -tx.amount;
    }
  });
  return balance;
}

/** Devuelve las fechas de inicio, fin y cantidad de días del mes dado. */
export function getMonthRange(month, year) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start, end, days: end.getDate() };
}

/** Agrega una transacción al state y persiste cambios. Bloquea compartido+ingreso. */
export function addTransaction(data) {
  if (data.who === COMPARTIDO_ID && data.type === 'ingreso') return { ok: false, reason: 'compartido-no-recibe' };
  state.transactions.push(data);
  saveData();
  if (state.transactions.length >= TX_SOFT_LIMIT && state.transactions.length % 500 === 0) {
    import('./ui-modals.js').then(m => m.showToast(`Atención: ${state.transactions.length.toLocaleString()} transacciones. Límite Firestore: 10,000`));
  }
  return { ok: true };
}

/** Actualiza una transacción existente por id, fusionando con los nuevos datos. Bloquea compartido+ingreso. */
export function editTransaction(id, data) {
  const idx = state.transactions.findIndex(tx => String(tx.id) === String(id));
  if (idx === -1) return { ok: false, reason: 'no-encontrada' };
  const existing = state.transactions[idx];
  const who = data.who ?? existing.who;
  const type = data.type ?? existing.type;
  if (who === COMPARTIDO_ID && type === 'ingreso') return { ok: false, reason: 'compartido-no-recibe' };
  state.transactions[idx] = { ...existing, ...data };
  saveData();
  return { ok: true };
}

/** Elimina una transacción por id y la almacena en undoData para posible restauración. */
export function deleteTransaction(id) {
  const tx = state.transactions.find(t => String(t.id) === String(id));
  if (!tx) return null;
  state.undoData = { ...tx };
  state.transactions = state.transactions.filter(t => String(t.id) !== String(id));
  saveData();
  return tx;
}

/** Restaura la última transacción eliminada desde undoData. */
export function restoreTransaction() {
  if (state.undoData) {
    state.transactions.push(state.undoData);
    saveData();
    state.undoData = null;
    return true;
  }
  return false;
}

/** Registra una transferencia entre cuentas como un par gasto/ingreso vinculado (no afecta categorías ni presupuestos). */
export function addTransfer(fromAccountKey, toAccountKey, amount, description) {
  if (fromAccountKey === toAccountKey) {
    return { ok: false, reason: 'misma-cuenta' };
  }
  const toWho = toAccountKey.split(':')[0];
  if (toWho === COMPARTIDO_ID) {
    return { ok: false, reason: 'compartido-no-recibe' };
  }
  const fromWho = fromAccountKey.split(':')[0];
  const transferId = generateId();
  const dateStr = toLocalDateStr(getToday());
  const base = { category: TRANSFER_CATEGORY, amount, date: dateStr, description: description || 'Transferencia', transferId };
  state.transactions.push({ ...base, id: generateId(), type: 'gasto', who: fromWho, account: fromAccountKey });
  state.transactions.push({ ...base, id: generateId(), type: 'ingreso', who: toWho, account: toAccountKey });
  invalidateBalanceCache();
  saveData();
  return { ok: true };
}

/** Genera y descarga un archivo CSV con las transacciones visibles en la tabla. */
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

/** Genera y descarga un backup completo en formato JSON. */
export function exportJSON() {
  const data = {
    transactions: state.transactions,
    budgets: state.budgets,
    categories: state.categoriesData,
    members: state.members,
    accounts: state.accounts,
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `finanzas_backup_${state.currentYear}-${String(state.currentMonth+1).padStart(2,'0')}.json`);
}

/** Valida la estructura y rangos de una transacción antes de persistirla. */
export function isValidTx(tx) {
  return tx && typeof tx.id !== 'undefined' && typeof tx.type === 'string' && (tx.type === 'ingreso' || tx.type === 'gasto')
    && typeof tx.amount === 'number' && tx.amount > 0 && tx.amount <= MAX_AMOUNT
    && typeof tx.category === 'string' && tx.category.length <= 50
    && typeof tx.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(tx.date)
    && (!tx.who || typeof tx.who === 'string')
    && (!tx.description || typeof tx.description === 'string')
    && (!tx.subcategory || (typeof tx.subcategory === 'string' && tx.subcategory.length <= 50))
    && (!tx.account || typeof tx.account === 'string');
}

/** Valida que el objeto de categorías tenga la estructura requerida. */
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
          if (!s || typeof s.name !== 'string' || !s.name || typeof s.emoji !== 'string') return false;
        }
      }
    }
  }
  return true;
}

/** Valida que el objeto de presupuestos contenga solo montos positivos. */
export function isValidBudgets(budgets) {
  if (!budgets || typeof budgets !== 'object') return false;
  for (const [cat, amount] of Object.entries(budgets)) {
    if (typeof cat !== 'string' || typeof amount !== 'number' || amount <= 0) return false;
  }
  return true;
}
