/**
 * Panel de administración de miembros — lista, agregar, editar, eliminar (defaults no se eliminan).
 * Al eliminar, pregunta a qué miembro migrar sus movimientos y cuentas.
 * Usa setNotifyRefresh(fn) para notificar refresco (regla 4 de dependencias).
 */
import { state } from './state.js';
import { $, esc, sanitizeStr } from './utils.js';
import { saveMembers, saveAccounts, isSharedMember, isDefaultMember } from './members.js';
import { COMPARTIDO_ID, DEFAULT_MEMBER_IDS } from './config.js';
import { showConfirmModal, showToast, showPickModal } from './ui-modals.js';
import { saveData } from './data.js';
import { updateWhoToggle } from './ui-daily.js';

let notifyRefreshFn = () => {};
/** Registra callback que se invoca al modificar miembros para notificar refresco. */
export function setNotifyRefresh(fn) { notifyRefreshFn = fn; }

/** Renderiza la lista de miembros con botones de editar/eliminar. */
export function renderMembers() {
  const list = $('membersList');
  list.innerHTML = Object.entries(state.members).map(([id, name]) => {
    const isDefault = isDefaultMember(id);
    return `
    <div class="cat-manager-item">
      <span class="cm-name">${esc(name)}</span>
      <span class="cm-type" style="font-size:10px">${id}</span>
      <span class="cm-actions">
        <button class="cm-edit" data-member="${id}" title="Editar">✏️</button>
        ${!isDefault ? `<button class="cm-del" data-member="${id}" title="Eliminar">🗑️</button>` : ''}
      </span>
    </div>`;
  }).join('');

  list.querySelectorAll('.cm-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.member;
      $('memberNameInput').value = state.members[id];
      $('memberEditId').value = id;
      $('memberForm').style.display = 'block';
      $('memberNameInput').focus();
    });
  });
  list.querySelectorAll('.cm-del').forEach(async btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.member;
      const name = state.members[id];
      const moves = state.transactions.filter(tx => (tx.who || 'yo') === id);
      if (moves.length > 0) {
        const targets = Object.entries(state.members)
          .filter(([mid]) => mid !== id && !isSharedMember(mid))
          .map(([mid, mname]) => ({ value: mid, label: mname }));
        if (targets.length === 0) {
          showToast('No puedes eliminar el último miembro con movimientos');
          return;
        }
        const target = await showPickModal({
          title: 'Migrar miembro',
          message: `"${name}" tiene ${moves.length} movimientos. ¿A quién se los asigno?`,
          options: targets
        });
        if (target === null) return;
        const targetAccounts = state.accounts[target] || [];
        state.transactions.forEach(tx => {
          if ((tx.who || 'yo') === id) {
            tx.who = (isSharedMember(target) && tx.type === 'ingreso') ? 'yo' : target;
            if (tx.account) {
              const acct = tx.account.includes(':') ? tx.account.split(':').slice(1).join(':') : tx.account;
              const destAcct = targetAccounts.includes(acct) ? acct : 'Efectivo';
              tx.account = `${target}:${destAcct}`;
            }
          }
        });
      } else {
        const ok = await showConfirmModal(`¿Eliminar a "${name}"?`);
        if (!ok) return;
      }
      delete state.accounts[id];
      delete state.members[id];
      saveAccounts();
      saveMembers();
      saveData();
      renderMembers();
      updateWhoToggle();
      notifyRefreshFn();
    });
  });
}

/** Vincula eventos del formulario de agregar/editar miembro. */
export function setupMembersPanel() {
  $('addMemberBtn').addEventListener('click', () => {
    $('memberNameInput').value = '';
    $('memberEditId').value = '';
    $('memberForm').style.display = 'block';
    $('memberNameInput').focus();
  });
  $('cancelMemberBtn').addEventListener('click', () => {
    $('memberForm').style.display = 'none';
  });
  $('saveMemberBtn').addEventListener('click', () => {
    const name = sanitizeStr($('memberNameInput').value, 50);
    if (!name) return showToast('Escribe un nombre');
    const editId = $('memberEditId').value;
    if (editId) {
      state.members[editId] = name;
    } else {
      let newId = 'm4';
      let counter = 4;
      while (state.members[newId]) { counter++; newId = 'm' + counter; }
      state.members[newId] = name;
      if (!state.accounts[newId]) {
        state.accounts[newId] = ['Efectivo'];
        saveAccounts();
      }
    }
    saveMembers();
    $('memberForm').style.display = 'none';
    renderMembers();
    updateWhoToggle();
    updateWhoSelects();
    notifyRefreshFn();
    showToast(editId ? 'Miembro actualizado' : 'Miembro añadido');
  });
}

/** Actualiza los selectores de miembro (filtro, tx, edit) con la lista actual. */
export function updateWhoSelects() {
  const opts = Object.entries(state.members).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
  $('txWho').innerHTML = opts;
  $('editWho').innerHTML = opts;
  $('filterWho').innerHTML = '<option value="todos">Todos</option>' + opts;
}

/** Oculta/muestra "Compartido" en un select de quién según el tipo (ingreso lo excluye). */
export function filterWhoForType(selectEl, type) {
  const opt = selectEl.querySelector(`option[value="${COMPARTIDO_ID}"]`);
  if (!opt) return;
  if (type === 'ingreso') {
    opt.disabled = true;
    opt.style.display = 'none';
    if (selectEl.value === COMPARTIDO_ID) selectEl.value = 'yo';
  } else {
    opt.disabled = false;
    opt.style.display = '';
  }
}
