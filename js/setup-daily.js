import { state } from './state.js';
import { $, sanitizeStr, validateAmount, generateId, getToday } from './utils.js';
import { updateTypeToggle, updateWhoToggle, renderDailyCategories, saveLastCategory } from './ui-daily.js';
import { updateAccountSelector } from './members.js';
import { addTransaction } from './data.js';
import { showToast } from './ui-modals.js';

export function setupDailyMode() {
  $('dailyTypeGasto').addEventListener('click', () => {
    state.selectedType = 'gasto';
    state.selectedCategory = null;
    state.selectedSubcategory = null;
    updateTypeToggle();
    renderDailyCategories();
    $('subcatGrid').style.display = 'none';
  });
  $('dailyTypeIngreso').addEventListener('click', () => {
    state.selectedType = 'ingreso';
    state.selectedCategory = null;
    state.selectedSubcategory = null;
    updateTypeToggle();
    renderDailyCategories();
    $('subcatGrid').style.display = 'none';
  });
  $('dailyWhoYo').addEventListener('click', () => { state.selectedWho = 'yo'; updateWhoToggle(); updateAccountSelector('yo', 'dailyAccount'); });
  $('dailyWhoPareja').addEventListener('click', () => { state.selectedWho = 'pareja'; updateWhoToggle(); updateAccountSelector('pareja', 'dailyAccount'); });
  $('dailyWhoCompartido').addEventListener('click', () => { state.selectedWho = 'compartido'; updateWhoToggle(); updateAccountSelector('compartido', 'dailyAccount'); });

  const dailyAmount = $('dailyAmount');
  const dailyDesc = $('dailyDesc');

  function addDailyTx() {
    const amount = parseFloat(dailyAmount.value);
    const err = validateAmount(amount);
    if (err) return showToast(err);
    if (!state.selectedCategory) return showToast('Elige una categoría');
    const desc = sanitizeStr(dailyDesc.value);
    const date = getToday().toISOString().slice(0, 10);
    const account = $('dailyAccount').value || 'Efectivo';
    addTransaction({ id: generateId(), type: state.selectedType, amount, category: state.selectedCategory, subcategory: state.selectedSubcategory || '', description: desc, date, who: state.selectedWho, account });
    saveLastCategory(state.selectedType, state.selectedCategory, state.selectedSubcategory);
    dailyAmount.value = '';
    dailyDesc.value = '';
    $('subcatGrid').style.display = 'none';
    state.selectedCategory = null;
    state.selectedSubcategory = null;
    renderDailyCategories(false);
    dailyAmount.focus();
  }

  $('dailyAddBtn').addEventListener('click', addDailyTx);
  dailyAmount.addEventListener('keydown', e => {
    if (e.key === 'Enter') addDailyTx();
  });
}
