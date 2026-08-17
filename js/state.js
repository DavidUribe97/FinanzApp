import { DEFAULT_CATEGORIES, DEFAULT_MEMBERS, DEFAULT_ACCOUNTS } from './config.js';

/**
 * State centralizado — único dueño de variables mutables de la app.
 * Todos los módulos importan este objeto y mutan sus propiedades directamente
 * (state.x = ...), nunca reasignan el import.
 */
export const state = {
  transactions: [],
  budgets: {},
  members: {},
  accounts: {},
  categoriesData: null,
  roomCode: null,
  roomPassword: null,
  editingId: null,
  undoData: null,
  isDailyMode: true,
  selectedType: 'gasto',
  selectedCategory: null,
  selectedSubcategory: null,
  selectedWho: 'yo',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  doughnutChart: null,
  barChart: null,
  lineChart: null,
  firebaseInitialized: false,
  firestoreUnsub: null,
  db: null,
  pendingSyncs: 0,
  isCreatingRoom: false,
  roomCodeResolver: null,
  deletedMembers: {},
};

/** Limpia datos de sala del state — restablece a defaults para que la sala nueva arranque con datos válidos. */
export function resetRoomState() {
  state.transactions = [];
  state.budgets = {};
  state.categoriesData = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  state.accounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  state.members = { ...DEFAULT_MEMBERS };
  state.editingId = null;
  state.undoData = null;
  state.selectedCategory = null;
  state.selectedSubcategory = null;
}
