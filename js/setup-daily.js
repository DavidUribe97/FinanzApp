import { state } from './state.js';
import { $, sanitizeStr, validateAmount, generateId, getToday, formatCOP } from './utils.js';
import { updateTypeToggle, updateWhoToggle, renderDailyCategories, saveLastCategory, refreshDaily } from './ui-daily.js';
import { updateAccountSelector, parseAccountValue } from './members.js';
import { addTransaction, getAccountBalance } from './data.js';
import { showToast } from './ui-modals.js';

export function setupDailyMode() {
  $('dailyTypeGasto').addEventListener('click', () => {
    state.selectedType = 'gasto';
    state.selectedCategory = null;
    state.selectedSubcategory = null;
    updateTypeToggle();
    renderDailyCategories();
    $('subcatGrid').style.display = 'none';
    updateAccountSelector(state.selectedWho, 'dailyAccount', 'gasto');
  });
  $('dailyTypeIngreso').addEventListener('click', () => {
    state.selectedType = 'ingreso';
    state.selectedCategory = null;
    state.selectedSubcategory = null;
    updateTypeToggle();
    renderDailyCategories();
    $('subcatGrid').style.display = 'none';
    updateAccountSelector(state.selectedWho, 'dailyAccount', 'ingreso');
  });
  $('dailyWhoYo').addEventListener('click', () => { state.selectedWho = 'yo'; updateWhoToggle(); updateAccountSelector('yo', 'dailyAccount', state.selectedType); });
  $('dailyWhoPareja').addEventListener('click', () => { state.selectedWho = 'pareja'; updateWhoToggle(); updateAccountSelector('pareja', 'dailyAccount', state.selectedType); });
  $('dailyWhoCompartido').addEventListener('click', () => { state.selectedWho = 'compartido'; updateWhoToggle(); updateAccountSelector('compartido', 'dailyAccount', state.selectedType); });

  const dailyAmount = $('dailyAmount');
  const dailyDesc = $('dailyDesc');

  function addDailyTx() {
    const amount = parseFloat(dailyAmount.value);
    const err = validateAmount(amount);
    if (err) return showToast(err);
    if (!state.selectedCategory) return showToast('Elige una categoría');
    const desc = sanitizeStr(dailyDesc.value);
    const date = getToday().toISOString().slice(0, 10);
    const { who: accountOwner, account } = parseAccountValue($('dailyAccount').value || 'yo:Efectivo');
    if (state.selectedType === 'gasto' && state.selectedWho !== 'compartido') {
      const balance = getAccountBalance(accountOwner, account);
      if (balance < amount) {
        return showToast(`Saldo insuficiente en ${account}. Disponible: ${formatCOP(balance)}`);
      }
    }
    addTransaction({ id: generateId(), type: state.selectedType, amount, category: state.selectedCategory, subcategory: state.selectedSubcategory || '', description: desc, date, who: state.selectedWho, account });
    refreshDaily();
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
