import { state } from './state.js';
import { FIREBASE_CONFIG, FIRESTORE_COLLECTION } from './config.js';
import { $, safeRoomCode } from './utils.js';

let onRemoteUpdate = null;
export function setRemoteUpdateCallback(fn) { onRemoteUpdate = fn; }

async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

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
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (state.isCreatingRoom && state.roomPassword) {
    data.passwordHash = await sha256(state.roomPassword);
  }
  ref.set(data, { merge: true }).catch(() => {});
  if (onRemoteUpdate) onRemoteUpdate();
  resolve();
}

export function subscribeFirestore() {
  return new Promise(async resolve => {
    const ref = state.db.collection(FIRESTORE_COLLECTION).doc(safeRoomCode(state.roomCode));

    if (!state.isCreatingRoom) {
      const snap = await ref.get().catch(() => null);
      if (snap && snap.exists) {
        const data = snap.data();
        if (data.passwordHash && state.roomPassword) {
          const hash = await sha256(state.roomPassword);
          if (hash !== data.passwordHash) {
            updateSyncStatusUI(false);
            if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
            resolve();
            return;
          }
        }
      }
    }

    state.firestoreUnsub = ref.onSnapshot(snap => {
      updateSyncStatusUI(true);
      if (!snap.exists) {
        firstTimeSetup(ref, resolve);
        return;
      }
      if (state.pendingSyncs > 0) { resolve(); return; }
      const data = snap.data();
      if (data.transactions) {
        state.transactions = JSON.parse(JSON.stringify(data.transactions));
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
  });
}

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
