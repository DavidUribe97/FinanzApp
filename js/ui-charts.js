/**
 * Gráficos Chart.js — dona de gastos por categoría (con tooltip por miembro),
 * barras de ingresos/gastos por semana, línea de evolución mensual 12 meses.
 */

import { state } from './state.js';
import { $, formatCOPShort, parseLocalDate } from './utils.js';
import { CHART_COLORS, MONTHS } from './config.js';
import { getFilteredTransactionsExcludingTransfers, TRANSFER_CATEGORY } from './data.js';
import { getWhoLabel } from './members.js';

const CHART_FONT = "-apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif";

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function themeColors() {
  return {
    green: getThemeColor('--accent-green'),
    red: getThemeColor('--accent-red'),
    gold: getThemeColor('--accent-gold'),
    text: getThemeColor('--text-secondary'),
    grid: getThemeColor('--grid-color')
  };
}

/** Renderiza la dona de gastos por categoría y las barras semanales de ingresos/gastos. */
export function renderCharts() {
  const tc = themeColors();
  const filtered = getFilteredTransactionsExcludingTransfers(state.currentMonth, state.currentYear);

  const gastos = filtered.filter(tx => tx.type === 'gasto');
  const catMap = {};
  const whoMap = {};
  gastos.forEach(tx => {
    catMap[tx.category] = (catMap[tx.category] || 0) + tx.amount;
    if (!whoMap[tx.category]) {
      whoMap[tx.category] = {};
      Object.keys(state.members).forEach(id => { whoMap[tx.category][id] = 0; });
    }
    whoMap[tx.category][tx.who || 'yo'] += tx.amount;
  });
  const donaLabels = Object.keys(catMap);
  const donaData = Object.values(catMap);
  const colors = CHART_COLORS.slice(0, donaLabels.length);

  const ctxD = $('doughnutChart').getContext('2d');
  if (state.doughnutChart) state.doughnutChart.destroy();
  state.doughnutChart = new Chart(ctxD, {
    type: 'doughnut',
    data: { labels: donaLabels, datasets: [{ data: donaData, backgroundColor: colors.slice(0, donaLabels.length), borderWidth: 0 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: tc.text, font: { family: CHART_FONT, size: 11 }, boxWidth: 12, padding: 10 } },
        tooltip: {
          callbacks: {
            afterLabel: function(ctx) {
              const cat = ctx.label;
              const w = whoMap[cat];
              if (!w) return '';
              const parts = [];
              Object.entries(w).forEach(([id, amt]) => {
                parts.push(`${state.members[id] || getWhoLabel(id)}: ${formatCOPShort(amt)}`);
              });
              return parts.join('\n');
            }
          }
        }
      }
    }
  });

  const getWeek = dateStr => {
    const d = parseLocalDate(dateStr);
    const day = d.getDate();
    if (day <= 7) return 1;
    if (day <= 14) return 2;
    if (day <= 21) return 3;
    return 4;
  };
  const weeks = {};
  filtered.forEach(tx => {
    const w = getWeek(tx.date);
    if (!weeks[w]) weeks[w] = { ingresos: 0, gastos: 0 };
    weeks[w][tx.type === 'ingreso' ? 'ingresos' : 'gastos'] += tx.amount;
  });
  const weekLabels = ['Sem 1','Sem 2','Sem 3','Sem 4'];
  const ingresosData = weekLabels.map((_, i) => (weeks[i+1] || {}).ingresos || 0);
  const gastosData = weekLabels.map((_, i) => (weeks[i+1] || {}).gastos || 0);

  const ctxB = $('barChart').getContext('2d');
  if (state.barChart) state.barChart.destroy();
  state.barChart = new Chart(ctxB, {
    type: 'bar',
    data: {
      labels: weekLabels,
      datasets: [
        { label: 'Ingresos', data: ingresosData, backgroundColor: tc.green, borderRadius: 4 },
        { label: 'Gastos', data: gastosData, backgroundColor: tc.red, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: tc.text, font: { family: CHART_FONT, size: 11 }, boxWidth: 12, padding: 8 } }
      },
      scales: {
        x: { grid: { color: tc.grid }, ticks: { color: tc.text, font: { family: CHART_FONT } } },
        y: { grid: { color: tc.grid }, ticks: { color: tc.text, font: { family: CHART_FONT }, callback: v => formatCOPShort(v) } }
      }
    }
  });
}

/** Renderiza la línea de evolución mensual con balance, ingresos y gastos de los últimos 12 meses. */
export function renderLineChart() {
  const tc = themeColors();
  const monthlyData = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(state.currentYear, state.currentMonth - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyData[key] = { label: MONTHS[d.getMonth()].slice(0,3) + ' ' + d.getFullYear(), ingresos: 0, gastos: 0 };
  }
  state.transactions.filter(tx => tx.category !== TRANSFER_CATEGORY).forEach(tx => {
    const d = parseLocalDate(tx.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthlyData[key]) {
      monthlyData[key][tx.type === 'ingreso' ? 'ingresos' : 'gastos'] += tx.amount;
    }
  });
  const labels = [];
  const balanceData = [];
  const ingData = [];
  const gasData = [];
  Object.values(monthlyData).forEach(m => {
    labels.push(m.label);
    ingData.push(m.ingresos);
    gasData.push(m.gastos);
    balanceData.push(m.ingresos - m.gastos);
  });

  const ctxL = $('lineChart').getContext('2d');
  if (state.lineChart) state.lineChart.destroy();
  state.lineChart = new Chart(ctxL, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Balance', data: balanceData, borderColor: tc.gold, backgroundColor: tc.gold + '1a', fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: tc.gold },
        { label: 'Ingresos', data: ingData, borderColor: tc.green, backgroundColor: tc.green + '0d', fill: false, tension: 0.3, pointRadius: 2, borderDash: [5,5] },
        { label: 'Gastos', data: gasData, borderColor: tc.red, backgroundColor: tc.red + '0d', fill: false, tension: 0.3, pointRadius: 2, borderDash: [5,5] }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { color: tc.text, font: { family: CHART_FONT, size: 11 }, boxWidth: 12, padding: 8 } }
      },
      scales: {
        x: { grid: { color: tc.grid }, ticks: { color: tc.text, font: { family: CHART_FONT, size: 10 } } },
        y: { grid: { color: tc.grid }, ticks: { color: tc.text, font: { family: CHART_FONT }, callback: v => formatCOPShort(v) } }
      }
    }
  });
}
