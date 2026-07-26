// Orquestador de la app — importa todos los módulos, inyecta callbacks de sync y refresh,
// coordina init(), wiring de Firebase y registro de service worker.
// Punto de entrada vía DOMContentLoaded.

import { state } from './state.js';
import { MODE_KEY, STORAGE_KEY, BUDGET_KEY, CATS_KEY, MEMBERS_KEY, ACCOUNTS_KEY } from './config.js';
import { validateAmount } from './utils.js';
import { loadCategories, saveCategories, setSyncToFirestore as setSyncCategories } from './categories.js';
import { loadMembers, loadAccounts, saveMembers, saveAccounts, setSyncToFirestore as setSyncMembers } from './members.js';
import { loadData, saveData, saveBudgets, isValidTx, isValidBudgets, isValidCategories, invalidateBalanceCache, setSyncToFirestore as setSyncData } from './data.js';
import { initFirebase, syncToFirestore, setRemoteUpdateCallback } from './firebase-sync.js';
import { setupRoomModal } from './firebase-room.js';
import { showToast, dismissAllToasts, showConfirmModal, setUpdateWhoSelects } from './ui-modals.js';
import { renderDailyCategories, updateTypeToggle, updateWhoToggle } from './ui-daily.js';
import { renderMembers, setupMembersPanel, updateWhoSelects } from './ui-members.js';
import { setupAccountsPanel } from './ui-accounts.js';
import { setupCategoryManager, setNotifyRefresh as setNotifyRefreshCategories } from './ui-categories.js';
import { setNotifyRefresh as setNotifyRefreshMembers } from './ui-members.js';
import { setRefreshAnalysis } from './ui-analysis.js';
import { loadTheme } from './ui-theme.js';
import { setupNavigation, setMode, updateMonthLabel, refreshAll, refreshAnalysis } from './ui-navigation.js';
import { refreshDaily } from './ui-daily.js';
import { setupDailyMode } from './setup-daily.js';
import { setupAnalysisForm } from './setup-analysis.js';
import { updateAccountSelector } from './members.js';

function importJSON(file) {
  showToast('Importando...');
  const reader = new FileReader();
  reader.onload = async e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || typeof data !== 'object') throw new Error('Datos inválidos');
      if (!Array.isArray(data.transactions) || !data.transactions.every(isValidTx)) {
        throw new Error('Transacciones inválidas');
      }
      if (data.budgets && !isValidBudgets(data.budgets)) {
        throw new Error('Presupuestos inválidos');
      }
      if (data.categories && !isValidCategories(data.categories)) {
        throw new Error('Categorías inválidas');
      }
      dismissAllToasts();
      const ok = await showConfirmModal(`Importar ${data.transactions.length} transacciones? Se reemplazarán los datos actuales.`);
      if (!ok) return;
      state.transactions = data.transactions.filter(tx => !(tx.who === 'compartido' && tx.type === 'ingreso'));
      if (data.budgets) state.budgets = data.budgets;
      if (data.categories) { state.categoriesData = data.categories; saveCategories(); }
      if (data.members) { state.members = data.members; saveMembers(); }
      if (data.accounts) { state.accounts = data.accounts; saveAccounts(); }
      saveData();
      saveBudgets();
      refreshAll(false);
      dismissAllToasts();
      showToast(`Importadas ${data.transactions.length} transacciones`);
    } catch (e) {
      dismissAllToasts();
      showToast('Error: ' + (e.message || 'Archivo inválido'));
    }
  };
  reader.readAsText(file);
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
}

function init() {
  loadTheme();
  loadMembers();
  loadAccounts();
  loadCategories();
  loadData();

  setSyncData(syncToFirestore);
  setSyncMembers(syncToFirestore);
  setSyncCategories(syncToFirestore);

  setNotifyRefreshCategories(refreshAll);
  setNotifyRefreshMembers(refreshAll);
  setUpdateWhoSelects(updateWhoSelects);
  setRefreshAnalysis(refreshAnalysis);

  initFirebase();

  const savedMode = localStorage.getItem(MODE_KEY);
  setMode(savedMode !== 'analysis');

  updateMonthLabel();
  renderDailyCategories();
  updateTypeToggle();
  updateWhoToggle();
  updateAccountSelector(state.selectedWho, 'dailyAccount', state.selectedType);
  refreshDaily();

  setupNavigation();
  setupDailyMode();
  setupRoomModal();
  setupCategoryManager();
  setupMembersPanel();
  setupAccountsPanel();
  setupAnalysisForm(importJSON);
  registerServiceWorker();
}

setRemoteUpdateCallback(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
  localStorage.setItem(CATS_KEY, JSON.stringify(state.categoriesData));
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members));
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts));
  invalidateBalanceCache();
  refreshAll();
});

document.addEventListener('DOMContentLoaded', init);
