/**
 * Navegación entre meses, cambio de modo (diario/análisis), refresh global de todas las vistas,
 * apertura de modal de sala.
 */
import { state } from './state.js';
import { $ } from './utils.js';
import { MONTHS, MODE_KEY } from './config.js';
import { refreshDaily } from './ui-daily.js';
import { renderSummary, renderTable } from './ui-analysis.js';
import { renderCharts, renderLineChart } from './ui-charts.js';
import { renderBudgets } from './ui-budgets.js';
import { renderStats } from './ui-stats.js';
import { renderCatManager } from './ui-categories.js';
import { renderMembers } from './ui-members.js';
import { renderAccountsPanel } from './ui-accounts.js';
import { updateAccountSelector } from './members.js';
import { toggleTheme } from './ui-theme.js';
import { openRoomModal } from './firebase-room.js';

/** Actualiza el texto del label de mes/año en la UI. */
export function updateMonthLabel() {
  $('monthLabel').textContent = `${MONTHS[state.currentMonth]} ${state.currentYear}`;
}

/** Refresca todas las vistas del modo análisis (resumen, tabla, charts, budgets, stats). */
export function refreshAnalysis() {
  renderSummary();
  renderTable();
  renderCharts();
  renderLineChart();
  renderBudgets();
  renderStats();
}

/** Refresca todas las vistas: mes, diario, cuenta y análisis si corresponde. */
export function refreshAll(animate = true) {
  updateMonthLabel();
  refreshDaily(animate);
  updateAccountSelector(state.selectedWho, 'dailyAccount', state.selectedType);
  if (!state.isDailyMode) refreshAnalysis();
}

/** Cambia entre modo diario y análisis, renderizando las vistas correspondientes. */
export function setMode(daily) {
  state.isDailyMode = daily;
  document.body.classList.toggle('mode-analysis', !daily);
  $('modeToggle').textContent = daily ? '📊' : '◀';
  $('modeToggle').classList.toggle('active', !daily);
  localStorage.setItem(MODE_KEY, daily ? 'daily' : 'analysis');
  if (!daily) {
    $('searchInput').value = '';
    $('filterType').value = 'todos';
    $('filterWho').value = 'todos';
    renderCatManager();
    renderMembers();
    renderAccountsPanel();
    refreshAnalysis();
  }
}

/** Vincula eventos de navegación: meses, modo, tema y modal de sala. */
export function setupNavigation() {
  $('prevMonth').addEventListener('click', () => {
    state.currentMonth--;
    if (state.currentMonth < 0) { state.currentMonth = 11; state.currentYear--; }
    refreshAll();
  });
  $('nextMonth').addEventListener('click', () => {
    state.currentMonth++;
    if (state.currentMonth > 11) { state.currentMonth = 0; state.currentYear++; }
    refreshAll();
  });
  $('roomBtn').addEventListener('click', openRoomModal);
  $('modeToggle').addEventListener('click', () => setMode(!state.isDailyMode));
  $('themeToggle').addEventListener('click', toggleTheme);
}
