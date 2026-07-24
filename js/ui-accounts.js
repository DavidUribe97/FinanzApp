import { state } from './state.js';
import { $, esc, sanitizeStr } from './utils.js';
import { saveAccounts, isCashAccount, updateAccountSelector } from './members.js';
import { showToast } from './ui-modals.js';

export function renderAccountsPanel() {
  const list = $('accountsList');
  if (!list) return;
  let html = '';
  Object.entries(state.members).forEach(([id, name]) => {
    const accts = state.accounts[id] || [];
    html += `<div class="accounts-member-label">${esc(name)}</div>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">`;
    accts.forEach((a, idx) => {
      const cls = isCashAccount(a) ? 'cash' : 'digital';
      const icon = isCashAccount(a) ? '💵' : '🏦';
      html += `<span class="account-tag ${cls}">
        ${icon} ${esc(a)}
        <span class="account-tag-actions">
          <button class="btn-sm" data-edit-account="${id}:${idx}" title="Editar">✏️</button>
          <button class="btn-sm danger" data-del-account="${id}:${idx}" title="Eliminar">✕</button>
        </span>
      </span>`;
    });
    if (accts.length === 0) {
      html += `<span style="color:var(--text-muted);font-size:13px">Sin cuentas</span>`;
    }
    html += `</div>`;
  });
  list.innerHTML = html;

  list.querySelectorAll('[data-edit-account]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [memberId, idx] = btn.dataset.editAccount.split(':');
      const acctName = state.accounts[memberId][parseInt(idx)];
      $('accountMemberSelect').value = memberId;
      $('accountNameInput').value = acctName;
      $('accountEditIdx').value = idx;
      $('accountForm').style.display = 'block';
    });
  });
  list.querySelectorAll('[data-del-account]').forEach(btn => {
    btn.addEventListener('click', () => {
      const [memberId, idx] = btn.dataset.delAccount.split(':');
      const accts = state.accounts[memberId] || [];
      accts.splice(parseInt(idx), 1);
      if (accts.length === 0) {
        accts.push('Efectivo');
      }
      state.accounts[memberId] = accts;
      saveAccounts();
      renderAccountsPanel();
    });
  });
}

export function setupAccountsPanel() {
  $('addAccountBtn').addEventListener('click', () => {
    const sel = $('accountMemberSelect');
    sel.innerHTML = Object.entries(state.members).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
    $('accountNameInput').value = '';
    $('accountEditIdx').value = '-1';
    $('accountForm').style.display = 'block';
    $('accountNameInput').focus();
  });
  $('cancelAccountBtn').addEventListener('click', () => {
    $('accountForm').style.display = 'none';
  });
  $('saveAccountBtn').addEventListener('click', () => {
    const memberId = $('accountMemberSelect').value;
    const name = sanitizeStr($('accountNameInput').value, 30).trim();
    if (!name) return showToast('Escribe un nombre de cuenta');
    if (!state.accounts[memberId]) state.accounts[memberId] = [];
    const editIdx = parseInt($('accountEditIdx').value);
    if (editIdx >= 0) {
      state.accounts[memberId][editIdx] = name;
    } else {
      if (state.accounts[memberId].includes(name)) return showToast('Esa cuenta ya existe');
      state.accounts[memberId].push(name);
    }
    saveAccounts();
    $('accountForm').style.display = 'none';
    renderAccountsPanel();
    updateAccountSelector(state.selectedWho, 'dailyAccount', state.selectedType);
    showToast(editIdx >= 0 ? 'Cuenta actualizada' : 'Cuenta añadida');
  });
}
