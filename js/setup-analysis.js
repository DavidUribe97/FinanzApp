// Event listeners del modo análisis — formulario de transacciones, búsqueda/filtros
// con badges, presupuestos, exportación CSV/JSON, importación JSON, modal de edición.

import { state } from './state.js';
import { $, esc, formatCOP, sanitizeStr, validateAmount, generateId } from './utils.js';
import { updateWhoSelects, filterWhoForType } from './ui-members.js';
import { updateAccountSelector, parseAccountValue } from './members.js';
import { updateCategories, updateSubcategories, updateEditCategories, closeEditModal, showToast, dismissAllToasts, showConfirmModal } from './ui-modals.js';
import { addTransaction, editTransaction, getAccountBalance } from './data.js';
import { saveBudgets } from './data.js';
import { updateBudgetCategorySelect, renderBudgets } from './ui-budgets.js';
import { renderTable } from './ui-analysis.js';
import { refreshAnalysis } from './ui-navigation.js';
import { exportCSV, exportJSON } from './data.js';

/** Wire analysis-mode listeners: tx form, search/filters with badges, budgets, CSV/JSON export, JSON import, edit modal. */
export function setupAnalysisForm(onImportJSON) {
  updateWhoSelects();
  filterWhoForType($('txWho'), $('txType').value);
  filterWhoForType($('editWho'), $('editType').value);
  updateAccountSelector($('txWho').value, 'txAccount', $('txType').value);
  updateCategories();
  $('txType').addEventListener('change', () => {
    filterWhoForType($('txWho'), $('txType').value);
    updateCategories();
    updateAccountSelector($('txWho').value, 'txAccount', $('txType').value);
  });
  $('txCategory').addEventListener('change', () => updateSubcategories('txType', 'txCategory', 'txSubcategory'));
  $('txWho').addEventListener('change', () => {
    if ($('txWho').value === 'compartido' && $('txType').value === 'ingreso') {
      $('txType').value = 'gasto';
      updateCategories();
    }
    updateAccountSelector($('txWho').value, 'txAccount', $('txType').value);
  });
  $('txDate').valueAsDate = new Date();

  $('txForm').addEventListener('submit', e => {
    e.preventDefault();
    const type = $('txType').value;
    const amount = parseFloat($('txAmount').value);
    const err = validateAmount(amount);
    if (err) return showToast(err);
    const category = $('txCategory').value;
    const subcategory = $('txSubcategory').value || '';
    const description = $('txDescription').value;
    const date = $('txDate').value;
    const who = $('txWho').value;
    const { who: accountOwner, account } = parseAccountValue($('txAccount').value || 'yo:Efectivo');
    const fullAccountKey = `${accountOwner}:${account}`;
    if (!category) return showToast('Selecciona una categoría');
    if (!date) return showToast('Selecciona una fecha');
    if (type === 'gasto') {
      const balance = getAccountBalance(fullAccountKey);
      if (balance < amount) {
        return showToast(`Saldo insuficiente en ${account}. Disponible: ${formatCOP(balance)}`);
      }
    }
    const sanitizedDesc = sanitizeStr(description);
    addTransaction({ id: generateId(), type, amount, category, subcategory, description: sanitizedDesc, date, who, account: fullAccountKey });
    const flashCard = type === 'gasto' ? document.querySelector('.card.gastos') : document.querySelector('.card.ingresos');
    if (flashCard) {
      flashCard.classList.remove('flash-success', 'flash-error');
      void flashCard.offsetWidth;
      flashCard.classList.add(type === 'gasto' ? 'flash-error' : 'flash-success');
    }
    refreshAnalysis();
    updateAccountSelector($('txWho').value, 'txAccount', $('txType').value);
    $('txForm').reset();
    $('txDate').valueAsDate = new Date();
    $('txCategory').value = '';
    $('txSubcategory').innerHTML = '<option value="">Sin subcategoría</option>';
    $('txWho').value = Object.keys(state.members)[0] || 'yo';
    updateAccountSelector($('txWho').value, 'txAccount', $('txType').value);
  });

  $('txAmount').addEventListener('input', function() {
    const btn = $('btnAgregar');
    if (this.value && parseFloat(this.value) > 0) btn.classList.add('pulse');
    else btn.classList.remove('pulse');
  });

  $('searchInput').addEventListener('input', () => { dismissAllToasts(); state.undoData = null; renderTable(); updateFilterBadges(); });
  $('filterType').addEventListener('change', () => { dismissAllToasts(); state.undoData = null; renderTable(); updateFilterBadges(); });
  $('filterWho').addEventListener('change', () => { dismissAllToasts(); state.undoData = null; renderTable(); updateFilterBadges(); });

  function updateFilterBadges() {
    let container = $('activeFilters');
    if (!container) {
      container = document.createElement('div');
      container.id = 'activeFilters';
      container.className = 'active-filters';
      $('searchInput').parentElement.appendChild(container);
    }
    const badges = [];
    const search = $('searchInput').value.trim();
    const type = $('filterType').value;
    const who = $('filterWho').value;
    if (search) badges.push({ label: `Buscar: ${search}`, clear: () => { $('searchInput').value = ''; renderTable(); updateFilterBadges(); } });
    if (type !== 'todos') badges.push({ label: type === 'gasto' ? 'Gastos' : 'Ingresos', clear: () => { $('filterType').value = 'todos'; renderTable(); updateFilterBadges(); } });
    if (who !== 'todos') {
      const whoLabel = state.members[who] || who;
      badges.push({ label: whoLabel, clear: () => { $('filterWho').value = 'todos'; renderTable(); updateFilterBadges(); } });
    }
    container.innerHTML = badges.map((b, i) => `<span class="filter-badge" data-idx="${i}">${esc(b.label)} <span class="filter-x">×</span></span>`).join('');
    container.querySelectorAll('.filter-badge').forEach((el, i) => {
      el.addEventListener('click', () => badges[i].clear());
    });
  }

  $('toggleBudgetForm').addEventListener('click', () => {
    const wrap = $('budgetFormWrap');
    wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
  });

  updateBudgetCategorySelect();

  $('saveBudget').addEventListener('click', () => {
    const cat = $('budgetCategory').value;
    const amount = parseFloat($('budgetAmount').value);
    if (!cat || !amount || amount <= 0) return showToast('Selecciona categoría y monto');
    state.budgets[cat] = amount;
    saveBudgets();
    $('budgetAmount').value = '';
    updateBudgetCategorySelect();
    if ($('budgetCategory').options.length > 0) $('budgetCategory').value = $('budgetCategory').options[0].value;
    renderBudgets();
    showToast(`Presupuesto de ${cat}: ${formatCOP(amount)}`);
  });

  $('resetBudgets').addEventListener('click', async () => {
    const ok = await showConfirmModal('¿Resetear todos los presupuestos?');
    if (!ok) return;
    state.budgets = {};
    saveBudgets();
    updateBudgetCategorySelect();
    renderBudgets();
    showToast('Presupuestos eliminados');
  });

  $('btnExportCSV').addEventListener('click', exportCSV);
  $('btnExportJSON').addEventListener('click', exportJSON);
  $('btnImport').addEventListener('click', () => $('fileInput').click());
  $('fileInput').addEventListener('change', e => {
    if (e.target.files[0] && onImportJSON) onImportJSON(e.target.files[0]);
    e.target.value = '';
  });

  $('editType').addEventListener('change', () => {
    filterWhoForType($('editWho'), $('editType').value);
    updateEditCategories();
    updateAccountSelector($('editWho').value, 'editAccount', $('editType').value);
  });
  $('editCategory').addEventListener('change', () => updateSubcategories('editType', 'editCategory', 'editSubcategory'));
  $('editWho').addEventListener('change', () => {
    if ($('editWho').value === 'compartido' && $('editType').value === 'ingreso') {
      $('editType').value = 'gasto';
      updateEditCategories();
    }
    updateAccountSelector($('editWho').value, 'editAccount', $('editType').value);
  });

  $('editForm').addEventListener('submit', e => {
    e.preventDefault();
    if (state.editingId === null) return;
    const type = $('editType').value;
    const amount = parseFloat($('editAmount').value);
    const err = validateAmount(amount);
    if (err) return showToast(err);
    const category = $('editCategory').value;
    const subcategory = $('editSubcategory').value || '';
    const description = $('editDescription').value;
    const date = $('editDate').value;
    const who = $('editWho').value;
    const { who: accountOwner, account } = parseAccountValue($('editAccount').value || 'yo:Efectivo');
    const fullAccountKey = `${accountOwner}:${account}`;
    if (!category) return showToast('Selecciona una categoría');
    if (!date) return showToast('Selecciona una fecha');
    if (type === 'gasto') {
      const prevTx = state.transactions.find(t => String(t.id) === String(state.editingId));
      let balance = getAccountBalance(fullAccountKey);
      if (prevTx && prevTx.account === fullAccountKey) {
        balance += prevTx.amount;
      }
      if (balance < amount) {
        return showToast(`Saldo insuficiente en ${account}. Disponible: ${formatCOP(balance)}`);
      }
    }
    const sanitizedDesc = sanitizeStr(description);
    editTransaction(state.editingId, { type, amount, category, subcategory, description: sanitizedDesc, date, who, account: fullAccountKey });
    closeEditModal();
    showToast('Transacción actualizada');
    updateAccountSelector($('editWho').value, 'editAccount', $('editType').value);
  });

  $('cancelEdit').addEventListener('click', closeEditModal);
  $('editModal').addEventListener('click', e => {
    if (e.target === $('editModal')) closeEditModal();
  });
}
