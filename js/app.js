import { state } from './state.js';
import { FIREBASE_CONFIG, MODE_KEY, THEME_KEY, CATS_KEY, STORAGE_KEY, BUDGET_KEY, LAST_CAT_KEY, ROOM_KEY, MEMBERS_KEY, ACCOUNTS_KEY, EMOJIS, DEFAULT_CATEGORIES, MEMBER_COLORS, MONTHS, CHART_COLORS, FIRESTORE_COLLECTION, CASH_ACCOUNTS, ANIMATION_STEPS, ANIMATION_INTERVAL_MS, MAX_AMOUNT, MAX_DESC_LENGTH } from './config.js';
import { $, esc, formatCOP, formatCOPShort, sanitizeStr, validateAmount, downloadBlob, generateId, safeRoomCode, getToday } from './utils.js';
import { loadCategories, saveCategories, migrateSubcats, getCatNames, getCatEmoji, getSubCatNames, getSubCatEmoji, getAllGastoNames } from './categories.js';
import { loadMembers, saveMembers, getMemberIds, getMemberList, getWhoLabel, loadAccounts, saveAccounts, getAccountsForMember, isCashAccount, getPaymentMethod, getPaymentLabel, updateAccountSelector, getMemberBadgeStyle } from './members.js';
import { loadData, saveData, saveBudgets, getFilteredTransactions, getDisplayTransactions, getCumulativeBalance, getMonthRange, addTransaction, editTransaction, deleteTransaction, restoreTransaction, exportCSV, exportJSON, isValidTx, isValidCategories, isValidBudgets, setSyncToFirestore } from './data.js';
import { initFirebase, syncToFirestore, subscribeFirestore, updateSyncStatus, updateRoomLabel, setRemoteUpdateCallback } from './firebase-sync.js';
import { setupRoomModal, openRoomModal, closeRoomModal, leaveRoom } from './firebase-room.js';
import { showToast, dismissAllToasts, showConfirmModal, openEditModal, closeEditModal, updateEditCategories, updateCategories, updateSubcategories } from './ui-modals.js';
import { renderDailyBalance, renderDailyFeed, renderDailyCategories, renderDailySubcategories, updateTypeToggle, updateWhoToggle, refreshDaily, setupCategoryDragScroll, saveLastCategory } from './ui-daily.js';
import { renderSummary, renderTable } from './ui-analysis.js';
import { renderCharts, renderLineChart } from './ui-charts.js';
import { renderBudgets, updateBudgetCategorySelect } from './ui-budgets.js';
import { renderStats } from './ui-stats.js';
import { renderMembers, setupMembersPanel, updateWhoSelects } from './ui-members.js';
import { renderAccountsPanel, setupAccountsPanel } from './ui-accounts.js';
import { renderCatManager, renderSubcatList, clearSubcatEdit, setupCategoryManager } from './ui-categories.js';
import { loadTheme, toggleTheme } from './ui-theme.js';
import { setupNavigation, setMode, updateMonthLabel, refreshAll, refreshAnalysis } from './ui-navigation.js';
import { setupDailyMode } from './setup-daily.js';
import { setupAnalysisForm } from './setup-analysis.js';

function bindWindow(key, getter, setter) {
  Object.defineProperty(window, key, { get: getter, set: setter, configurable: true, enumerable: true });
}

bindWindow('state', () => state, v => Object.assign(state, v));
bindWindow('transactions', () => state.transactions, v => { state.transactions = v; });
bindWindow('budgets', () => state.budgets, v => { state.budgets = v; });
bindWindow('categoriesData', () => state.categoriesData, v => { state.categoriesData = v; });
bindWindow('members', () => state.members, v => { state.members = v; });
bindWindow('accounts', () => state.accounts, v => { state.accounts = v; });
bindWindow('roomCode', () => state.roomCode, v => { state.roomCode = v; });
bindWindow('roomPassword', () => state.roomPassword, v => { state.roomPassword = v; });
bindWindow('editingId', () => state.editingId, v => { state.editingId = v; });
bindWindow('undoData', () => state.undoData, v => { state.undoData = v; });
bindWindow('isDailyMode', () => state.isDailyMode, v => { state.isDailyMode = v; });
bindWindow('selectedType', () => state.selectedType, v => { state.selectedType = v; });
bindWindow('selectedCategory', () => state.selectedCategory, v => { state.selectedCategory = v; });
bindWindow('selectedSubcategory', () => state.selectedSubcategory, v => { state.selectedSubcategory = v; });
bindWindow('selectedWho', () => state.selectedWho, v => { state.selectedWho = v; });
bindWindow('currentMonth', () => state.currentMonth, v => { state.currentMonth = v; });
bindWindow('currentYear', () => state.currentYear, v => { state.currentYear = v; });
bindWindow('doughnutChart', () => state.doughnutChart, v => { state.doughnutChart = v; });
bindWindow('barChart', () => state.barChart, v => { state.barChart = v; });
bindWindow('lineChart', () => state.lineChart, v => { state.lineChart = v; });
bindWindow('firebaseInitialized', () => state.firebaseInitialized, v => { state.firebaseInitialized = v; });
bindWindow('firestoreUnsub', () => state.firestoreUnsub, v => { state.firestoreUnsub = v; });
bindWindow('db', () => state.db, v => { state.db = v; });
bindWindow('pendingSyncs', () => state.pendingSyncs, v => { state.pendingSyncs = v; });
bindWindow('isCreatingRoom', () => state.isCreatingRoom, v => { state.isCreatingRoom = v; });
bindWindow('roomCodeResolver', () => state.roomCodeResolver, v => { state.roomCodeResolver = v; });

