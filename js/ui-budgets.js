/**
 * Presupuestos — barras de progreso por categoría con porcentaje usado,
 * colores dinámicos (verde/dorado/rojo) y botón eliminar.
 */

import { state } from './state.js';
import { $, esc, formatCOPShort } from './utils.js';
import { getFilteredTransactions, saveBudgets } from './data.js';
import { getAllGastoNames } from './categories.js';

/** Renderiza las barras de progreso de presupuesto por categoría con colores dinámicos. */
export function renderBudgets() {
  const filtered = getFilteredTransactions(state.currentMonth, state.currentYear);
  const spentMap = {};
  filtered.filter(tx => tx.type === 'gasto').forEach(tx => {
    spentMap[tx.category] = (spentMap[tx.category] || 0) + tx.amount;
  });
  const grid = $('budgetGrid');
  const empty = $('budgetEmpty');
  const entries = Object.entries(state.budgets);
  if (entries.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = entries.map(([cat, budget]) => {
    const spent = spentMap[cat] || 0;
    const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
    const color = pct > 100 ? 'var(--accent-red)' : pct > 75 ? 'var(--accent-gold)' : 'var(--accent-green)';
    return `
      <div class="budget-item">
        <div class="b-label">
          <span>${esc(cat)}</span>
          <span>${formatCOPShort(spent)} / ${formatCOPShort(budget)}</span>
        </div>
        <div class="budget-bar">
          <div class="budget-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:3px;font-size:10px;color:var(--text-secondary)">
          <span>${pct.toFixed(0)}% usado</span>
          <button class="btn-sm del-budget" data-cat="${esc(cat)}" style="padding:2px 6px;font-size:10px">✕</button>
        </div>
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.del-budget').forEach(btn => {
    btn.addEventListener('click', () => {
      delete state.budgets[btn.dataset.cat];
      saveBudgets();
      renderBudgets();
    });
  });
}

/** Actualiza el select de categorías disponibles sin presupuesto. */
export function updateBudgetCategorySelect() {
  const sel = $('budgetCategory');
  const used = new Set(Object.keys(state.budgets));
  const available = getAllGastoNames().filter(c => !used.has(c));
  sel.innerHTML = available.length === 0
    ? '<option value="">Todos tienen presupuesto</option>'
    : available.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
}
