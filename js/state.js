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
  isCreatingRoom: true,
  roomCodeResolver: null,
};

/** Limpia datos de sala del state — evita que firstTimeSetup escriba data vieja a sala nueva. */
export function resetRoomState() {
  state.transactions = [];
  state.budgets = {};
  state.categoriesData = null;
  state.accounts = {};
  state.members = {};
  state.editingId = null;
  state.undoData = null;
  state.selectedCategory = null;
  state.selectedSubcategory = null;
}
