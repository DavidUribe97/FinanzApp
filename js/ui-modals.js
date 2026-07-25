/**
 * Modales y feedback — toasts con acción de deshacer, confirm modal genérico,
 * modal de edición de transacciones, selectores de categorías/subcategorías
 * actualizados dinámicamente.
 */

import { state } from './state.js';
import { $, esc } from './utils.js';
import { getCatNames, getSubCatNames, getSubCatEmoji } from './categories.js';
import { updateAccountSelector } from './members.js';

let updateWhoSelectsFn = () => {};
/** Registra el callback que refresca los <select> de "quién" al cambiar miembros. */
export function setUpdateWhoSelects(fn) { updateWhoSelectsFn = fn; }

/** Muestra un toast con mensaje y opcionalmente una acción de deshacer. */
export function showToast(message, actionLabel, actionFn) {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${esc(message)}</span>`;
  if (actionLabel && actionFn) {
    const btn = document.createElement('button');
    btn.className = 'toast-btn';
    btn.textContent = actionLabel;
    btn.addEventListener('click', () => { actionFn(); dismiss(toast); });
    toast.appendChild(btn);
  }
  container.appendChild(toast);
  const timeout = setTimeout(() => dismiss(toast), 5000);
  toast._timeout = timeout;
}

function dismiss(el) {
  if (el._timeout) clearTimeout(el._timeout);
  el.style.animation = 'slideDown 0.3s ease forwards';
  setTimeout(() => el.remove(), 300);
}

/** Cierra todos los toasts visibles. */
export function dismissAllToasts() {
  $('toastContainer').querySelectorAll('.toast').forEach(dismiss);
}

/** Muestra un modal de confirmación y devuelve una promesa con true/false. */
export function showConfirmModal(msg) {
  return new Promise(resolve => {
    $('confirmMsg').textContent = msg;
    $('confirmModal').classList.add('active');
    const cleanup = () => { $('confirmModal').classList.remove('active'); };
    $('confirmOk').onclick = () => { cleanup(); resolve(true); };
    $('confirmCancel').onclick = () => { cleanup(); resolve(false); };
    $('confirmModal').onclick = e => { if (e.target === $('confirmModal')) { cleanup(); resolve(false); } };
  });
}

/** Abre el modal de edición precargando los datos de la transacción indicada. */
export function openEditModal(id) {
  const tx = state.transactions.find(t => String(t.id) === String(id));
  if (!tx) return;
  state.editingId = id;
  $('editType').value = tx.type;
  $('editAmount').value = tx.amount;
  $('editDescription').value = tx.description || '';
  $('editDate').value = tx.date;
  updateWhoSelectsFn();
  $('editWho').value = tx.who || 'yo';
  updateAccountSelector(tx.who || 'yo', 'editAccount', tx.type);
  if (tx.account) $('editAccount').value = tx.account;
  updateEditCategories();
  $('editCategory').value = tx.category;
  updateSubcategories('editType', 'editCategory', 'editSubcategory');
  if (tx.subcategory) $('editSubcategory').value = tx.subcategory;
  $('editModal').classList.add('active');
}

/** Cierra el modal de edición y limpia el estado de edición. */
export function closeEditModal() {
  $('editModal').classList.remove('active');
  state.editingId = null;
}

/** Actualiza las categorías del modal de edición según el tipo seleccionado. */
export function updateEditCategories() {
  const type = $('editType').value;
  const sel = $('editCategory');
  sel.innerHTML = getCatNames(type).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  updateSubcategories('editType', 'editCategory', 'editSubcategory');
}

/** Actualiza las categorías del formulario principal según el tipo seleccionado. */
export function updateCategories() {
  const type = $('txType').value;
  const catSel = $('txCategory');
  catSel.innerHTML = '<option value="">Seleccionar</option>' + getCatNames(type).map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  updateSubcategories('txType', 'txCategory', 'txSubcategory');
}

/** Actualiza las subcategorías de un select según tipo y categoría dados. */
export function updateSubcategories(typeId, catId, subcatId) {
  const type = $(typeId).value;
  const catName = $(catId).value;
  const subSel = $(subcatId);
  const subs = catName ? getSubCatNames(type, catName) : [];
  const cat = (state.categoriesData[type] || []).find(c => c.name === catName);
  subSel.innerHTML = '<option value="">Sin subcategoría</option>' + subs.map(s => {
    const emoji = cat ? getSubCatEmoji(type, catName, s) : '📋';
    return `<option value="${esc(s)}">${emoji} ${esc(s)}</option>`;
  }).join('');
}