window.FIREBASE_CONFIG = FIREBASE_CONFIG;
window.MODE_KEY = MODE_KEY;
window.THEME_KEY = THEME_KEY;
window.CATS_KEY = CATS_KEY;
window.STORAGE_KEY = STORAGE_KEY;
window.BUDGET_KEY = BUDGET_KEY;
window.LAST_CAT_KEY = LAST_CAT_KEY;
window.ROOM_KEY = ROOM_KEY;
window.MEMBERS_KEY = MEMBERS_KEY;
window.ACCOUNTS_KEY = ACCOUNTS_KEY;
window.EMOJIS = EMOJIS;
window.DEFAULT_CATEGORIES = DEFAULT_CATEGORIES;
window.MEMBER_COLORS = MEMBER_COLORS;
window.MONTHS = MONTHS;
window.CHART_COLORS = CHART_COLORS;
window.FIRESTORE_COLLECTION = FIRESTORE_COLLECTION;
window.CASH_ACCOUNTS = CASH_ACCOUNTS;
window.ANIMATION_STEPS = ANIMATION_STEPS;
window.ANIMATION_INTERVAL_MS = ANIMATION_INTERVAL_MS;
window.MAX_AMOUNT = MAX_AMOUNT;
window.MAX_DESC_LENGTH = MAX_DESC_LENGTH;

window.$ = $;
window.esc = esc;
window.formatCOP = formatCOP;
window.formatCOPShort = formatCOPShort;
window.sanitizeStr = sanitizeStr;
window.validateAmount = validateAmount;
window.downloadBlob = downloadBlob;
window.generateId = generateId;
window.safeRoomCode = safeRoomCode;
window.getToday = getToday;

window.loadCategories = loadCategories;
window.saveCategories = saveCategories;
window.migrateSubcats = migrateSubcats;
window.getCatNames = getCatNames;
window.getCatEmoji = getCatEmoji;
window.getSubCatNames = getSubCatNames;
window.getSubCatEmoji = getSubCatEmoji;
window.getAllGastoNames = getAllGastoNames;

window.loadMembers = loadMembers;
window.saveMembers = saveMembers;
window.getMemberIds = getMemberIds;
window.getMemberList = getMemberList;
window.getWhoLabel = getWhoLabel;
window.loadAccounts = loadAccounts;
window.saveAccounts = saveAccounts;
window.getAccountsForMember = getAccountsForMember;
window.isCashAccount = isCashAccount;
window.getPaymentMethod = getPaymentMethod;
window.getPaymentLabel = getPaymentLabel;
window.updateAccountSelector = updateAccountSelector;
window.getMemberBadgeStyle = getMemberBadgeStyle;

window.loadData = loadData;
window.saveData = saveData;
window.saveBudgets = saveBudgets;
window.getFilteredTransactions = getFilteredTransactions;
window.getDisplayTransactions = getDisplayTransactions;
window.getCumulativeBalance = getCumulativeBalance;
window.getMonthRange = getMonthRange;
window.addTransaction = addTransaction;
window.editTransaction = editTransaction;
window.deleteTransactionData = deleteTransaction;
window.restoreTransaction = restoreTransaction;
window.exportCSV = exportCSV;
window.exportJSON = exportJSON;
window.isValidTx = isValidTx;
window.isValidCategories = isValidCategories;
window.isValidBudgets = isValidBudgets;

