// Firebase Auth anónimo + Firestore sync en tiempo real.
// Usa setRemoteUpdateCallback(fn) para notificar datos remotos (nunca importa módulos de dominio — regla 2 de dependencias).
// Incluye verificación de passwordHash de sala.
import { state } from './state.js';
import { FIREBASE_CONFIG, FIRESTORE_COLLECTION, ROOM_KEY, COMPARTIDO_ID } from './config.js';
import { isValidTx, isValidBudgets, isValidCategories } from './data.js';
import { $, safeRoomCode } from './utils.js';
import { showToast } from './ui-modals.js';

let onRemoteUpdate = null;
/** Registra un callback que se invoca cuando llegan datos remotos de Firestore. */
export function setRemoteUpdateCallback(fn) { onRemoteUpdate = fn; }

let _syncDebounceTimer = null;
const SYNC_DEBOUNCE_MS = 600;

async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Actualiza el indicador visual de estado de conexión y la etiqueta de sala. */
function updateSyncStatusUI(connected) {
  const el = $('syncStatus');
  if (connected) {
    el.textContent = '●';
    el.style.color = 'var(--accent-green)';
    el.title = 'Conectado';
  } else {
    el.textContent = '○';
    el.style.color = 'var(--text-muted)';
    el.title = 'Sin conexión';
  }
  updateRoomLabel();
}

/** Muestra el código de sala actual en la etiqueta de la UI. */
function updateRoomLabel() {
  const label = $('roomCodeLabel');
  if (state.roomCode) {
    label.textContent = state.roomCode;
    label.title = 'Sala: ' + state.roomCode;
  } else {
    label.textContent = '';
    label.title = '';
  }
}

export { updateSyncStatusUI as updateSyncStatus, updateRoomLabel };

/** Envía el estado completo de transacciones, presupuestos, categorías, miembros y cuentas a Firestore (con debounce). */
export function syncToFirestore() {
  if (!state.db || !state.roomCode) return;
  if (!state.firebaseInitialized) { state.pendingSyncs++; return; }
  if (_syncDebounceTimer) clearTimeout(_syncDebounceTimer);
  _syncDebounceTimer = setTimeout(_doSyncToFirestore, SYNC_DEBOUNCE_MS);
}

