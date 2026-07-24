import { state } from './state.js';
import { ROOM_KEY } from './config.js';
import { $, safeRoomCode } from './utils.js';
import { updateSyncStatus, updateRoomLabel, subscribeFirestore } from './firebase-sync.js';

function showToast(message) {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

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

export function closeRoomModal() {
  $('roomModal').classList.remove('active');
}

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
