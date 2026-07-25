import { state } from './state.js';
import { $, esc, formatCOP } from './utils.js';
import { getFilteredTransactions, getCumulativeBalance, getDisplayTransactions, deleteTransaction as deleteTransactionData, restoreTransaction } from './data.js';
import { getSubCatEmoji } from './categories.js';
import { isCashAccount, getMemberBadgeStyle, getWhoLabel, getAccountsForMember } from './members.js';
import { openEditModal, showToast } from './ui-modals.js';

export function renderSummary() {
  const filtered = getFilteredTransactions(state.currentMonth, state.currentYear);
  const totalIngresos = filtered.filter(tx => tx.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const totalGastos = filtered.filter(tx => tx.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const carryBalance = getCumulativeBalance(state.currentMonth, state.currentYear);
  const saldo = carryBalance + totalIngresos - totalGastos;
  $('totalIngresos').textContent = formatCOP(totalIngresos);
  $('totalGastos').textContent = formatCOP(totalGastos);
  const saldoEl = $('saldoNeto');
  saldoEl.textContent = formatCOP(Math.abs(saldo));
  const card = saldoEl.parentElement;
  card.classList.remove('positive', 'negative');
  card.classList.add(saldo >= 0 ? 'positive' : 'negative');
  $('numTransacciones').textContent = filtered.length;
}

export function renderTable() {
  const display = getDisplayTransactions();
  const body = $('txBody');
  const empty = $('emptyState');
  const wrap = $('tableWrap');
  if (display.length === 0) {
    wrap.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  wrap.style.display = 'block';
  empty.style.display = 'none';
  body.innerHTML = display.map(tx => {
    const whoVal = tx.who || 'yo';
    const acctName = tx.account || 'Efectivo';
    const acctCls = isCashAccount(acctName) ? 'cash' : 'digital';
    const acctIcon = isCashAccount(acctName) ? '💵' : '🏦';
    let acctOwner = '';
    for (const [mid, accts] of Object.entries(state.accounts)) {
      if (accts.includes(acctName)) { acctOwner = getWhoLabel(mid); break; }
    }
    const acctDisplay = acctOwner ? `${esc(acctName)} (${acctOwner})` : esc(acctName);
    return `
    <tr class="fade-in">
      <td>${tx.date}</td>
      <td><span class="badge badge-${tx.type}">${tx.type === 'ingreso' ? 'Ingreso' : 'Gasto'}</span></td>
      <td>${esc(tx.category)}</td>
      <td>${tx.subcategory ? getSubCatEmoji(tx.type, tx.category, tx.subcategory) + ' ' + esc(tx.subcategory) : '—'}</td>
      <td>${esc(tx.description || '—')}</td>
      <td><span class="badge" style="background:${getMemberBadgeStyle(whoVal).bg};color:${getMemberBadgeStyle(whoVal).color}">${getWhoLabel(whoVal)}</span></td>
      <td><span class="account-tag ${acctCls}" style="margin:0;font-size:12px">${acctIcon} ${acctDisplay}</span></td>
      <td class="monto ${tx.type === 'ingreso' ? 'positive' : 'negative'}">${formatCOP(tx.amount)}</td>
      <td>
        <button class="btn-sm" data-edit="${tx.id}" title="Editar">✏️</button>
        <button class="btn-sm danger" data-del="${tx.id}" title="Eliminar">🗑️</button>
      </td>
    </tr>
  `}).join('');
  body.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = deleteTransactionData(btn.dataset.del);
      if (tx) {
        renderTable();
        showToast(`"${tx.description || tx.category}" eliminado`, 'Deshacer', () => {
          restoreTransaction();
          renderTable();
        });
      }
    });
  });
  body.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.edit));
  });
}