async function _doSyncToFirestore() {
  if (!state.db || !state.roomCode) return;
  try {
    state.pendingSyncs++;
    const ref = state.db.collection(FIRESTORE_COLLECTION).doc(safeRoomCode(state.roomCode));
    const snap = await ref.get().catch(() => null);
    const existingPasswordHash = (snap && snap.exists) ? (snap.data().passwordHash || null) : null;
    const validTx = state.transactions.filter(isValidTx);
    const payload = {
      transactions: validTx,
      budgets: isValidBudgets(state.budgets) ? state.budgets : {},
      categories: state.categoriesData,
      members: state.members,
      accounts: state.accounts,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (existingPasswordHash) payload.passwordHash = existingPasswordHash;
    await ref.set(payload);
    state.pendingSyncs = 0;
  } catch (e) {
    state.pendingSyncs = 0;
    console.warn('Error syncing to Firestore:', e.message);
    updateSyncStatusUI(false);
  }
}

function flushPendingSyncs() {
  if (state.pendingSyncs > 0) {
    state.pendingSyncs = 0;
    syncToFirestore();
  }
}

async function firstTimeSetup(ref, resolve) {
  const data = {
    transactions: state.transactions,
    budgets: state.budgets,
    categories: state.categoriesData,
    members: state.members,
    accounts: state.accounts,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (state.isCreatingRoom && state.roomPassword) {
    data.passwordHash = await sha256(state.roomPassword);
  }
  try {
    await ref.set(data);
    const counterRef = state.db.collection('config').doc('meta');
    await counterRef.set({ roomCount: firebase.firestore.FieldValue.increment(1) }, { merge: true });
  } catch (e) {
    console.warn('Error creando sala:', e.message);
    updateSyncStatusUI(false);
    showToast('Error al crear sala');
    resolve();
    return;
  }
  if (onRemoteUpdate) onRemoteUpdate();
  resolve();
}

/** Suscribe un listener en tiempo real al documento de sala en Firestore, verificando passwordHash si existe. */
export function subscribeFirestore() {
  return new Promise(resolve => {
    const ref = state.db.collection(FIRESTORE_COLLECTION).doc(safeRoomCode(state.roomCode));

    function startSnapshot() {
      state.firestoreUnsub = ref.onSnapshot(snap => {
        updateSyncStatusUI(true);
        if (!snap.exists) {
          if (state.isCreatingRoom) {
            firstTimeSetup(ref, resolve);
          } else {
            updateSyncStatusUI(false);
            showToast('Sala no encontrada');
            localStorage.removeItem(ROOM_KEY);
            sessionStorage.removeItem(ROOM_KEY + '_pwd');
            state.roomCode = null;
            state.roomPassword = null;
            updateRoomLabel();
            resolve();
          }
          return;
        }
        if (state.pendingSyncs > 0) { resolve(); return; }
        const data = snap.data();
        if (data.transactions) {
          state.transactions = JSON.parse(JSON.stringify(data.transactions)).filter(tx => !(tx.who === COMPARTIDO_ID && tx.type === 'ingreso'));
        }
        if (data.budgets) {
          state.budgets = JSON.parse(JSON.stringify(data.budgets));
        }
        if (data.categories) {
          state.categoriesData = JSON.parse(JSON.stringify(data.categories));
        }
        if (data.members) {
          state.members = JSON.parse(JSON.stringify(data.members));
        }
        if (data.accounts) {
          state.accounts = JSON.parse(JSON.stringify(data.accounts));
        }
        if (onRemoteUpdate) onRemoteUpdate();
        resolve();
      }, err => {
        console.warn('Firestore snapshot error:', err.message);
        updateSyncStatusUI(false);
        if (err.code === 'permission-denied') {
          showToast('Error de permisos — verifica la sala');
        }
        resolve();
      });
    }

    if (state.isCreatingRoom) { startSnapshot(); return; }

    ref.get().catch(() => null).then(snap => {
      if (snap && snap.exists && snap.data().passwordHash) {
        if (!state.roomPassword) {
          promptRoomPassword(ref, snap.data().passwordHash, startSnapshot, resolve);
          return;
        }
        sha256(state.roomPassword).then(hash => {
          if (hash !== snap.data().passwordHash) {
            updateSyncStatusUI(false);
            showToast('Contraseña incorrecta');
            promptRoomPassword(ref, snap.data().passwordHash, startSnapshot, resolve);
            return;
          }
          startSnapshot();
        });
        return;
      }
      startSnapshot();
    });
  });
}

/**
 * Abre el modal de sala en modo "Unirse" para pedir la contraseña.
 * Espera a que el usuario la ingrese, valida contra passwordHash, y continúa.
 */
function promptRoomPassword(ref, passwordHash, onVerified, resolve) {
  updateSyncStatusUI(false);
  import('./firebase-room.js').then(({ openRoomModal }) => {
    openRoomModal();
    showToast('Ingresa la contraseña de la sala');
    const PASSWORD_TIMEOUT_MS = 120000;
    let timeoutId;
    state.roomCodeResolver = () => {
      state.roomCodeResolver = null;
      clearTimeout(timeoutId);
      if (!state.roomPassword) {
        updateSyncStatusUI(false);
        resolve();
        return;
      }
      sha256(state.roomPassword).then(hash => {
        if (hash !== passwordHash) {
          updateSyncStatusUI(false);
          showToast('Contraseña incorrecta');
          promptRoomPassword(ref, passwordHash, onVerified, resolve);
          return;
        }
        onVerified();
      });
    };
    timeoutId = setTimeout(() => {
      if (state.roomCodeResolver) {
        state.roomCodeResolver();
        state.roomCodeResolver = null;
        updateSyncStatusUI(false);
        resolve();
      }
    }, PASSWORD_TIMEOUT_MS);
  });
}

/** Inicializa Firebase Auth anónimo, Firestore y abre el modal de sala si no hay sala guardada. */
export async function initFirebase() {
  if (state.firebaseInitialized) return;
  try {
    updateSyncStatusUI(false);
    firebase.initializeApp(FIREBASE_CONFIG);
    await firebase.auth().signInAnonymously();
    state.db = firebase.firestore();
    state.roomCode = localStorage.getItem(ROOM_KEY);
    if (!state.roomCode) {
      const { openRoomModal } = await import('./firebase-room.js');
      openRoomModal();
      const ROOM_TIMEOUT_MS = 120000;
      await new Promise(resolve => {
        state.roomCodeResolver = resolve;
        setTimeout(() => {
          if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
        }, ROOM_TIMEOUT_MS);
      });
      state.roomCode = localStorage.getItem(ROOM_KEY);
      if (!state.roomCode) { state.firebaseInitialized = true; updateSyncStatusUI(false); return; }
    }
    state.roomPassword = sessionStorage.getItem(ROOM_KEY + '_pwd');
    updateSyncStatusUI(true);
    await subscribeFirestore();
    state.firebaseInitialized = true;
    flushPendingSyncs();
  } catch (e) {
    console.warn('Firebase no disponible, modo offline:', e.message);
    state.firebaseInitialized = true;
    updateSyncStatusUI(false);
  }
}
