/**
 * Estadísticas del mes — gasto diario promedio, categoría top, total ingresos/gastos,
 * comparativa vs mes anterior, desglose por miembro.
 */

import { state } from './state.js';
import { $, esc, formatCOP, getToday } from './utils.js';
import { getFilteredTransactions, getMonthRange } from './data.js';

/** Renderiza las tarjetas de estadísticas: promedio diario, top categoría, totales y comparativa. */
export function renderStats() {
  const filtered = getFilteredTransactions(state.currentMonth, state.currentYear);
  const { days } = getMonthRange(state.currentMonth, state.currentYear);
  const t = getToday();
  const todayDay = t.getMonth() === state.currentMonth && t.getFullYear() === state.currentYear ? t.getDate() : days;

  const gastos = filtered.filter(tx => tx.type === 'gasto');
  const ingresos = filtered.filter(tx => tx.type === 'ingreso');
  const totalGastos = gastos.reduce((s, t) => s + t.amount, 0);
  const totalIngresos = ingresos.reduce((s, t) => s + t.amount, 0);
  const gastoDiario = todayDay > 0 ? totalGastos / todayDay : 0;

  const catMap = {};
  gastos.forEach(tx => { catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount; });
  let topCat = { name: '—', amount: 0 };
  Object.entries(catMap).forEach(([name, amount]) => {
    if (amount > topCat.amount) topCat = { name, amount };
  });

  let vsPrev = null;
  const prevMonth = state.currentMonth === 0 ? 11 : state.currentMonth - 1;
  const prevYear = state.currentMonth === 0 ? state.currentYear - 1 : state.currentYear;
  const prevFiltered = getFilteredTransactions(prevMonth, prevYear);
  const prevGastos = prevFiltered.filter(tx => tx.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  if (prevGastos > 0 || totalGastos > 0) {
    const pct = prevGastos > 0 ? ((totalGastos - prevGastos) / prevGastos * 100) : 100;
    const diff = totalGastos - prevGastos;
    vsPrev = { diff: Math.abs(diff), pct: Math.abs(pct), up: diff > 0 };
  }

  const memberStatsHtml = Object.entries(state.members).filter(([id]) => id !== 'compartido').map(([id, name]) => {
    const total = gastos.filter(tx => (tx.who || 'yo') === id).reduce((s, t) => s + t.amount, 0);
    return `
    <div class="stat-card">
      <div class="stat-value">${formatCOP(total)}</div>
      <div class="stat-label">Gastos de ${esc(name)}</div>
    </div>`;
  }).join('');

  $('statsGrid').innerHTML = `
    <div class="stat-card">
      <div class="stat-value">${formatCOP(gastoDiario)}</div>
      <div class="stat-label">Gasto promedio diario</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${esc(topCat.name)}</div>
      <div class="stat-label">Categoría con más gasto</div>
      <div class="stat-sub">${formatCOP(topCat.amount)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatCOP(totalGastos)}</div>
      <div class="stat-label">Total gastos este mes</div>
      ${vsPrev ? `<div class="stat-sub ${vsPrev.up ? 'up' : 'down'}">${vsPrev.up ? '↑' : '↓'} ${formatCOP(vsPrev.diff)} (${vsPrev.pct.toFixed(1)}%) vs mes anterior</div>` : '<div class="stat-sub">Sin datos del mes anterior</div>'}
    </div>
    <div class="stat-card">
      <div class="stat-value">${formatCOP(totalIngresos)}</div>
      <div class="stat-label">Total ingresos este mes</div>
      <div class="stat-sub">Saldo: ${formatCOP(totalIngresos - totalGastos)}</div>
    </div>
    ${memberStatsHtml}
  `;
}
