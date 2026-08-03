/**
 * Renderizado del modo diario — saldo total (efectivo/digital + carry), feed
 * agrupado por fecha, categorías/subcategorías en fila horizontal, who-toggle
 * con miembros extra y colores, drag-to-scroll.
 */

import { state } from './state.js';
import { $, esc, formatCOP, formatCOPShort, getToday, parseLocalDate, toLocalDateStr } from './utils.js';
import { MEMBER_COLORS, ANIMATION_STEPS, ANIMATION_INTERVAL_MS, LAST_CAT_KEY } from './config.js';
import { getCatNames, getCatEmoji, getSubCatNames, getSubCatEmoji } from './categories.js';
import { getFilteredTransactions } from './data.js';
import { updateAccountSelector, getWhoLabel, parseAccountValue, isCashAccount } from './members.js';
import { openEditModal } from './ui-modals.js';

function loadLastCategory() {
  try {
    const raw = localStorage.getItem(LAST_CAT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Guarda la última categoría y subcategoría seleccionadas para un tipo. */
export function saveLastCategory(type, cat, subcat) {
  const data = loadLastCategory();
  data[type] = cat;
  if (subcat) data[type + '_sub'] = subcat;
  else delete data[type + '_sub'];
  localStorage.setItem(LAST_CAT_KEY, JSON.stringify(data));
}

/** Renderiza el grid de categorías del tipo seleccionado con restauración opcional. */
export function renderDailyCategories(restore = true) {
  const grid = $('catGrid');
  const cats = getCatNames(state.selectedType);
  if (restore) {
    const lastCats = loadLastCategory();
    const saved = lastCats[state.selectedType];
    if (saved && cats.includes(saved)) {
      state.selectedCategory = saved;
      state.selectedSubcategory = lastCats[state.selectedType + '_sub'] || null;
    }
  }
  grid.innerHTML = cats.map(c => `
    <button class="cat-btn ${state.selectedCategory === c ? 'selected' : ''}" data-cat="${esc(c)}">
      <span class="emoji">${esc(getCatEmoji(state.selectedType, c))}</span>
      <span class="name">${esc(c)}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clicked = btn.dataset.cat;
      const isExpanded = $('subcatGrid').style.display === 'flex';
      if (state.selectedCategory === clicked && isExpanded) {
        state.selectedSubcategory = null;
        $('subcatGrid').style.display = 'none';
        grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        state.selectedCategory = null;
      } else if (state.selectedCategory === clicked && !isExpanded) {
        state.selectedSubcategory = null;
        renderDailySubcategories();
      } else {
        state.selectedCategory = clicked;
        state.selectedSubcategory = null;
        grid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        renderDailySubcategories();
        $('dailyAmount').focus();
      }
    });
  });
  setupCategoryDragScroll(grid);
}

/** Renderiza el grid de subcategorías según categoría y tipo actuales. */
export function renderDailySubcategories() {
  const sg = $('subcatGrid');
  if (!state.selectedCategory) { sg.style.display = 'none'; return; }
  const subs = getSubCatNames(state.selectedType, state.selectedCategory);
  if (!subs.length) { sg.style.display = 'none'; return; }
  sg.style.display = 'flex';
  sg.innerHTML = subs.map(s => `
    <button class="subcat-btn ${state.selectedSubcategory === s ? 'selected' : ''}" data-sub="${esc(s)}">
      <span class="emoji">${esc(getSubCatEmoji(state.selectedType, state.selectedCategory, s))}</span>
      <span class="name">${esc(s)}</span>
    </button>
  `).join('');
  sg.querySelectorAll('.subcat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedSubcategory = btn.dataset.sub;
      sg.querySelectorAll('.subcat-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      $('dailyAmount').focus();
    });
  });
  setupCategoryDragScroll(sg);
}

/** Habilita drag-to-scroll horizontal en un contenedor. */
export function setupCategoryDragScroll(container) {
  if (container.dataset.dragInit) return;
  container.dataset.dragInit = '1';
  let isDown = false, startX, scrollLeft;
  container.addEventListener('mousedown', e => {
    isDown = true;
    startX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
    container.style.cursor = 'grabbing';
  });
  container.addEventListener('mouseleave', () => {
    isDown = false;
    container.style.cursor = '';
  });
  container.addEventListener('mouseup', () => {
    isDown = false;
    container.style.cursor = '';
  });
  container.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - container.offsetLeft;
    const walk = (x - startX) * 1.5;
    container.scrollLeft = scrollLeft - walk;
  });
}

/** Actualiza el estado visual del toggle gasto/ingreso según el tipo seleccionado. */
export function updateTypeToggle() {
  const g = $('dailyTypeGasto');
  const i = $('dailyTypeIngreso');
  g.className = state.selectedType === 'gasto' ? 'active-gasto' : '';
  i.className = state.selectedType === 'ingreso' ? 'active-ingreso' : '';
}

/** Actualiza el toggle de quién con miembros extra y colores dinámicos. */
export function updateWhoToggle() {
  const toggle = $('whoToggle');
  const yo = $('dailyWhoYo');
  const pareja = $('dailyWhoPareja');
  const comp = $('dailyWhoCompartido');
  yo.textContent = state.members.yo || 'Él';
  pareja.textContent = state.members.pareja || 'Ella';
  comp.textContent = state.members.compartido || 'Compartido';
  yo.className = state.selectedWho === 'yo' ? 'active-who-yo' : '';
  pareja.className = state.selectedWho === 'pareja' ? 'active-who-pareja' : '';
  comp.className = state.selectedWho === 'compartido' ? 'active-who-compartido' : '';
  if (state.selectedType === 'ingreso') {
    comp.style.display = 'none';
    if (state.selectedWho === 'compartido') {
      state.selectedWho = 'yo';
      yo.className = 'active-who-yo';
    }
  } else {
    comp.style.display = '';
  }
  const extraMembers = Object.entries(state.members).filter(([id]) => !['yo','pareja','compartido'].includes(id));
  const used = new Set();
  extraMembers.forEach(([id, name]) => {
    let btn = toggle.querySelector(`.who-extra-btn[data-who="${id}"]`);
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'who-extra-btn';
      btn.addEventListener('click', () => {
        state.selectedWho = btn.dataset.who;
        updateWhoToggle();
        updateAccountSelector(btn.dataset.who, 'dailyAccount', state.selectedType);
      });
      toggle.appendChild(btn);
    }
    used.add(btn);
    btn.dataset.who = id;
    btn.textContent = name;
    const col = MEMBER_COLORS[Object.keys(state.members).indexOf(id) % MEMBER_COLORS.length];
    if (state.selectedWho === id) {
      btn.className = 'who-extra-btn active-who-color';
      btn.style.background = col.text;
      btn.style.color = '#fff';
    } else {
      btn.className = 'who-extra-btn';
      btn.style.background = '';
      btn.style.color = '';
    }
  });
  toggle.querySelectorAll('.who-extra-btn').forEach(btn => {
    if (!used.has(btn)) btn.remove();
  });
  toggle.classList.toggle('fill', Object.keys(state.members).length <= 3);
  setupCategoryDragScroll(toggle);
}

/** Renderiza el saldo total del mes desglosado por efectivo/digital y carry. */
export function renderDailyBalance(animate = false) {
  const saldoPorCuenta = {};
  const carryPorCuenta = {};
  state.transactions.forEach(tx => {
    const key = tx.account || 'yo:Efectivo';
    const d = parseLocalDate(tx.date);
    const isPast = d.getFullYear() < state.currentYear || (d.getFullYear() === state.currentYear && d.getMonth() < state.currentMonth);
    const isCurrent = d.getFullYear() === state.currentYear && d.getMonth() === state.currentMonth;
    if (isPast || isCurrent) {
      if (!saldoPorCuenta[key]) saldoPorCuenta[key] = 0;
      saldoPorCuenta[key] += tx.type === 'ingreso' ? tx.amount : -tx.amount;
    }
    if (isPast) {
      if (!carryPorCuenta[key]) carryPorCuenta[key] = 0;
      carryPorCuenta[key] += tx.type === 'ingreso' ? tx.amount : -tx.amount;
    }
  });
  let saldoTotal = 0;
  let totalCash = 0;
  let totalDigital = 0;
  for (const [key, bal] of Object.entries(saldoPorCuenta)) {
    saldoTotal += bal;
    const accountName = key.includes(':') ? key.split(':').slice(1).join(':') : key;
    if (isCashAccount(accountName)) totalCash += bal;
    else totalDigital += bal;
  }
  let carryBalance = 0;
  for (const bal of Object.values(carryPorCuenta)) carryBalance += bal;
  const filtered = getFilteredTransactions(state.currentMonth, state.currentYear);
  const totalIngresos = filtered.filter(tx => tx.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
  const totalGastos = filtered.filter(tx => tx.type === 'gasto').reduce((s, t) => s + t.amount, 0);
  const el = $('dailyBalance');
  $('dailyIngresos').textContent = formatCOP(totalIngresos);
  $('dailyGastos').textContent = formatCOP(totalGastos);
  $('dailyCash').textContent = formatCOP(totalCash);
  $('dailyDigital').textContent = formatCOP(totalDigital);

  const carriedEl = $('balanceCarried');
  if (carryBalance !== 0) {
    const label = carryBalance > 0 ? 'Saldo mes anterior' : 'Deuda mes anterior';
    const cls = carryBalance > 0 ? 'positive' : 'negative';
    carriedEl.innerHTML = `<span class="${cls}">${label}: ${formatCOP(Math.abs(carryBalance))}</span>`;
    carriedEl.style.display = 'block';
  } else {
    carriedEl.style.display = 'none';
  }

  if (animate) {
    const oldText = el.textContent;
    const oldVal = parseInt(oldText.replace(/[^0-9-]/g, '')) || 0;
    const diff = saldoTotal - oldVal;
    const steps = ANIMATION_STEPS;
    let i = 0;
    const interval = setInterval(() => {
      i++;
      const current = oldVal + (diff * i / steps);
      el.textContent = formatCOP(Math.round(current));
      el.style.color = current >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
      if (i >= steps) { clearInterval(interval); el.textContent = formatCOP(saldoTotal); }
    }, ANIMATION_INTERVAL_MS);
  } else {
    el.textContent = formatCOP(saldoTotal);
    el.style.color = saldoTotal >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
  }
}

/** Renderiza el feed de transacciones agrupadas por fecha con totales diarios. */
export function renderDailyFeed() {
  const filtered = getFilteredTransactions(state.currentMonth, state.currentYear)
    .map((tx, i) => ({ tx, i }))
    .sort((a, b) => {
      const dateCmp = b.tx.date.localeCompare(a.tx.date);
      if (dateCmp !== 0) return dateCmp;
      return b.i - a.i;
    })
    .map(({ tx }) => tx);

  const list = $('feedList');
  const empty = $('feedEmpty');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    $('feedTitle').textContent = 'Movimientos';
    return;
  }
  empty.style.display = 'none';

  const grouped = {};
  filtered.forEach(tx => {
    if (!grouped[tx.date]) grouped[tx.date] = [];
    grouped[tx.date].push(tx);
  });

  const t = getToday();
  const todayStr = toLocalDateStr(t);
  const yesterdayStr = toLocalDateStr(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1));

  let html = '';
  Object.entries(grouped).forEach(([date, txs]) => {
    let label;
    if (date === todayStr) label = 'Hoy';
    else if (date === yesterdayStr) label = 'Ayer';
    else {
      const d = parseLocalDate(date);
      label = `${d.getDate()} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]}`;
    }
    const dayIngresos = txs.filter(tx => tx.type === 'ingreso').reduce((s, t) => s + t.amount, 0);
    const dayGastos = txs.filter(tx => tx.type === 'gasto').reduce((s, t) => s + t.amount, 0);
    const dayNet = dayIngresos - dayGastos;
    const dayColor = dayNet >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
    const daySign = dayNet >= 0 ? '+' : '';
    html += `<div class="feed-day-header"><span>${label}</span><span class="feed-day-total" style="color:${dayColor}">${daySign}${formatCOPShort(dayNet)}</span></div>`;
    txs.forEach(tx => {
      const emoji = tx.subcategory ? getSubCatEmoji(tx.type, tx.category, tx.subcategory) : getCatEmoji(tx.type, tx.category);
      const whoLabel = getWhoLabel(tx.who || 'yo');
      const subLabel = tx.subcategory ? ' · ' + esc(tx.subcategory) : '';
      const parsed = parseAccountValue(tx.account || 'yo:Efectivo');
      const acctDisplay = `${esc(parsed.account)} (${getWhoLabel(parsed.who)})`;
      html += `
        <div class="feed-item ${tx.type}">
          <div class="feed-emoji">${esc(emoji)}</div>
          <div class="feed-info">
            <div class="feed-cat">${esc(tx.category)}${subLabel}</div>
            <div class="feed-desc">${esc(tx.description || '—')} · ${esc(whoLabel)} · ${acctDisplay}</div>
          </div>
          <div class="feed-amount ${tx.type === 'ingreso' ? 'positive' : 'negative'}">${tx.type === 'ingreso' ? '+' : '-'}${formatCOPShort(tx.amount)}</div>
          <button class="feed-del-btn" data-edit="${tx.id}" title="Editar" aria-label="Editar transacción">✏️</button>
        </div>
      `;
    });
  });
  list.innerHTML = html;

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      openEditModal(btn.dataset.edit);
    });
  });
}

/** Actualiza balance y feed del modo diario. */
export function refreshDaily(animate = false) {
  renderDailyBalance(animate);
  renderDailyFeed();
}