window.initFirebase = initFirebase;
window.syncToFirestore = syncToFirestore;
window.subscribeFirestore = subscribeFirestore;
window.updateSyncStatus = updateSyncStatus;
window.updateRoomLabel = updateRoomLabel;
window.setupRoomModal = setupRoomModal;
window.openRoomModal = openRoomModal;
window.closeRoomModal = closeRoomModal;
window.leaveRoom = leaveRoom;

window.showToast = showToast;
window.dismissAllToasts = dismissAllToasts;
window.showConfirmModal = showConfirmModal;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.updateEditCategories = updateEditCategories;
window.updateCategories = updateCategories;
window.updateSubcategories = updateSubcategories;
window.renderDailyBalance = renderDailyBalance;
window.renderDailyFeed = renderDailyFeed;
window.renderDailyCategories = renderDailyCategories;
window.renderDailySubcategories = renderDailySubcategories;
window.updateTypeToggle = updateTypeToggle;
window.updateWhoToggle = updateWhoToggle;
window.refreshDaily = refreshDaily;
window.setupCategoryDragScroll = setupCategoryDragScroll;
window.renderSummary = renderSummary;
window.renderTable = renderTable;
window.renderCharts = renderCharts;
window.renderLineChart = renderLineChart;
window.renderBudgets = renderBudgets;
window.updateBudgetCategorySelect = updateBudgetCategorySelect;
window.renderStats = renderStats;
window.saveLastCategory = saveLastCategory;
window.renderMembers = renderMembers;
window.setupMembersPanel = setupMembersPanel;
window.updateWhoSelects = updateWhoSelects;
window.renderAccountsPanel = renderAccountsPanel;
window.setupAccountsPanel = setupAccountsPanel;
window.renderCatManager = renderCatManager;
window.renderSubcatList = renderSubcatList;
window.clearSubcatEdit = clearSubcatEdit;
window.setupCategoryManager = setupCategoryManager;
window.loadTheme = loadTheme;
window.toggleTheme = toggleTheme;
window.setupNavigation = setupNavigation;
window.setMode = setMode;
window.updateMonthLabel = updateMonthLabel;
window.refreshAll = refreshAll;
window.refreshAnalysis = refreshAnalysis;
window.setupDailyMode = setupDailyMode;
window.setupAnalysisForm = setupAnalysisForm;

setSyncToFirestore(syncToFirestore);

function renderEmojiPicker(selected, onSelect, pickerId) {
  const picker = $(pickerId || 'emojiPicker');
  if (!picker) return;
  picker.style.display = 'grid';
  picker.innerHTML = EMOJIS.map(e =>
    `<button data-emoji="${e}" class="${e === (selected || '📋') ? 'selected' : ''}">${e}</button>`
  ).join('');
  picker.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      picker.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      if (onSelect) {
        onSelect(btn.dataset.emoji);
      } else {
        $('catManagerEmoji').value = btn.dataset.emoji;
      }
      picker.style.display = 'none';
    });
  });
}

function importJSON(file) {
  showToast('Importando…');
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
      const ok = await showConfirmModal(`¿Importar ${data.transactions.length} transacciones? Se reemplazarán los datos actuales.`);
      if (!ok) return;
      state.transactions = data.transactions;
      if (data.budgets) state.budgets = data.budgets;
      if (data.categories) { state.categoriesData = data.categories; saveCategories(); }
      saveData();
      saveBudgets();
      refreshAll();
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
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('finanzapp')).map(k => caches.delete(k))));
    navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister())));
    navigator.serviceWorker.register('sw.js');
  }
}

function init() {
  loadTheme();
  loadMembers();
  loadAccounts();
  loadCategories();
  loadData();
  initFirebase();

  const savedMode = localStorage.getItem(MODE_KEY);
  setMode(savedMode !== 'analysis');

  updateMonthLabel();
  renderDailyCategories();
  updateTypeToggle();
  updateWhoToggle();
  updateAccountSelector(state.selectedWho, 'dailyAccount');
  refreshDaily();

  setupNavigation();
  setupDailyMode();
  setupRoomModal();
  setupCategoryManager();
  setupMembersPanel();
  setupAccountsPanel();
  setupAnalysisForm();
  registerServiceWorker();
}

setRemoteUpdateCallback(() => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  localStorage.setItem(BUDGET_KEY, JSON.stringify(state.budgets));
  localStorage.setItem(CATS_KEY, JSON.stringify(state.categoriesData));
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(state.members));
  refreshAll();
});

document.addEventListener('DOMContentLoaded', init);
