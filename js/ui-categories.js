/**
 * Gestor de categorías y subcategorías — CRUD completo con emoji picker, migración de formato, restaurar a defaults.
 * Usa setNotifyRefresh(fn) para notificar refresco (regla 4 de dependencias).
 */
import { state } from './state.js';
import { $, esc, sanitizeStr, renderEmojiPicker } from './utils.js';
import { DEFAULT_CATEGORIES } from './config.js';
import { saveCategories, getCatNames } from './categories.js';
import { saveData } from './data.js';
import { showConfirmModal, showToast, updateCategories } from './ui-modals.js';
import { updateBudgetCategorySelect } from './ui-budgets.js';

let notifyRefreshFn = () => {};
/** Registra callback que se invoca al modificar categorías para notificar refresco. */
export function setNotifyRefresh(fn) { notifyRefreshFn = fn; }

/** Renderiza la lista de categorías con botones de editar/eliminar. */
export function renderCatManager() {
  const list = $('catManagerList');
  let html = '';
  for (const type of ['gasto', 'ingreso']) {
    const cats = state.categoriesData[type] || [];
    cats.forEach((c, i) => {
      html += `
        <div class="cat-manager-item">
          <span class="cm-emoji">${esc(c.emoji)}</span>
          <span class="cm-name">${esc(c.name)}</span>
          <span class="cm-type">${type === 'gasto' ? 'Gasto' : 'Ingreso'}</span>
          <span class="cm-actions">
            <button class="cm-edit" data-type="${type}" data-idx="${i}" title="Editar">✏️</button>
            <button class="cm-del" data-type="${type}" data-idx="${i}" title="Eliminar">✕</button>
          </span>
        </div>
      `;
    });
  }
  list.innerHTML = html || '<div class="empty-msg" style="padding:12px">Sin categorías</div>';

  list.querySelectorAll('.cm-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.dataset.type;
      const idx = parseInt(btn.dataset.idx);
      const cat = state.categoriesData[type][idx];
      if (!cat) return;
      const ok = await showConfirmModal(`¿Eliminar "${cat.name}"? Las transacciones con esta categoría no se modificarán.`);
      if (!ok) return;
      state.categoriesData[type].splice(idx, 1);
      saveCategories();
      renderCatManager();
      notifyRefreshFn();
    });
  });

  list.querySelectorAll('.cm-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const idx = parseInt(btn.dataset.idx);
      const cat = state.categoriesData[type][idx];
      if (!cat) return;
      $('catManagerType').value = type;
      $('catManagerEmoji').value = cat.emoji;
      $('catEmojiDisplay').textContent = cat.emoji;
      $('catManagerName').value = cat.name;
      $('catManagerEditId').value = `${type}:${idx}`;
      $('catManagerForm').style.display = 'block';
      $('emojiPicker').style.display = 'none';
      $('subcatEmojiPicker').style.display = 'none';
      $('catManagerName').focus();
      renderSubcatList(type, idx);
      $('subcatSection').style.display = 'block';
    });
  });
}

