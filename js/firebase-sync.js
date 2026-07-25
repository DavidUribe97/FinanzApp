// Firebase Auth anónimo + Firestore sync en tiempo real.
// Usa setRemoteUpdateCallback(fn) para notificar datos remotos (nunca importa módulos de dominio — regla 2 de dependencias).
// Incluye verificación de passwordHash de sala.
import { state } from './state.js';
import { FIREBASE_CONFIG, FIRESTORE_COLLECTION } from './config.js';
import { $, safeRoomCode } from './utils.js';
import { showToast } from './ui-modals.js';

let onRemoteUpdate = null;
/** Registra un callback que se invoca cuando llegan datos remotos de Firestore. */
export function setRemoteUpdateCallback(fn) { onRemoteUpdate = fn; }

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

/** Envía el estado completo de transacciones, presupuestos, categorías, miembros y cuentas a Firestore. */
export async function syncToFirestore() {
  if (!state.db || !state.roomCode) return;
  if (!state.firebaseInitialized) { state.pendingSyncs++; return; }
  try {
    await state.db.collection(FIRESTORE_COLLECTION).doc(safeRoomCode(state.roomCode)).set({
      transactions: state.transactions,
      budgets: state.budgets,
      categories: state.categoriesData,
      members: state.members,
      accounts: state.accounts,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
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
    await ref.set(data, { merge: true });
  } catch (e) {
    console.warn('Error creando sala:', e.message);
    updateSyncStatusUI(false);
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
          firstTimeSetup(ref, resolve);
          return;
        }
        if (state.pendingSyncs > 0) { resolve(); return; }
        const data = snap.data();
        if (data.transactions) {
          state.transactions = JSON.parse(JSON.stringify(data.transactions)).filter(tx => !(tx.who === 'compartido' && tx.type === 'ingreso'));
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
        resolve();
      });
    }

    if (state.isCreatingRoom) { startSnapshot(); return; }

    ref.get().catch(() => null).then(snap => {
      if (snap && snap.exists && snap.data().passwordHash) {
        if (!state.roomPassword) {
          updateSyncStatusUI(false);
          showToast('Esta sala requiere contraseña');
          if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
          resolve();
          return;
        }
        sha256(state.roomPassword).then(hash => {
          if (hash !== snap.data().passwordHash) {
            updateSyncStatusUI(false);
            if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
            resolve();
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

/** Inicializa Firebase Auth anónimo, Firestore y abre el modal de sala si no hay sala guardada. */
export async function initFirebase() {
  if (state.firebaseInitialized) return;
  try {
    updateSyncStatusUI(false);
    firebase.initializeApp(FIREBASE_CONFIG);
    await firebase.auth().signInAnonymously();
    state.db = firebase.firestore();
    state.roomCode = localStorage.getItem('finanzas_room');
    if (!state.roomCode) {
      const { openRoomModal } = await import('./firebase-room.js');
      openRoomModal();
      await new Promise(resolve => { state.roomCodeResolver = resolve; });
      state.roomCode = localStorage.getItem('finanzas_room');
      if (!state.roomCode) { state.firebaseInitialized = true; updateSyncStatusUI(false); return; }
    }
    state.roomPassword = localStorage.getItem('finanzas_room_pwd');
    state.isCreatingRoom = false;
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
