/**
 * Panel de cuentas por miembro — lista con íconos efectivo/digital, agregar, editar, eliminar.
 * Si un miembro queda sin cuentas, se recrea "Efectivo" automáticamente.
 */
import { state } from './state.js';
import { $, esc, sanitizeStr, formatCOP, formatCOPShort } from './utils.js';
import { saveAccounts, isCashAccount, updateAccountSelector, getAllAccountsForMember, getAllAccountKeysIncludingShared, isSharedMember } from './members.js';
import { saveData, addTransfer, getAccountBalance } from './data.js';
import { showToast, showPickModal, showConfirmModal } from './ui-modals.js';

/** Renderiza las cuentas de cada miembro con íconos de efectivo/digital y acciones. */
export function renderAccountsPanel() {
  const list = $('accountsList');
  if (!list) return;
  let html = '';
  Object.entries(state.members).forEach(([id, name]) => {
    if (isSharedMember(id)) return;
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
    btn.addEventListener('click', async () => {
      const [memberId, idx] = btn.dataset.delAccount.split(':');
      const accts = state.accounts[memberId] || [];
      const accountName = accts[parseInt(idx)];
      const fullKey = `${memberId}:${accountName}`;
      const moves = state.transactions.filter(tx => tx.account === fullKey);
      if (moves.length > 0) {
        const balance = getAccountBalance(fullKey);
        const options = getAllAccountsForMember()
          .filter(o => `${o.memberId}:${o.account}` !== fullKey)
          .map(o => {
            const key = `${o.memberId}:${o.account}`;
            return { value: key, label: `${o.account} (${o.label}) — ${formatCOPShort(getAccountBalance(key))}` };
          });
        if (options.length === 0) {
          showToast('No puedes eliminar una cuenta con saldo sin otra cuenta de destino');
          return;
        }
        const target = await showPickModal({
          title: 'Migrar cuenta',
          message: `"${accountName}" tiene saldo ${formatCOPShort(balance)}. ¿A qué cuenta migro el saldo?`,
          options
        });
        if (target === null) return;
        state.transactions.forEach(tx => {
          if (tx.account === fullKey) tx.account = target;
        });
        saveData();
      }
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

/** Abre el modal de transferencia con los selects de origen/destino poblados. */
function openTransferModal() {
  const allNonShared = getAllAccountKeysIncludingShared().filter(a => !isSharedMember(a.memberId));
  const withBalance = allNonShared.filter(a => getAccountBalance(`${a.memberId}:${a.account}`) > 0);
  const originAccounts = withBalance.length > 0 ? withBalance : allNonShared;
  const destAccounts = getAllAccountsForMember();
  const makeOption = ({ memberId, label, account }) => {
    const key = `${memberId}:${account}`;
    const bal = getAccountBalance(key);
    return `<option value="${esc(key)}">${esc(account)} (${esc(label)}) — ${formatCOPShort(bal)}</option>`;
  };
  $('transferFrom').innerHTML = originAccounts.map(makeOption).join('');
  $('transferTo').innerHTML = destAccounts.map(makeOption).join('');
  $('transferAmount').value = '';
  $('transferDesc').value = '';
  $('transferModal').classList.add('active');
  $('transferAmount').focus();
}

/** Cierra el modal de transferencia. */
function closeTransferModal() {
  $('transferModal').classList.remove('active');
}

/** Vincula eventos del formulario de agregar/editar cuenta. */
export function setupAccountsPanel() {
  $('transferBtn').addEventListener('click', openTransferModal);
  $('transferCancel').addEventListener('click', closeTransferModal);
  $('transferModal').addEventListener('click', e => { if (e.target === $('transferModal')) closeTransferModal(); });
  $('transferForm').addEventListener('submit', e => {
    e.preventDefault();
    const fromKey = $('transferFrom').value;
    const toKey = $('transferTo').value;
    const amount = parseFloat($('transferAmount').value);
    if (!fromKey || !toKey) return showToast('Selecciona ambas cuentas');
    if (!amount || amount <= 0) return showToast('Ingresa un monto válido');
    const balance = getAccountBalance(fromKey);
    if (balance < amount) {
      const acctName = fromKey.includes(':') ? fromKey.split(':').slice(1).join(':') : fromKey;
      return showToast(`Saldo insuficiente en ${acctName}. Disponible: ${formatCOP(balance)}`);
    }
    const result = addTransfer(fromKey, toKey, amount, $('transferDesc').value);
    if (!result.ok) {
      if (result.reason === 'misma-cuenta') return showToast('La cuenta de origen y destino no pueden ser la misma');
      if (result.reason === 'compartido-no-recibe') return showToast('Compartido no puede recibir transferencias — solo gasta');
      return showToast('Error al transferir');
    }
    closeTransferModal();
    renderAccountsPanel();
    updateAccountSelector(state.selectedWho, 'dailyAccount', state.selectedType);
    showToast('Transferencia realizada');
  });

  $('addAccountBtn').addEventListener('click', () => {
    const sel = $('accountMemberSelect');
    sel.innerHTML = Object.entries(state.members).filter(([id]) => !isSharedMember(id)).map(([id, name]) => `<option value="${id}">${esc(name)}</option>`).join('');
    $('accountNameInput').value = '';
    $('accountEditIdx').value = '-1';
    $('accountForm').style.display = 'block';
    $('accountNameInput').focus();
  });
  $('cancelAccountBtn').addEventListener('click', () => {
    $('accountForm').style.display = 'none';
  });
  $('saveAccountBtn').addEventListener('click', async () => {
    const memberId = $('accountMemberSelect').value;
    const name = sanitizeStr($('accountNameInput').value, 30).trim();
    if (!name) return showToast('Escribe un nombre de cuenta');
    if (name.includes(':')) return showToast('El nombre no puede contener ":"');
    if (isCashAccount(name) && name.toLowerCase() !== 'efectivo') {
      const ok = await showConfirmModal(`"${name}" parece una cuenta de efectivo. ¿Es una cuenta bancaria?`);
      if (!ok) return;
    }
    if (!state.accounts[memberId]) state.accounts[memberId] = [];
    const editIdx = parseInt($('accountEditIdx').value);
    if (editIdx >= 0) {
      const oldName = state.accounts[memberId][editIdx];
      state.accounts[memberId][editIdx] = name;
      if (oldName !== name) {
        const oldKey = `${memberId}:${oldName}`;
        const newKey = `${memberId}:${name}`;
        state.transactions.forEach(tx => {
          if (tx.account === oldKey) tx.account = newKey;
        });
        saveData();
      }
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