/** Renderiza las subcategorías de una categoría con acciones de editar/eliminar. */
export function renderSubcatList(type, idx) {
  const cat = state.categoriesData[type] && state.categoriesData[type][idx];
  const list = $('subcatList');
  if (!cat || !cat.subcats || !cat.subcats.length) {
    list.innerHTML = '<span style="font-size:12px;color:var(--text-muted)">Sin subcategorías</span>';
    return;
  }
  list.innerHTML = cat.subcats.map((s, si) => {
    const subName = typeof s === 'string' ? s : s.name;
    const subEmoji = typeof s === 'string' ? '📋' : (s.emoji || '📋');
    return `
    <span class="subcat-tag">
      <span class="subcat-emoji">${subEmoji}</span>
      <span class="subcat-name">${esc(subName)}</span>
      <button class="subcat-edit-btn" data-type="${type}" data-idx="${idx}" data-sub-idx="${si}" title="Editar">✏️</button>
      <button class="subcat-del" data-type="${type}" data-idx="${idx}" data-sub-idx="${si}" title="Eliminar">×</button>
    </span>`;
  }).join('');
  list.querySelectorAll('.subcat-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.type;
      const i = parseInt(btn.dataset.idx);
      const si = parseInt(btn.dataset.subIdx);
      const c = state.categoriesData[t] && state.categoriesData[t][i];
      if (!c || !c.subcats) return;
      c.subcats.splice(si, 1);
      saveCategories();
      renderSubcatList(t, i);
      clearSubcatEdit();
    });
  });
  list.querySelectorAll('.subcat-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.type;
      const i = parseInt(btn.dataset.idx);
      const si = parseInt(btn.dataset.subIdx);
      const c = state.categoriesData[t] && state.categoriesData[t][i];
      if (!c || !c.subcats || !c.subcats[si]) return;
      const s = c.subcats[si];
      const subName = typeof s === 'string' ? s : s.name;
      const subEmoji = typeof s === 'string' ? '📋' : (s.emoji || '📋');
      $('subcatInput').value = subName;
      $('subcatEmojiDisplay').textContent = subEmoji;
      $('subcatEmojiDisplay').dataset.subcatEmoji = subEmoji;
      $('addSubcatBtn').textContent = '✓';
      $('addSubcatBtn').dataset.editType = t;
      $('addSubcatBtn').dataset.editIdx = String(i);
      $('addSubcatBtn').dataset.editSubIdx = String(si);
      $('cancelSubcatEdit').style.display = '';
      $('subcatInput').focus();
    });
  });
}

/** Resetea el formulario de subcategoría a su estado inicial. */
export function clearSubcatEdit() {
  $('subcatInput').value = '';
  $('subcatEmojiDisplay').textContent = '📋';
  delete $('subcatEmojiDisplay').dataset.subcatEmoji;
  $('subcatEmojiPicker').style.display = 'none';
  $('addSubcatBtn').textContent = '+';
  delete $('addSubcatBtn').dataset.editType;
  delete $('addSubcatBtn').dataset.editIdx;
  delete $('addSubcatBtn').dataset.editSubIdx;
  $('cancelSubcatEdit').style.display = 'none';
}

