// Modal de sala: crear, unirse y salir.
// Maneja código de sala, contraseña y persistencia en localStorage.
// Importa showToast de ui-modals.js para feedback.
import { state } from './state.js';
import { ROOM_KEY } from './config.js';
import { $ } from './utils.js';
import { updateSyncStatus, updateRoomLabel, subscribeFirestore } from './firebase-sync.js';
import { showToast } from './ui-modals.js';

/** Abre el modal de sala, configurando tabs y campos según si hay sala activa. */
export function openRoomModal() {
  $('roomCodeDisplay').textContent = state.roomCode || '—';
  $('roomCodeInput').value = state.roomCode || '';
  $('roomPasswordInput').value = '';
  $('roomPasswordConfirm').value = '';
  $('roomLeaveRow').style.display = state.roomCode ? 'block' : 'none';
  if (state.roomCode) {
    state.isCreatingRoom = false;
    $('roomTabJoin').style.background = 'var(--accent-blue)';
    $('roomTabJoin').style.color = '#fff';
    $('roomTabCreate').style.background = 'var(--bg-card)';
    $('roomTabCreate').style.color = 'var(--text-secondary)';
    $('roomConfirmGroup').style.display = 'none';
    $('roomSubmitBtn').textContent = 'Unirse a sala';
    $('roomPasswordInput').placeholder = 'Contraseña (opcional si la sala no tiene clave)';
    $('roomPasswordInput').required = false;
  } else {
    state.isCreatingRoom = true;
    $('roomTabCreate').style.background = 'var(--accent-blue)';
    $('roomTabCreate').style.color = '#fff';
    $('roomTabJoin').style.background = 'var(--bg-card)';
    $('roomTabJoin').style.color = 'var(--text-secondary)';
    $('roomConfirmGroup').style.display = 'block';
    $('roomSubmitBtn').textContent = 'Crear sala';
    $('roomPasswordInput').placeholder = 'Contraseña';
    $('roomPasswordInput').required = true;
  }
  $('roomModal').classList.add('active');
}

/** Cierra el modal de sala. */
export function closeRoomModal() {
  $('roomModal').classList.remove('active');
}

/** Desuscribe Firestore, limpia roomCode/password del state y localStorage, y cierra el modal. */
export function leaveRoom() {
  if (state.firestoreUnsub) { state.firestoreUnsub(); state.firestoreUnsub = null; }
  state.roomCode = null;
  state.roomPassword = null;
  localStorage.removeItem(ROOM_KEY);
  localStorage.removeItem(ROOM_KEY + '_pwd');
  updateSyncStatus(false);
  updateRoomLabel();
  closeRoomModal();
  showToast('Has salido de la sala');
}

/** Asocia los event listeners del modal de sala (tabs, formulario, skip, backdrop, salir). */
export function setupRoomModal() {
  $('roomTabCreate').addEventListener('click', () => {
    state.isCreatingRoom = true;
    $('roomTabCreate').style.background = 'var(--accent-blue)';
    $('roomTabCreate').style.color = '#fff';
    $('roomTabJoin').style.background = 'var(--bg-card)';
    $('roomTabJoin').style.color = 'var(--text-secondary)';
    $('roomConfirmGroup').style.display = 'block';
    $('roomSubmitBtn').textContent = 'Crear sala';
    $('roomPasswordInput').placeholder = 'Contraseña';
    $('roomPasswordInput').required = true;
  });
  $('roomTabJoin').addEventListener('click', () => {
    state.isCreatingRoom = false;
    $('roomTabJoin').style.background = 'var(--accent-blue)';
    $('roomTabJoin').style.color = '#fff';
    $('roomTabCreate').style.background = 'var(--bg-card)';
    $('roomTabCreate').style.color = 'var(--text-secondary)';
    $('roomConfirmGroup').style.display = 'none';
    $('roomSubmitBtn').textContent = 'Unirse a sala';
    $('roomPasswordInput').placeholder = 'Contraseña (opcional si la sala no tiene clave)';
    $('roomPasswordInput').required = false;
  });

  $('roomForm').addEventListener('submit', async e => {
    e.preventDefault();
    const newCode = $('roomCodeInput').value.trim();
    if (!newCode) return showToast('Ingresa un código de sala');
    if (newCode.length < 6) return showToast('El código debe tener al menos 6 caracteres');
    const password = $('roomPasswordInput').value;

    if (state.isCreatingRoom) {
      if (!password) return showToast('Ingresa una contraseña para la sala');
      if (password.length < 4) return showToast('La contraseña debe tener al menos 4 caracteres');
      const confirm = $('roomPasswordConfirm').value;
      if (password !== confirm) return showToast('Las contraseñas no coinciden');
      state.roomPassword = password;
    } else {
      state.roomPassword = password || null;
    }

    state.roomCode = newCode;
    localStorage.setItem(ROOM_KEY, state.roomCode);
    if (state.roomPassword) localStorage.setItem(ROOM_KEY + '_pwd', state.roomPassword);
    else localStorage.removeItem(ROOM_KEY + '_pwd');

    closeRoomModal();
    if (state.firestoreUnsub) { state.firestoreUnsub(); state.firestoreUnsub = null; }
    if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
    else { subscribeFirestore(); }
    showToast(`Sala: ${state.roomCode}`);
  });
  $('roomSkipBtn').addEventListener('click', () => {
    closeRoomModal();
    if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; }
    showToast('Modo offline — sin sincronización');
  });
  $('roomModal').addEventListener('click', e => {
    if (e.target === $('roomModal')) { closeRoomModal(); if (state.roomCodeResolver) { state.roomCodeResolver(); state.roomCodeResolver = null; } }
  });
  $('roomLeaveBtn').addEventListener('click', leaveRoom);
}
