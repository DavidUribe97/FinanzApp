/**
 * Panel de administración de miembros — lista, agregar, editar, eliminar (defaults no se eliminan).
 * Al eliminar, reasigna transacciones a "Compartido".
 * Usa setNotifyRefresh(fn) para notificar refresco (regla 4 de dependencias).
 */
import { state } from './state.js';
import { $, esc, sanitizeStr } from './utils.js';
import { loadMembers, saveMembers, updateAccountSelector } from './members.js';
import { showConfirmModal, showToast } from './ui-modals.js';
import { saveData } from './data.js';
import { updateWhoToggle } from './ui-daily.js';

let notifyRefreshFn = () => {};
/** Registra callback que se invoca al modificar miembros para notificar refresco. */
export function setNotifyRefresh(fn) { notifyRefreshFn = fn; }

/** Renderiza la lista de miembros con botones de editar/eliminar. */
export function renderMembers() {
  const list = $('membersList');
  list.innerHTML = Object.entries(state.members).map(([id, name]) => {
    const isDefault = ['yo','pareja','compartido'].includes(id);
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
      const ok = await showConfirmModal(`¿Eliminar a "${name}"? Sus transacciones pasarán a "Compartido".`);
      if (!ok) return;
      state.transactions.forEach(tx => {
        if ((tx.who || 'yo') === id) tx.who = 'compartido';
      });
      delete state.members[id];
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
  const opt = selectEl.querySelector('option[value="compartido"]');
  if (!opt) return;
  if (type === 'ingreso') {
    opt.disabled = true;
    opt.style.display = 'none';
    if (selectEl.value === 'compartido') selectEl.value = 'yo';
  } else {
    opt.disabled = false;
    opt.style.display = '';
  }
}