/** Vincula eventos del gestor: crear, editar, restaurar defaults, emoji pickers y subcategorías. */
export function setupCategoryManager() {
  $('resetCategoriesBtn').addEventListener('click', async () => {
    const ok = await showConfirmModal('¿Restaurar categorías por defecto? Se perderán las personalizadas.');
    if (!ok) return;
    state.categoriesData = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    saveCategories();
    renderCatManager();
    updateCategories();
    updateBudgetCategorySelect();
    notifyRefreshFn();
    showToast('Categorías restauradas');
  });
  $('addCategoryBtn').addEventListener('click', () => {
    $('catManagerForm').style.display = 'block';
    $('catManagerType').value = 'gasto';
    $('catManagerEmoji').value = '📋';
    $('catEmojiDisplay').textContent = '📋';
    $('catManagerName').value = '';
    $('catManagerEditId').value = '';
    $('subcatSection').style.display = 'none';
    $('emojiPicker').style.display = 'none';
    $('subcatEmojiPicker').style.display = 'none';
    $('catManagerName').focus();
  });
  $('catManagerCancel').addEventListener('click', () => {
    $('catManagerForm').style.display = 'none';
    $('subcatSection').style.display = 'none';
    $('emojiPicker').style.display = 'none';
    $('subcatEmojiPicker').style.display = 'none';
  });
  $('addSubcatBtn').addEventListener('click', () => {
    const editId = $('catManagerEditId').value;
    if (!editId) return;
    const [type, idxStr] = editId.split(':');
    const idx = parseInt(idxStr);
    const cat = state.categoriesData[type] && state.categoriesData[type][idx];
    if (!cat) return;
    const name = $('subcatInput').value.trim();
    const emoji = $('subcatEmojiDisplay').textContent || '📋';
    if (!name) return showToast('Escribe un nombre');
    if (!cat.subcats) cat.subcats = [];
    const isEditing = $('addSubcatBtn').dataset.editSubIdx !== undefined;
    if (isEditing) {
      const ei = parseInt($('addSubcatBtn').dataset.editIdx);
      const esi = parseInt($('addSubcatBtn').dataset.editSubIdx);
      if (ei === idx && cat.subcats[esi]) {
        const oldName = typeof cat.subcats[esi] === 'string' ? cat.subcats[esi] : cat.subcats[esi].name;
        if (oldName !== name && cat.subcats.some((s, si) => si !== esi && (typeof s === 'string' ? s : s.name) === name)) {
          return showToast('Ya existe esa subcategoría');
        }
        cat.subcats[esi] = { name, emoji };
        saveCategories();
        renderSubcatList(type, idx);
        clearSubcatEdit();
      }
    } else {
      if (cat.subcats.some(s => (typeof s === 'string' ? s : s.name) === name)) return showToast('Ya existe esa subcategoría');
      cat.subcats.push({ name, emoji });
      saveCategories();
      renderSubcatList(type, idx);
      clearSubcatEdit();
    }
  });
  $('cancelSubcatEdit').addEventListener('click', clearSubcatEdit);
  $('subcatEmojiDisplay').addEventListener('click', () => {
    const picker = $('subcatEmojiPicker');
    if (picker.style.display === 'grid') { picker.style.display = 'none'; return; }
    const current = $('subcatEmojiDisplay').textContent || '📋';
    renderEmojiPicker(current, emoji => {
      $('subcatEmojiDisplay').textContent = emoji;
    }, 'subcatEmojiPicker');
  });
  $('subcatInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('addSubcatBtn').click(); }
    if (e.key === 'Escape' && $('addSubcatBtn').dataset.editSubIdx !== undefined) { clearSubcatEdit(); }
  });
  $('catEmojiDisplay').addEventListener('click', () => {
    const picker = $('emojiPicker');
    if (picker.style.display === 'grid') { picker.style.display = 'none'; return; }
    const current = $('catEmojiDisplay').textContent || '📋';
    renderEmojiPicker(current, emoji => {
      $('catEmojiDisplay').textContent = emoji;
      $('catManagerEmoji').value = emoji;
    }, 'emojiPicker');
  });
  $('catManagerSave').addEventListener('click', async () => {
    const type = $('catManagerType').value;
    const name = sanitizeStr($('catManagerName').value, 50);
    const emoji = sanitizeStr($('catManagerEmoji').value || '📋', 10);
    if (!name) return showToast('Escribe un nombre para la categoría');
    if (!emoji) return showToast('Selecciona un icono');
    const editId = $('catManagerEditId').value;
    if (editId) {
      const [origType, origIdx] = editId.split(':');
      const idx = parseInt(origIdx);
      const oldName = state.categoriesData[origType][idx]?.name;
      if (oldName && oldName !== name) {
        const affected = state.transactions.filter(tx => tx.category === oldName).length;
        if (affected > 0) {
          const ok = await showConfirmModal(`Renombrar "${oldName}" → "${name}" actualizará ${affected} transacciones. ¿Continuar?`);
          if (!ok) return;
        }
      }
      if (origType !== type) {
        const subcats = state.categoriesData[origType][idx]?.subcats || [];
        state.categoriesData[origType].splice(idx, 1);
        state.categoriesData[type].push({ name, emoji, subcats });
      } else {
        state.categoriesData[origType][idx] = { ...state.categoriesData[origType][idx], name, emoji };
      }
      saveCategories();
      if (oldName && oldName !== name) {
        state.transactions.forEach(tx => {
          if (tx.category === oldName) tx.category = name;
        });
        saveData();
      }
    } else {
      if (getCatNames(type).includes(name)) return showToast('Ya existe una categoría con ese nombre');
      state.categoriesData[type].push({ name, emoji, subcats: [] });
      saveCategories();
    }
    $('catManagerForm').style.display = 'none';
    $('subcatSection').style.display = 'none';
    $('emojiPicker').style.display = 'none';
    $('subcatEmojiPicker').style.display = 'none';
    renderCatManager();
    updateCategories();
    updateBudgetCategorySelect();
    notifyRefreshFn();
    showToast(editId ? 'Categoría actualizada' : 'Categoría añadida');
  });
}
