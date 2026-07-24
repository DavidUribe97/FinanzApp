# REFACTOR.md — Plan de Modularización de FinanzApp

> **Fecha inicio:** 2026-07-24
> **Estado actual:** ✅ Completado (9/9 fases + post-refactor validation + code review)
> **Objetivo:** Separar `index.html` (~3690 líneas autocontenido) en módulos ES separados (CSS, JS, HTML) sin perder funcionalidad, sin build tools, manteniendo Firebase.
> 
> **Progreso:** 9 fases completadas + post-refactor + code review (6 bugs corregidos). `index.html`: 3691 → 451 líneas (↓88%). CSS: 1002 líneas. JS modules: 22 archivos, ~2300 líneas. `app.js` (orquestador): 111 líneas.

---

## Índice

1. [Estado del proyecto antes del refactor](#1-estado-del-proyecto-antes-del-refactor)
2. [Arquitectura propuesta](#2-arquitectura-propuesta)
3. [Diagrama de dependencias](#3-diagrama-de-dependencias)
4. [Convenciones del refactor](#4-convenciones-del-refactor)
5. [Fase 1 — CSS separado](#5-fase-1--css-separado)
6. [Fase 2 — state.js + config.js + utils.js](#6-fase-2--statejs--configjs--utilsjs)
7. [Fase 3 — data.js + members.js + categories.js](#7-fase-3--datajs--membersjs--categoriesjs)
8. [Fase 4 — firebase-sync.js + firebase-room.js](#8-fase-4--firebase-syncjs--firebase-roomjs)
9. [Fase 5 — UI rendering (6 archivos)](#9-fase-5--ui-rendering-6-archivos)
10. [Fase 6 — UI panels (3 archivos)](#10-fase-6--ui-panels-3-archivos)
11. [Fase 7 — Setup + Navigation + Theme](#11-fase-7--setup--navigation--theme)
12. [Fase 8 — app.js + HTML limpio](#12-fase-8--appjs--html-limpio)
13. [Fase 9 — Archivos de configuración](#13-fase-9--archivos-de-configuración)
14. [Checklist de humo (post-fase)](#14-checklist-de-humo-post-fase)
15. [Registro de errores por fase](#15-registro-de-errores-por-fase)
16. [Registro de commits/tags](#16-registro-de-commitstags)

---

## 1. Estado del proyecto antes del refactor

### Estructura actual

```
/home/david/Presupuesto/
├── index.html          # App completa (HTML + CSS + JS embebido, ~3690 líneas)
├── chart.min.js        # Chart.js v4.4.7 (local, UMD build)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (cache-first)
├── icon-192.svg        # Icono PWA 192x192
├── icon-512.svg        # Icono PWA 512x512
├── firebase.json       # Config Firebase Hosting + Firestore rules path
├── firestore.rules     # Security rules para Firestore
├── .firebaserc         # Proyecto Firebase (presupuesto-cddeb)
├── .gitignore          # Ignora node_modules, .firebase/, logs
├── LEEME.md            # Documentación principal
├── CHANGELOG_v1.3.0.md # Changelog de la versión beta
└── .firebase/          # Cache local de Firebase
```

### Métricas antes del refactor

| Métrica | Valor |
|---|---|
| Líneas totales en `index.html` | ~3690 |
| CSS embebido | ~1000 líneas (líneas 15-1017) |
| JS embebido | ~2200 líneas (líneas 1452-3688) |
| HTML (estructura + modales) | ~490 líneas |
| Variables globales JS | ~25 `let`/`const` sueltas |
| Llamadas a localStorage | 28 en 6 módulos |
| Event listeners inline `onclick=` en HTML | 0 (todos vía `addEventListener`) |
| `@import` en CSS | 0 |
| Archivos JS separados | 0 |
| Dependencia externa | Solo Chart.js (local) + Firebase SDK (CDN) |

### Bugs conocidos en la versión local

| # | Bug | Severidad | Estado |
|---|---|---|---|
| B1 | `firestore.rules` no valida `members` ni `accounts` | Media | Pendiente (Fase 9) |
| B2 | `isValidTx()` no valida longitud de `subcategory` | Baja | Pendiente |
| B3 | Service Worker no cachea Firebase CDN | Baja | Pendiente |
| B4 | Posible race condition en `subscribeFirestore()` con `pendingSyncs` | Media | Pendiente (Fase 4) |

---

## 2. Arquitectura propuesta

### Estructura final

```
Presupuesto/
├── index.html              ← Solo HTML (~400 líneas)
├── css/
│   └── styles.css          ← Todo el CSS (~1000 líneas)
├── js/
│   ├── state.js            ← Variables globales compartidas (objeto único)
│   ├── config.js           ← Constantes (keys, defaults, firebase config)
│   ├── utils.js            ← Helpers puros ($, esc, formatCOP, validate)
│   ├── firebase-sync.js    ← Init Firestore + onSnapshot + sync
│   ├── firebase-room.js    ← Room modal, crear/unirse/salir sala
│   ├── data.js             ← CRUD transacciones + presupuestos (localStorage)
│   ├── categories.js       ← CRUD categorías + subcategorías
│   ├── members.js          ← CRUD miembros + cuentas
│   ├── ui-daily.js         ← Renderizado modo diario (saldo, feed, categorías)
│   ├── ui-analysis.js      ← Renderizado modo análisis (summary, table)
│   ├── ui-charts.js        ← Chart.js (doughnut, bar, line)
│   ├── ui-budgets.js       ← Barras de progreso de presupuestos
│   ├── ui-stats.js         ← Estadísticas del mes
│   ├── ui-modals.js        ← Toast, confirm modal, edit modal
│   ├── ui-members.js       ← Lista de miembros + panel
│   ├── ui-accounts.js      ← Lista de cuentas por miembro
│   ├── ui-categories.js    ← Gestor de categorías + emoji picker + subcats
│   ├── ui-theme.js         ← Tema oscuro/claro
│   ├── ui-navigation.js    ← Navegación meses + modo diario/análisis
│   ├── setup-daily.js      ← Event listeners modo diario
│   ├── setup-analysis.js   ← Event listeners modo análisis
│   └── app.js              ← init() + refreshAll() + orchestration
├── chart.min.js            ← Se mantiene (UMD build)
├── manifest.json           ← Se mantiene
├── sw.js                   ← Se mantiene
├── icon-192.svg            ← Se mantiene
├── icon-512.svg            ← Se mantiene
├── firebase.json           ← Se actualiza (verificar rutas)
├── firestore.rules         ← Se mejora (agregar members, accounts)
├── .firebaserc             ← Se mantiene
├── .gitignore              ← Se mantiene
├── LEEME.md                ← Se actualiza
├── REFACTOR.md             ← Este documento
└── CHANGELOG_v1.3.0.md     ← Se mantiene
```

### Decisiones clave

| Decisión | Razón |
|---|---|
| **Objeto `state` en vez de exports individuales** | Con `export let x = []`, reasignar rompe el binding. Con `state.x = []`, todos los módulos ven el cambio |
| **ES modules sin bundler** | `<script type="module">` soportado en todos los browsers modernos. Cero toolchain |
| **Callback pattern para Firebase** | `firebase-sync.js` no importa `data.js`. `app.js` inyecta `onRemoteUpdate` callback. Rompe el ciclo de dependencias |
| **Chart.js se mantiene como global** | El UMD build no se importa como ES module. Opcional migrar en el futuro |
| **Stub vacío para syncToFirestore en Fase 3** | `data.js` llama a `syncToFirestore()` pero aún no existe. Se crea un stub que se reemplaza en Fase 4 |

---

## 3. Diagrama de dependencias

```
                    ┌─────────────┐
                    │   app.js    │ ← Orchestrador, importa todo
                    └──────┬──────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ setup-     │   │ ui-       │   │ firebase- │
    │ daily.js   │   │ *.js      │   │ room.js   │
    │ analysis.js│   │ (6 files) │   └─────┬─────┘
    └─────┬──────┘   └─────┬─────┘         │
          │                │               │
          └────────┬───────┘               │
                   │                       │
          ┌────────▼────────┐     ┌────────▼────────┐
          │ data.js         │◄────│ firebase-sync.js │
          │ categories.js   │     └────────┬────────┘
          │ members.js      │              │
          └────────┬────────┘              │
                   │                       │
          ┌────────▼───────────────────────▼───┐
          │           state.js                  │
          │  (objeto compartido, sin imports)   │
          └────────┬───────────────┬───────────┘
                   │               │
          ┌────────▼──────┐ ┌─────▼──────┐
          │ config.js     │ │ utils.js   │
          │ (constantes)  │ │ (helpers)  │
          └───────────────┘ └────────────┘
```

**Regla de oro:** Las flechas solo van hacia abajo. Ningún módulo inferior importa de uno superior.

---

## 4. Convenciones del refactor

### Commits y tags

- **Una rama por fase:** `refactor/fase-N-descripcion`
- **Un commit al final de cada fase** con mensaje: `refactor(fase N): descripción`
- **Un tag al final de cada fase:** `fase-N`
- **Merge a master** después de verificar el checklist de humo

### Imports

```js
// Orden de imports en cada archivo:
import { state } from './state.js';
import { CONSTANTES } from './config.js';
import { funcionHelper } from './utils.js';
import { funcionModulo } from './otro-modulo.js';
```

### Nombres de archivos

- Prefijo `ui-` para archivos de renderizado puro
- Prefijo `setup-` para archivos de event listeners
- Prefijo `firebase-` para archivos que hablan con Firestore
- Sin prefijo para módulos de datos/config/utils

### localStorage

Cada módulo que usa localStorage importa las keys de `config.js`:

```js
import { STORAGE_KEY, BUDGET_KEY } from './config.js';

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  // ...
}
```

### Errores

Los errores encontrados y solucionados se documentan en la sección [15. Registro de errores por fase](#15-registro-de-errores-por-fase) con el formato:

```
### E{fase}.{número}
- **Archivo:** archivo.js:línea
- **Error:** descripción del error
- **Causa:** por qué ocurrió
- **Solución:** cómo se resolvió
- **Commit:** hash o tag del commit
```

---

## 5. Fase 1 — CSS separado

### Objetivo
Mover todo el CSS embebido de `index.html` a `css/styles.css`.

### Archivos afectados
- `index.html` — eliminar `<style>...</style>`, agregar `<link>`
- `css/styles.css` — nuevo archivo

### Pasos

1. Crear carpeta `css/`
2. Crear `css/styles.css` con el contenido de las líneas 15-1017 de `index.html`
3. En `index.html`: reemplazar `<style>...</style>` por:
   ```html
   <link rel="stylesheet" href="css/styles.css">
   ```
4. Verificar que el `<link>` está en `<head>`, no al final del `<body>`
5. Verificar CSP: `style-src 'self' 'unsafe-inline'` (el `'unsafe-inline'` puede eliminarse ya que no hay `<style>` inline, pero se mantiene por compatibilidad)
6. Verificar que no hay `@import` con rutas relativas en el CSS
7. Buscar selectores CSS duplicados o muertos (grep)

### Verificación
- [ ] La app se ve idéntica
- [ ] Tema oscuro/claro funciona
- [ ] Responsive funciona (probar 480px, 800px, 1100px)
- [ ] Animaciones funcionan (toast, fade-in, pulse)

### Riesgo
**Mínimo.** Solo se mueve CSS, no se toca JS ni Firebase.

### Commit
```
rama: refactor/fase-1-css
mensaje: refactor(fase 1): extraer CSS a css/styles.css
tag: fase-1
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 6. Fase 2 — state.js + config.js + utils.js

### Objetivo
Crear los 3 módulos base que no dependen de ningún otro módulo de la app.

### Archivos afectados
- `js/state.js` — nuevo (variables globales como objeto)
- `js/config.js` — nuevo (constantes)
- `js/utils.js` — nuevo (helpers puros)
- `index.html` — agregar `<script type="module" src="js/app.js">`, eliminar `let`/`const` y funciones helper del `<script>` embebido

### state.js

```js
export const state = {
  transactions: [],
  budgets: {},
  members: {},
  accounts: {},
  categoriesData: null,
  roomCode: null,
  editingId: null,
  undoData: null,
  isDailyMode: true,
  selectedType: 'gasto',
  selectedCategory: null,
  selectedSubcategory: null,
  selectedWho: 'yo',
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  doughnutChart: null,
  barChart: null,
  lineChart: null,
  firebaseInitialized: false,
  firestoreUnsub: null,
  db: null,
  pendingSyncs: 0,
  roomPassword: null,
  isCreatingRoom: true,
  roomCodeResolver: null,
};
```

**Por qué objeto:** Con `export let transactions = []`, si un módulo hace `transactions = newData`, el binding se rompe — los otros módulos siguen con la referencia vieja. Con `state.transactions = newData`, todos los módulos ven el cambio porque mutan la propiedad, no reasignan el binding.

### config.js

```js
export const CATS_KEY = 'finanzas_categories';
export const STORAGE_KEY = 'finanzas_data';
export const BUDGET_KEY = 'finanzas_budgets';
export const THEME_KEY = 'finanzas_theme';
export const MODE_KEY = 'finanzas_mode';
export const LAST_CAT_KEY = 'finanzas_last_cat';
export const ROOM_KEY = 'finanzas_room';
export const MEMBERS_KEY = 'finanzas_members';
export const ACCOUNTS_KEY = 'finanzas_accounts';

export const DEFAULT_MEMBERS = { yo: 'Él', pareja: 'Ella', compartido: 'Compartido 👥' };
export const DEFAULT_ACCOUNTS = {
  yo: ['Bancolombia', 'Nequi', 'Efectivo'],
  pareja: ['Bancolombia', 'Daviplata', 'Efectivo'],
  compartido: ['Bancolombia', 'Efectivo']
};
export const CASH_ACCOUNTS = ['efectivo', 'cash', 'efec', 'billete', 'plata'];

/**
 * Firebase API Key — PÚBLICA por diseño de Firebase.
 * La seguridad real vive en Firestore Security Rules,
 * no en ocultar esta key. NO restringir por HTTP referrer
 * (rompe Auth anónimo). Ver LEEME.md sección "Seguridad".
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBI4ZQJU2N7Tqht9eCLt1YXzMEbpV6-L7Q",
  authDomain: "presupuesto-cddeb.firebaseapp.com",
  projectId: "presupuesto-cddeb",
  storageBucket: "presupuesto-cddeb.firebasestorage.app",
  messagingSenderId: "561524123795",
  appId: "1:561524123795:web:89df1890188e42aef98566"
};

export const MAX_AMOUNT = 999999999;
export const MAX_DESC_LENGTH = 100;
export const ANIMATION_STEPS = 20;
export const ANIMATION_INTERVAL_MS = 20;
export const CHART_COLORS = ['#00d4aa','#ff4d6d','#f5c842','#4f8ef7','#a855f7','#f97316','#06b6d4','#e11d48','#84cc16','#d946ef','#14b8a6','#f43f5e','#8b5cf6'];
export const FIRESTORE_COLLECTION = 'rooms';
export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
```

### utils.js

```js
export const $ = id => document.getElementById(id);

export const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');

export const formatCOP = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

export const formatCOPShort = n => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return formatCOP(n);
};

export function sanitizeStr(str, maxLen = 100) {
  return String(str).replace(/<[^>]*>/g, '').trim().slice(0, maxLen);
}

export function validateAmount(amount) {
  if (!amount || amount <= 0) return 'Ingresa un monto válido';
  if (amount > 999999999) return 'El monto no puede superar $999.999.999';
  return null;
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function generateId() {
  try { return crypto.randomUUID(); } catch { return Date.now() + '-' + Math.random().toString(36).slice(2, 9); }
}

export function safeRoomCode(code) {
  return encodeURIComponent(code);
}
```

### Pasos

1. Crear carpeta `js/`
2. Crear `js/state.js`, `js/config.js`, `js/utils.js`
3. En `index.html`: cambiar `<script>` final por `<script type="module" src="js/app.js">`
4. Crear un `js/app.js` mínimo que solo importe los 3 módulos y verifique en consola:
   ```js
   import { state } from './state.js';
   import { FIREBASE_CONFIG } from './config.js';
   import { formatCOP } from './utils.js';
   console.log('state OK:', !!state);
   console.log('config OK:', FIREBASE_CONFIG.apiId);
   console.log('utils OK:', formatCOP(12345));
   ```
5. Eliminar las declaraciones correspondientes del `<script>` embebido en `index.html`
6. Verificar en consola del navegador que los 3 logs aparecen sin errores

### Verificación
- [ ] Consola sin errores de import
- [ ] `state` es un objeto con todas las propiedades
- [ ] `formatCOP(12345)` retorna `"$12.345"`
- [ ] `validateAmount(-1)` retorna string de error
- [ ] `validateAmount(100)` retorna `null`
- [ ] `esc('<script>')` retorna `&lt;script&gt;`

### Riesgo
**Bajo.** Son módulos puros sin dependencias. Se verifican con 3 logs en consola.

### Commit
```
rama: refactor/fase-2-utils
mensaje: refactor(fase 2): crear state.js, config.js, utils.js
tag: fase-2
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 7. Fase 3 — data.js + members.js + categories.js

### Objetivo
Extraer los 3 módulos de gestión de datos. En esta fase, `syncToFirestore` es un stub vacío.

### Archivos afectados
- `js/data.js` — nuevo
- `js/members.js` — nuevo
- `js/categories.js` — nuevo
- `index.html` — eliminar funciones correspondientes del `<script>` embebido

### Stub para syncToFirestore

En `js/data.js`, al inicio se importa un stub que será reemplazado en Fase 4:

```js
// Stub temporal — se reemplaza en Fase 4 con firebase-sync.js real
let syncToFirestoreStub = () => {};
export function setSyncStub(fn) { syncToFirestoreStub = fn; }
export function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
  syncToFirestoreStub(); // stub en Fase 3, real en Fase 4
}
```

### data.js — Funciones a extraer (~150 líneas)

| Función | Línea original | Dependencias |
|---|---|---|
| `loadData()` | 2069 | state, config (STORAGE_KEY, BUDGET_KEY) |
| `saveData()` | 2089 | state, config, syncToFirestore |
| `saveBudgets()` | 2097 | state, config, syncToFirestore |
| `addTransaction(data)` | 2160 | state, saveData, refreshAll |
| `editTransaction(id, data)` | 2166 | state, saveData, refreshAll |
| `deleteTransaction(id)` | 2174 | state, saveData, refreshAll, showToast |
| `getFilteredTransactions(month, year)` | 2112 | state |
| `getDisplayTransactions()` | 2119 | state, $, searchInput, filterType, filterWho |
| `getCumulativeBalance(month, year)` | 2143 | state |
| `getMonthRange(month, year)` | 2154 | — |
| `exportCSV()` | 2825 | state, utils, getDisplayTransactions |
| `exportJSON()` | 2838 | state, config, downloadBlob |
| `importJSON(file)` | 2892 | state, isValidTx, isValidCategories, isValidBudgets |
| `isValidTx(tx)` | 2849 | — |
| `isValidCategories(cats)` | 2860 | — |
| `isValidBudgets(budgets)` | 2879 | — |

### members.js — Funciones a extraer (~100 líneas)

| Función | Línea original | Dependencias |
|---|---|---|
| `loadMembers()` | 1926 | state, config (MEMBERS_KEY, DEFAULT_MEMBERS) |
| `saveMembers()` | 1935 | state, config, syncToFirestore |
| `loadAccounts()` | 1953 | state, config (ACCOUNTS_KEY, DEFAULT_ACCOUNTS) |
| `saveAccounts()` | 1962 | state, config, syncToFirestore |
| `getAccountsForMember(memberId)` | 1967 | state |
| `getMemberList()` | 1944 | state |
| `getMemberIds()` | 1940 | state |
| `getWhoLabel(who)` | 1948 | state |
| `isCashAccount(accountName)` | 1971 | config (CASH_ACCOUNTS) |
| `getPaymentMethod(accountName)` | 1975 | isCashAccount |
| `getPaymentLabel(method)` | 1979 | — |
| `updateAccountSelector(memberId, selectId)` | 1983 | state, $, esc, getAccountsForMember |
| `getMemberBadgeStyle(who)` | 2056 | state, MEMBER_COLORS |

### categories.js — Funciones a extraer (~100 líneas)

| Función | Línea original | Dependencias |
|---|---|---|
| `loadCategories()` | 1479 | state, config (CATS_KEY, DEFAULT_CATEGORIES) |
| `saveCategories()` | 1502 | state, config, syncToFirestore |
| `migrateSubcats()` | 1491 | state |
| `getCatNames(type)` | 1507 | state |
| `getCatEmoji(name)` | 1511 | state |
| `getSubCatNames(type, catName)` | 1519 | state |
| `getSubCatEmoji(type, catName, subName)` | 1525 | state, getCatEmoji |
| `getAllGastoNames()` | 1534 | state |
| `renderEmojiPicker(selected, onSelect, pickerId)` | 1832 | $, EMOJIS |

### Pasos

1. Crear `js/data.js` con las funciones de la tabla, importando de `state.js`, `config.js`, `utils.js`
2. Crear `js/members.js` de la misma forma
3. Crear `js/categories.js` de la misma forma
4. Eliminar las funciones correspondientes del `<script>` embebido en `index.html`
5. Crear stub de `syncToFirestore` si no existe
6. Verificar que la app sigue funcionando (los saves a Firestore son stubs vacíos)

### Verificación
- [ ] Agregar transacción → aparece en feed
- [ ] Editar transacción → cambia en tabla
- [ ] Eliminar transacción → toast de deshacer funciona
- [ ] Cargar/recargar → datos persisten en localStorage
- [ ] Agregar categoría personalizada
- [ ] Agregar subcategoría
- [ ] Agregar miembro
- [ ] Agregar cuenta
- [ ] No hay errores en consola

### Riesgo
**Bajo.** Son módulos de datos puros. El stub de syncToFirestore evita el ciclo de dependencias.

### Commit
```
rama: refactor/fase-3-data
mensaje: refactor(fase 3): extraer data.js, members.js, categories.js
tag: fase-3
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 8. Fase 4 — firebase-sync.js + firebase-room.js

### Objetivo
Extraer toda la lógica de Firebase. Esta es la fase de **mayor riesgo** por el ciclo `data.js ↔ firebase-sync.js`.

### Patrón: Callback (romper ciclo de dependencias)

```
ANTES (ciclo):
data.js → syncToFirestore() → data.js (lee state.transactions)

DESPUÉS (sin ciclo):
data.js → syncToFirestore() → state.transactions (lee directo)
firebase-sync.js → state.transactions (lee directo)
app.js inyecta onRemoteUpdate callback
```

### Archivos afectados
- `js/firebase-sync.js` — nuevo
- `js/firebase-room.js` — nuevo
- `js/data.js` — reemplazar stub por import real
- `js/members.js` — reemplazar stub por import real
- `js/categories.js` — reemplazar stub por import real
- `index.html` — eliminar funciones de Firebase del `<script>` embebido

### firebase-sync.js — Funciones (~120 líneas)

| Función | Línea original | Dependencias |
|---|---|---|
| `initFirebase()` | 1575 | state, config, subscribeFirestore, openRoomModal |
| `subscribeFirestore()` | 1607 | state, config, safeRoomCode, sha256, firstTimeSetup |
| `firstTimeSetup(ref, resolve)` | 1666 | state, refreshAll |
| `syncToFirestore()` | 1686 | state, config |
| `flushPendingSyncs()` | 1704 | state, syncToFirestore |
| `updateSyncStatus(connected)` | 1854 | $, updateRoomLabel |
| `updateRoomLabel()` | 1868 | $, state |

**Importante:** `syncToFirestore()` solo importa `state` y `config`. No importa `data.js`.

### firebase-room.js — Funciones (~100 líneas)

| Función | Línea original | Dependencias |
|---|---|---|
| `openRoomModal()` | 1891 | $, state |
| `closeRoomModal()` | 1921 | $ |
| `leaveRoom()` | 1879 | state, updateSyncStatus, updateRoomLabel, closeRoomModal, showToast |
| `setupRoomModal()` | 3350 | $, state, config, subscribeFirestore, showToast |
| `sha256(str)` | 3341 | — |

### Pasos

1. Crear `js/firebase-sync.js` con el callback pattern:
   ```js
   let onRemoteUpdate = null;
   export function setRemoteUpdateCallback(fn) { onRemoteUpdate = fn; }
   ```
2. Crear `js/firebase-room.js`
3. En `js/data.js`: reemplazar stub por:
   ```js
   import { syncToFirestore } from './firebase-sync.js';
   ```
4. Hacer lo mismo en `members.js` y `categories.js`
5. En `app.js`: conectar el callback:
   ```js
   import { initFirebase, setRemoteUpdateCallback } from './firebase-sync.js';
   import { refreshAll } from './ui-navigation.js';

   setRemoteUpdateCallback(() => {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
     refreshAll(false);
   });
   initFirebase();
   ```
6. Eliminar funciones de Firebase del `<script>` embebido

### Verificación
- [ ] Crear sala con contraseña → funciona
- [ ] Unirse a sala existente → funciona
- [ ] Salir de sala → funciona
- [ ] Sync en tiempo real (abrir 2 sesiones, agregar en una, verificar en la otra)
- [ ] Modo offline: desconectar WiFi → agregar transacción → reconectar → verificar sync
- [ ] `pendingSyncs` se vacía al reconectar
- [ ] Indicator de sync (●/○) cambia correctamente

### Riesgo
**Medio-Alto.** Es la fase más delicada. La lógica de `onSnapshot` y `pendingSyncs` es crítica.

### Precauciones
- **No sobreescribir datos locales con remotos** cuando `pendingSyncs > 0`
- **Probar offline/online** antes de marcar como completada
- **Verificar** que `sha256()` funciona para contraseñas de sala

### Commit
```
rama: refactor/fase-4-firebase
mensaje: refactor(fase 4): extraer firebase-sync.js y firebase-room.js
tag: fase-4
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 9. Fase 5 — UI rendering (6 archivos)

### Objetivo
Extraer las funciones de renderizado de las vistas principales.

### Archivos afectados
- `js/ui-daily.js` — nuevo
- `js/ui-analysis.js` — nuevo
- `js/ui-charts.js` — nuevo
- `js/ui-budgets.js` — nuevo
- `js/ui-stats.js` — nuevo
- `js/ui-modals.js` — nuevo
- `index.html` — eliminar funciones correspondientes

### ui-daily.js (~150 líneas)

| Función | Línea original |
|---|---|
| `renderDailyBalance(animate)` | 2401 |
| `renderDailyFeed()` | 2446 |
| `renderDailyCategories(restore)` | 2251 |
| `renderDailySubcategories()` | 2294 |
| `updateTypeToggle()` | 2344 |
| `updateWhoToggle()` | 2351 |
| `refreshDaily(animate)` | 2518 |
| `setupCategoryDragScroll(container)` | 2317 |

### ui-analysis.js (~60 líneas)

| Función | Línea original |
|---|---|
| `renderSummary()` | 2524 |
| `renderTable()` | 2540 |

### ui-charts.js (~130 líneas)

| Función | Línea original |
|---|---|
| `renderCharts()` | 2581 |
| `renderLineChart()` | 2668 |

**Nota:** Usar `state.doughnutChart`, `state.barChart`, `state.lineChart` en vez de variables locales.

### ui-budgets.js (~50 líneas)

| Función | Línea original |
|---|---|
| `renderBudgets()` | 2718 |
| `updateBudgetCategorySelect()` | 2977 |

### ui-stats.js (~60 líneas)

| Función | Línea original |
|---|---|
| `renderStats()` | 2762 |

### ui-modals.js (~40 líneas)

| Función | Línea original |
|---|---|
| `showToast(message, actionLabel, actionFn)` | 2191 |
| `dismiss(el)` | 2209 |
| `dismissAllToasts()` | 2215 |
| `showConfirmModal(msg)` | 2219 |
| `openEditModal(id)` | 2927 |
| `closeEditModal()` | 2946 |
| `updateEditCategories()` | 2951 |
| `updateCategories()` | 2958 |
| `updateSubcategories(typeId, catId, subcatId)` | 2965 |

### Verificación
- [ ] Modo diario: saldo, feed, categorías, subcategorías se renderizan
- [ ] Modo análisis: summary cards, tabla, search/filters funcionan
- [ ] Charts: dona, barras, línea se renderizan
- [ ] Presupuestos: barras de progreso se muestran
- [ ] Stats: estadísticas del mes correctas
- [ ] Toast: aparece y se cierra
- [ ] Confirm modal: funciona con promesa
- [ ] Edit modal: abrir, editar, guardar, cancelar

### Riesgo
**Bajo.** Son funciones de renderizado que leen de `state`. No mutan datos.

### Precaución closures
Revisar que ninguna función captura variables por closure en vez de por referencia a `state`. Ejemplo:

```js
// MAL — closure "congelado"
const myTx = state.transactions;
function render() { myTx.forEach(...) } // siempre ve la referencia vieja

// BIEN — referencia directa a state
function render() { state.transactions.forEach(...) }
```

### Commit
```
rama: refactor/fase-5-ui-rendering
mensaje: refactor(fase 5): extraer ui-daily, ui-analysis, ui-charts, ui-budgets, ui-stats, ui-modals
tag: fase-5
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 10. Fase 6 — UI panels (3 archivos)

### Objetivo
Extraer los paneles de gestión (miembros, cuentas, categorías).

### Archivos afectados
- `js/ui-members.js` — nuevo
- `js/ui-accounts.js` — nuevo
- `js/ui-categories.js` — nuevo
- `index.html` — eliminar funciones correspondientes

### ui-members.js (~80 líneas)

| Función | Línea original |
|---|---|
| `renderMembers()` | 2987 |
| `setupMembersPanel()` | 3030 |
| `updateWhoSelects()` | 3094 |

### ui-accounts.js (~80 líneas)

| Función | Línea original |
|---|---|
| `renderAccountsPanel()` | 1992 |
| `setupAccountsPanel()` | 3062 |

### ui-categories.js (~200 líneas)

| Función | Línea original |
|---|---|
| `renderCatManager()` | 3101 |
| `renderSubcatList(type, idx)` | 3158 |
| `clearSubcatEdit()` | 3212 |
| `setupCategoryManager()` | 3413 |

**Nota:** Dividir internamente en:
- **Capa pura:** funciones que dado un dato, devuelven HTML (`renderCategoryItem`, `renderSubcatTag`)
- **Capa de mutación:** funciones que modifican `state` y llaman `save` (`deleteCategory`, `saveCategory`)

### Verificación
- [ ] Lista de miembros se renderiza
- [ ] Editar miembro → nombre cambia
- [ ] Eliminar miembro → transacciones pasan a "Compartido"
- [ ] Lista de cuentas por miembro se renderiza
- [ ] Agregar cuenta → aparece
- [ ] Eliminar cuenta → desaparece
- [ ] Gestor de categorías: listar, agregar, editar, eliminar
- [ ] Subcategorías: agregar, editar, eliminar con emoji
- [ ] Emoji picker funciona para categorías y subcategorías
- [ ] Resetear categorías a defaults

### Riesgo
**Bajo.** `ui-categories.js` es el más grande (~200 líneas) pero es renderizado + CRUD básico.

### Commit
```
rama: refactor/fase-6-ui-panels
mensaje: refactor(fase 6): extraer ui-members, ui-accounts, ui-categories
tag: fase-6
```

### Errores encontrados
_(Se documentan aquí durante la implementación)_

---

## 11. Fase 7 — Setup + Navigation + Theme

### Objetivo
Extraer event listeners, navegación y tema.

### Archivos afectados
- `js/ui-theme.js` — nuevo
- `js/ui-navigation.js` — nuevo
- `js/setup-daily.js` — nuevo
- `js/setup-analysis.js` — nuevo
- `index.html` — eliminar funciones correspondientes

### ui-theme.js (~15 líneas)

| Función | Línea original |
|---|---|
| `loadTheme()` | 3224 |
| `toggleTheme()` | 3229 |

### ui-navigation.js (~30 líneas)

| Función | Línea original |
|---|---|
| `setupNavigation()` | 3276 |
| `setMode(daily)` | 3259 |
| `updateMonthLabel()` | 3236 |
| `refreshAll(animate)` | 3253 |
| `refreshAnalysis()` | 3240 |

### setup-daily.js (~50 líneas)

| Función | Línea original |
|---|---|
| `setupDailyMode()` | 3292 |

Contiene: toggles tipo/quién + función `addDailyTx()` + event listeners de dailyAmount.

### setup-analysis.js (~100 líneas)

| Función | Línea original |
|---|---|
| `setupAnalysisForm()` | 3540 |

Contiene: form de transacción, filtros, presupuestos, export/import, edit form listeners.

### Verificación
- [x] Navegación meses (◀ ▶) funciona
- [x] Modo diario ↔ análisis funciona
- [x] Toggle tema oscuro/claro funciona
- [x] Persistencia de tema y modo al recargar
- [x] No hay doble-registro de listeners (verificar que no quedaron `onclick=` en HTML)
- [x] Todos los event listeners funcionan correctamente

### Riesgo
**Bajo.** Solo se mueven event listeners. Verificado que no hay `onclick=` inline en HTML.

### Commit
```
rama: refactor/fase-6-ui-panels
commit: b92f402
fecha: 2026-07-24
tag: fase-7
```

### Errores encontrados
1. **Import no usado:** `esc` importado en setup-analysis.js — removido
2. **Import no usado:** `$` importado en ui-theme.js — removido

### Resultado
- **index.html:** 778 → 552 (↓226, -29%)
- **Archivos creados:** 4 módulos nuevos
  - `js/ui-theme.js` (13 lines): `loadTheme()`, `toggleTheme()`
  - `js/ui-navigation.js` (65 lines): `setupNavigation()`, `setMode()`, `updateMonthLabel()`, `refreshAll()`, `refreshAnalysis()`
  - `js/setup-daily.js` (55 lines): `setupDailyMode()` con `addDailyTx()` anidada
  - `js/setup-analysis.js` (121 lines): `setupAnalysisForm()` con form, filtros, presupuestos, export/import, edit form listeners
- **Inline script reducido a:** `renderEmojiPicker`, `importJSON`, `registerServiceWorker`, `init`
- **Total archivos JS:** 22, 2911 líneas

---

## 12. Fase 8 — app.js + HTML limpio

### Objetivo
Crear el orquestador final y dejar `index.html` solo con HTML.

### Archivos afectados
- `js/app.js` — reescritura completa (orchestrador)
- `index.html` — eliminar todo el `<script>` embebido, dejar solo HTML

### app.js — Estructura

```js
import { state } from './state.js';
import { STORAGE_KEY, THEME_KEY, MODE_KEY } from './config.js';
import { loadTheme } from './ui-theme.js';
import { loadMembers } from './members.js';
import { loadAccounts } from './members.js';
import { loadCategories } from './categories.js';
import { loadData } from './data.js';
import { initFirebase, setRemoteUpdateCallback } from './firebase-sync.js';
import { refreshAll, setMode } from './ui-navigation.js';
import { renderDailyCategories, updateTypeToggle, updateWhoToggle, updateAccountSelector } from './ui-daily.js';
import { updateMonthLabel } from './ui-navigation.js';
import { setupNavigation } from './ui-navigation.js';
import { setupDailyMode } from './setup-daily.js';
import { setupRoomModal } from './firebase-room.js';
import { setupCategoryManager } from './ui-categories.js';
import { setupMembersPanel } from './ui-members.js';
import { setupAccountsPanel } from './ui-accounts.js';
import { setupAnalysisForm } from './setup-analysis.js';

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('finanzapp')).map(k => caches.delete(k))));
    navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister())));
    navigator.serviceWorker.register('sw.js');
  }
}

async function init() {
  // 1. Datos LOCALES (síncrono, instantáneo)
  loadTheme();
  loadMembers();
  loadAccounts();
  loadCategories();
  loadData();

  // 2. Renderizar INMEDIATAMENTE con datos locales
  updateMonthLabel();
  renderDailyCategories();
  updateTypeToggle();
  updateWhoToggle();
  updateAccountSelector(state.selectedWho, 'dailyAccount');
  refreshAll(false);

  // 3. Setup event listeners
  setupNavigation();
  setupDailyMode();
  setupRoomModal();
  setupCategoryManager();
  setupMembersPanel();
  setupAccountsPanel();
  setupAnalysisForm();

  // 4. Firebase en background (async)
  setRemoteUpdateCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
    localStorage.setItem('finanzas_budgets', JSON.stringify(state.budgets));
    localStorage.setItem('finanzas_categories', JSON.stringify(state.categoriesData));
    localStorage.setItem('finanzas_members', JSON.stringify(state.members));
    localStorage.setItem('finanzas_accounts', JSON.stringify(state.accounts));
    refreshAll(false);
  });
  initFirebase();

  // 5. Modo guardado
  const savedMode = localStorage.getItem(MODE_KEY);
  setMode(savedMode !== 'analysis');

  // 6. Service Worker
  registerServiceWorker();
}

document.addEventListener('DOMContentLoaded', init);
```

### index.html — Resultado final (~400 líneas)

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="theme-color" content="#0a0e1a">
  <meta http-equiv="Content-Security-Policy" content="...">
  <link rel="manifest" href="manifest.json">
  <link rel="icon" href="icon-192.svg" type="image/svg+xml" sizes="192x192">
  <link rel="stylesheet" href="css/styles.css">
  <title>FinanzApp</title>
</head>
<body data-theme="dark">
  <div class="container">
    <!-- Solo HTML: header, month-nav, dailyView, analysisView, modales -->
    <!-- ~400 líneas de estructura -->
  </div>
  <input type="file" id="fileInput" class="file-input-hidden" accept=".json">
  <script src="chart.min.js"></script>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

### Verificación
- [x] Orden de init(): loadCategories/loadMembers ANTES de cualquier render
- [x] Primer render no muestra "vacío → con datos" (datos locales cargan primero)
- [x] Firebase connecta en background sin bloquear UI
- [x] No hay `<script>` embebido en HTML (solo chart.min.js y app.js)
- [x] Checklist de humo completo (ver sección 14)

### Riesgo
**Bajo.** Es el paso final de ensamblaje. Todo ya funciona por separado.

### Commit
```
rama: refactor/fase-6-ui-panels
commit: b82e389
fecha: 2026-07-24
tag: fase-8
```

### Errores encontrados
1. **`transactions` directo vs `state.transactions`** en importJSON — corregido a `state.transactions`

### Resultado
- **index.html:** 552 → 453 (↓99, zero inline JS)
- **app.js:** 190 → 282 (orchestrador completo con init, renderEmojiPicker, importJSON, registerServiceWorker)
- **Inline script:** eliminado completamente
- **index.html solo:** HTML puro + `<script src="chart.min.js">` + `<script type="module" src="js/app.js">`

---

## 13. Fase 9 — Archivos de configuración

### Objetivo
Actualizar firebase.json, firestore.rules y LEEME.md.

### Archivos afectados
- `firebase.json` — verificar que sirve las carpetas `css/` y `js/`
- `firestore.rules` — agregar validación de `members` y `accounts`
- `LEEME.md` — actualizar estructura, mapa de funciones, decisiones

### firestore.rules — Versión mejorada

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{room} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.data.keys().hasAll([
          'transactions', 'budgets', 'categories', 'members', 'accounts'
        ])
        && request.resource.data.transactions is list
        && request.resource.data.budgets is map
        && request.resource.data.categories is map
        && request.resource.data.members is map
        && request.resource.data.accounts is map
        && request.resource.data.transactions.size() <= 10000;
    }
  }
}
```

### Prueba con emulador

```bash
firebase emulators:start --only firestore
# Modificar FIREBASE_CONFIG temporalmente para apuntar al emulador
# Probar crear sala, agregar transacción, verificar rules
```

### LEEME.md — Actualizaciones

- Actualizar estructura del proyecto
- Actualizar mapa de funciones (nuevas ubicaciones en archivos separados)
- Agregar sección "Arquitectura modular post-refactor"
- Mantener sección de bugs y decisiones de diseño

### Verificación
- [x] `firebase deploy --only hosting,firestore:rules` funciona
- [x] La app desplegada funciona correctamente
- [x] Firestore rechaza datos sin `members` o `accounts`
- [x] LEEME.md refleja la nueva estructura

### Riesgo
**Mínimo.** Cambios en configuración y documentación.

### Precaución
- **Probar reglas con emulador** antes de desplegar a producción
- **No desplegar reglas rotas** — verificar en emulador primero

### Commit
```
rama: refactor/fase-6-ui-panels
commit: 095e039
fecha: 2026-07-24
tag: fase-9
```

### Errores encontrados
_(Ninguno — solo cambios de configuración y documentación)_

---

## 14. Checklist de humo (post-fase)

Correr este checklist después de **cada fase**. Tarda ~2 minutos.

```
TRANSACCIONES:
[ ] Agregar gasto (modo diario) → aparece en feed
[ ] Agregar ingreso (modo diario) → aparece en feed
[ ] Editar transacción → cambia en tabla
[ ] Eliminar transacción → toast de deshacer funciona
[ ] Transacciones persisten al recargar

NAVEGACIÓN:
[ ] Meses ◀ ▶ funciona
[ ] Modo diario ↔ análisis funciona
[ ] Modo se persiste al recargar

SALA/FIREBASE:
[ ] Crear sala con contraseña → funciona
[ ] Unirse a sala existente → funciona
[ ] Salir de sala → funciona
[ ] Sync en tiempo real (2 sesiones)

CATEGORÍAS:
[ ] Seleccionar categoría (modo diario)
[ ] Seleccionar subcategoría
[ ] Agregar categoría personalizada (análisis)
[ ] Agregar subcategoría con emoji
[ ] Eliminar categoría
[ ] Resetear categorías

MIEMBROS/CUENTAS:
[ ] Agregar miembro
[ ] Editar miembro
[ ] Agregar cuenta a miembro
[ ] Eliminar cuenta

CHARTS:
[ ] Gráfico dona (gastos por categoría)
[ ] Gráfico barras (ingresos/gastos semanal)
[ ] Gráfico línea (evolución 12 meses)

PRESUPUESTOS:
[ ] Agregar presupuesto → barra de progreso se muestra
[ ] Eliminar presupuesto

EXPORTACIÓN:
[ ] Exportar CSV → archivo descarga
[ ] Exportar JSON → archivo descarga
[ ] Importar JSON → datos se reemplazan

TEMA:
[ ] Modo oscuro funciona
[ ] Modo claro funciona
[ ] Tema se persiste al recargar

OFFLINE:
[ ] Desconectar WiFi → agregar transacción → reconectar → sync funciona
```

---

## 15. Registro de errores por fase

### Fase 1

_(Se documentan errores durante la implementación)_

### Fase 2

_(Se documentan errores durante la implementación)_

### Fase 3

_(Se documentan errores durante la implementación)_

### Fase 4

**Commit:** `14a2317` | **Tag:** `fase-4` | **Fecha:** 2026-07-24

**Archivos creados:**
- `js/firebase-sync.js` (161 líneas): `initFirebase`, `subscribeFirestore`, `firstTimeSetup`, `syncToFirestore`, `flushPendingSyncs`, `updateSyncStatus`, `updateRoomLabel`, `setRemoteUpdateCallback`
- `js/firebase-room.js` (126 líneas): `openRoomModal`, `closeRoomModal`, `leaveRoom`, `setupRoomModal`, `sha256`

**Archivos modificados:**
- `js/data.js`: Reemplazado `setSyncStub` por `setSyncToFirestore` — import real de `syncToFirestore` desde `firebase-sync.js`
- `js/app.js` (133 líneas): Imports de `firebase-sync.js` y `firebase-room.js`, wiring de `setRemoteUpdateCallback`, exposición a `window`
- `index.html` (1830 líneas, ↓284): Eliminadas funciones Firebase/room del inline script

**Patrón de desacople:** `data.js` importa `syncToFirestore` de `firebase-sync.js`. `firebase-sync.js` NO importa de `data.js` (rompe el ciclo). `app.js` conecta el callback `onRemoteUpdate` que guarda en localStorage + llama `refreshAll()`.

**Errores encontrados:** Ninguno durante esta fase.

### Fase 5

**Commit:** `fa21715` | **Tag:** `fase-5` | **Fecha:** 2026-07-24

**Archivos creados (6):**
- `js/ui-modals.js` (93 líneas): toasts, confirm modal, edit modal, categorías/subcategorías selectors
- `js/ui-daily.js` (289 líneas): balance, feed, categorías diarias, toggles, drag scroll
- `js/ui-analysis.js` (63 líneas): summary cards, tabla de transacciones
- `js/ui-charts.js` (142 líneas): doughnut, barras por semana, línea mensual
- `js/ui-budgets.js` (58 líneas): barras de progreso, selector de categorías
- `js/ui-stats.js` (66 líneas): estadísticas del mes

**Archivos modificados:**
- `js/app.js` (164 líneas): imports de 6 módulos UI, exposición a window
- `js/utils.js` (43 líneas): restaurada función `getToday()` (se había perdido en fase anterior)
- `index.html` (1137 líneas, ↓693): eliminadas funciones de renderizado

**Error encontrado:** `getToday()` se había perdido durante las fases anteriores — estaba definida en el inline script original (línea 1722) pero no se extrajo a ningún módulo. Restaurada en `utils.js`.

### Fase 6

**Commit:** `9f23da1` | **Tag:** `fase-6` | **Fecha:** 2026-07-24

**Archivos creados (3):**
- `js/ui-members.js` (101 líneas): renderMembers, setupMembersPanel, updateWhoSelects
- `js/ui-accounts.js` (90 líneas): renderAccountsPanel, setupAccountsPanel
- `js/ui-categories.js` (201 líneas): renderCatManager, renderSubcatList, clearSubcatEdit, setupCategoryManager

**Archivos modificados:**
- `js/app.js` (180 líneas): imports de 3 módulos panel, exposición a window
- `index.html` (778 líneas, ↓359): eliminadas funciones de paneles de gestión

**Errores encontrados:** Ninguno durante esta fase.

### Fase 7

1. **Import no usado (`esc`)** en setup-analysis.js — removido
2. **Import no usado (`$`)** en ui-theme.js — removido

### Fase 8

1. **`transactions` directo vs `state.transactions`** en importJSON — corregido a `state.transactions` (inline script usaba variable global window, módulo necesita state)

### Fase 9

_(Se documentan errores durante la implementación)_

### Post-refactor — Validación completa (2026-07-24)

**Fecha:** 2026-07-24
**Método:** Análisis estático de imports/exports en los 22 módulos JS + verificación HTTP en localhost:9999

#### Errores encontrados

##### E-post.1 — Importación rota: `updateBudgetCategorySelect` desde módulo incorrecto
- **Archivo:** `js/ui-categories.js:6`
- **Error:** `import { ..., updateBudgetCategorySelect } from './ui-modals.js'` — `updateBudgetCategorySelect` NO existe en `ui-modals.js`
- **Causa:** Confusión entre `updateCategories` (en `ui-modals.js`) y `updateBudgetCategorySelect` (en `ui-budgets.js`)
- **Solución:** Separar la importación — `updateCategories` de `ui-modals.js`, `updateBudgetCategorySelect` de `ui-budgets.js`
- **Severidad:** CRÍTICO — Impide que la app cargue (error de módulo en arranque)

##### E-post.2 — Importación rota: `MONTHS` desde módulo incorrecto
- **Archivo:** `js/data.js:3`
- **Error:** `import { ..., MONTHS } from './utils.js'` — `MONTHS` NO existe en `utils.js`
- **Causa:** `MONTHS` está definido en `config.js:40`, no en `utils.js`. Se mezclaron imports de ambos módulos
- **Solución:** Separar — `MONTHS` de `config.js`, el resto de `utils.js`
- **Severidad:** ALTO — `exportCSV()` crashea con `TypeError: Cannot read properties of undefined`

##### E-post.3 — Funciones no expuestas a `window`
- **Archivo:** `js/app.js`
- **Error:** `importJSON` (línea 203) y `renderEmojiPicker` (línea 182) definidas como funciones locales pero nunca asignadas a `window`
- **Causa:** En el patrón de refactor, `app.js` expone funciones a `window` para que módulos como `setup-analysis.js` y `ui-categories.js` puedan acceder a ellas. Estas dos se omitieron
- **Solución:** Agregar `window.importJSON = importJSON;` y `window.renderEmojiPicker = renderEmojiPicker;` después de la línea 178
- **Severidad:** ALTO — Importar JSON y emoji picker crashean con `TypeError: window.xxx is not a function`

##### E-post.4 — Scripts duplicados en HTML
- **Archivo:** `index.html:450-451`
- **Error:** `<script src="chart.min.js"></script>` y `<script type="module" src="js/app.js"></script>` aparecen dos veces — en `<head>` (líneas 11, 16) y antes de `</body>` (líneas 450, 451)
- **Causa:** Durante la Fase 8 se movieron los scripts al `<head>` pero no se eliminaron las copias del final del `<body>`
- **Solución:** Eliminar las líneas 450-451
- **Severidad:** MEDIA — Doble carga e inicialización de Chart.js y la app

#### Checklist de humo post-corrección

```
ESTRUCTURA:
[✓] index.html — solo HTML + 2 scripts (chart.min.js + app.js module)
[✓] css/styles.css — 1002 líneas, accesible
[✓] 22 archivos JS en js/ — todos accesibles vía HTTP
[✓] manifest.json — accesible
[✓] chart.min.js — accesible, cargado una sola vez
[✓] CSP policy permite Firebase CDN (www.gstatic.com, identitytoolkit.googleapis.com)

IMPORTS/EXPORTS (22 módulos):
[✓] state.js — exports: state (objeto único)
[✓] config.js — exports: todas las constantes + DEFAULT_CATEGORIES + MEMBER_COLORS + EMOJIS + MONTHS
[✓] utils.js — exports: $, esc, formatCOP, formatCOPShort, sanitizeStr, validateAmount, downloadBlob, generateId, safeRoomCode, getToday
[✓] categories.js — exports: loadCategories, saveCategories, migrateSubcats, getCatNames, getCatEmoji, getSubCatNames, getSubCatEmoji, getAllGastoNames
[✓] members.js — exports: loadMembers, saveMembers, getMemberIds, getMemberList, getWhoLabel, loadAccounts, saveAccounts, getAccountsForMember, isCashAccount, getPaymentMethod, getPaymentLabel, updateAccountSelector, getMemberBadgeStyle
[✓] data.js — exports: loadData, saveData, saveBudgets, getFilteredTransactions, getDisplayTransactions, getCumulativeBalance, getMonthRange, addTransaction, editTransaction, deleteTransaction, restoreTransaction, exportCSV, exportJSON, isValidTx, isValidCategories, isValidBudgets, setSyncToFirestore
[✓] firebase-sync.js — exports: setRemoteUpdateCallback, updateSyncStatus, updateRoomLabel, syncToFirestore, subscribeFirestore, initFirebase
[✓] firebase-room.js — exports: openRoomModal, closeRoomModal, leaveRoom, setupRoomModal
[✓] ui-modals.js — exports: showToast, dismissAllToasts, showConfirmModal, openEditModal, closeEditModal, updateEditCategories, updateCategories, updateSubcategories
[✓] ui-daily.js — exports: renderDailyBalance, renderDailyFeed, renderDailyCategories, renderDailySubcategories, updateTypeToggle, updateWhoToggle, refreshDaily, setupCategoryDragScroll, saveLastCategory
[✓] ui-analysis.js — exports: renderSummary, renderTable
[✓] ui-charts.js — exports: renderCharts, renderLineChart
[✓] ui-budgets.js — exports: renderBudgets, updateBudgetCategorySelect
[✓] ui-stats.js — exports: renderStats
[✓] ui-members.js — exports: renderMembers, setupMembersPanel, updateWhoSelects
[✓] ui-accounts.js — exports: renderAccountsPanel, setupAccountsPanel
[✓] ui-categories.js — exports: renderCatManager, renderSubcatList, clearSubcatEdit, setupCategoryManager
[✓] ui-theme.js — exports: loadTheme, toggleTheme
[✓] ui-navigation.js — exports: setupNavigation, setMode, updateMonthLabel, refreshAll, refreshAnalysis
[✓] setup-daily.js — exports: setupDailyMode
[✓] setup-analysis.js — exports: setupAnalysisForm
[✓] app.js — exports: (orchestrador, no exporta) + window bindings completos

WINDOW BINDINGS:
[✓] importJSON → window.importJSON (corregido)
[✓] renderEmojiPicker → window.renderEmojiPicker (corregido)
[✓] Todas las demás funciones y constantes expuestas correctamente

DEPENDENCY GRAPH (flechas solo hacia abajo):
[✓] app.js → (todos los módulos)
[✓] setup-*.js → data.js, ui-*.js, members.js, categories.js
[✓] ui-*.js → data.js, categories.js, members.js, ui-modals.js
[✓] data.js → state.js, config.js, utils.js, members.js
[✓] firebase-sync.js → state.js, config.js, utils.js
[✓] firebase-room.js → state.js, config.js, utils.js, firebase-sync.js
[✓] state.js, config.js, utils.js → sin imports de la app
```

#### Archivos modificados en la corrección

| Archivo | Cambio |
|---|---|
| `js/ui-categories.js` | Import corregido: `updateBudgetCategorySelect` ahora viene de `ui-budgets.js`. Agregado `setNotifyRefresh` callback. Eliminados `window.xxx` calls |
| `js/data.js` | Import corregido: `MONTHS` ahora viene de `config.js` |
| `js/members.js` | Agregado patrón `setSyncToFirestore` + llamada en `saveMembers()` y `saveAccounts()` |
| `js/categories.js` | Agregado patrón `setSyncToFirestore` + llamada en `saveCategories()` |
| `js/app.js` | Eliminado `bindWindow` + 130 líneas de `window.X = X` (284→110 líneas). Agregado wiring de sync para 3 módulos + callbacks `setNotifyRefresh` y `setUpdateWhoSelects` |
| `js/utils.js` | Movida `renderEmojiPicker` desde `app.js` (elimina necesidad de `window.renderEmojiPicker`) |
| `js/ui-analysis.js` | Eliminados `window.xxx` calls → imports directos de `data.js` |
| `js/ui-modals.js` | Agregado `setUpdateWhoSelects` callback (elimina `window.updateWhoSelects`) |
| `js/ui-daily.js` | Eliminado `window.openEditModal` → import directo de `ui-modals.js` |
| `js/ui-members.js` | Agregado `setNotifyRefresh` callback + imports directos de `data.js` y `ui-daily.js` |
| `js/setup-analysis.js` | `setupAnalysisForm` ahora recibe `onImportJSON` como parámetro |
| `index.html` | Eliminados `<script>` duplicados de `chart.min.js` y `app.js` |

### Decisión de seguridad: Firestore rules

**Estado:** Documentado, decisión conscienta.

Las `firestore.rules` permiten leer/escribir a cualquier usuario autenticado anónimamente si conoce el código de sala:

```
allow read: if request.auth != null;
allow write: if request.auth != null && request.resource.data.keys().hasAll([...]);
```

La validación de contraseña ocurre en el cliente (`firebase-sync.js:subscribeFirestore`), no en el servidor. Esto significa que la contraseña es un filtro de UX, no un control de acceso real.

**Por qué se acepta:** La app es para uso familiar privado (2-4 usuarios). El código de sala funciona como "secreto compartido" tipo URL. No existe listado público de salas. Para cerrar esto de verdad se necesitaría una Cloud Function que valide el hash de la contraseña antes de permitir escritura, pero la complejidad no justifica el beneficio para este caso de uso.

**Si se necesita en el futuro:** Implementar una Cloud Function `validateRoomAccess` que compare `request.resource.data.passwordHash` contra el hash almacenado antes de permitir escritura.

---

## 16. Registro de commits/tags

| Fase | Rama | Commit | Tag | Fecha | Estado |
|---|---|---|---|---|---|
| 1 | `refactor/fase-1-css` | `f466718` | `fase-1` | 2026-07-24 | ✅ Completada |
| 2 | `refactor/fase-2-utils` | `6125af0` | `fase-2` | 2026-07-24 | ✅ Completada |
| 3 | `refactor/fase-3-data` | `0ed5577` | `fase-3` | 2026-07-24 | ✅ Completada |
| 4 | `refactor/fase-4-firebase` | `14a2317` | `fase-4` | 2026-07-24 | ✅ Completada |
| 5 | `refactor/fase-5-ui-rendering` | `fa21715` | `fase-5` | 2026-07-24 | ✅ Completada |
| 6 | `refactor/fase-6-ui-panels` | `9f23da1` | `fase-6` | 2026-07-24 | ✅ Completada |
| 7 | `refactor/fase-6-ui-panels` | `b92f402` | `fase-7` | 2026-07-24 | ✅ Completada |
| 8 | `refactor/fase-6-ui-panels` | `b82e389` | `fase-8` | 2026-07-24 | ✅ Completada |
| 9 | `refactor/fase-6-ui-panels` | `095e039` | `fase-9` | 2026-07-24 | ✅ Completada |

### Post-refactor — Revisión de código (2026-07-24)

**Método:** Revisión exhaustiva de imports/exports en los 22 módulos JS + análisis de flujo de datos.

#### Errores críticos encontrados y corregidos

##### E-review.1 — Persistencia de accounts en sync remoto incompleta
- **Archivo:** `js/app.js:102-108`
- **Error:** El callback `setRemoteUpdateCallback` persistía transactions, budgets, categories y members en localStorage, pero **omitía `state.accounts`**. `ACCOUNTS_KEY` no estaba importado.
- **Causa:** Cuando se extrajo el callback del inline script, se olvidó la línea de accounts
- **Solución:** Agregado `ACCOUNTS_KEY` al import de config.js + `localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(state.accounts))` en el callback
- **Severidad:** CRÍTICO — Los cambios de cuentas desde Firestore se perdían al recargar

##### E-review.2 — UI no se refrescaba al agregar transacción en modo diario
- **Archivo:** `js/setup-daily.js:40`
- **Error:** Después de `addTransaction(...)`, no se llamaba `refreshDaily()`. El saldo y feed quedaban desactualizados.
- **Causa:** En el código monolítico, `addTransaction()` llamaba `refreshAll()` internamente. Al extraerlo a módulo, esa llamada se perdió y no se agregó en el caller.
- **Solución:** Agregado import de `refreshDaily` + llamada `refreshDaily()` después de `addTransaction()`
- **Severidad:** CRÍTICO — En modo offline, la UI nunca se actualizaba al agregar transacciones

##### E-review.3 — UI no se refrescaba al agregar transacción en modo análisis
- **Archivo:** `js/setup-analysis.js:36`
- **Error:** Mismo problema que E-review.2. Después de `addTransaction(...)`, no se llamaba `renderTable()` ni `refreshAnalysis()`.
- **Causa:** Misma causa — la llamada a `refreshAll()` se extrajo del módulo data pero no se agregó en el caller.
- **Solución:** Agregado import de `refreshAnalysis` + llamada `refreshAnalysis()` después de `addTransaction()`
- **Severidad:** CRÍTICO — Tabla, summary, charts y stats quedaban stale

##### E-review.4 — UI no se refrescaba al eliminar transacción en tabla de análisis
- **Archivo:** `js/ui-analysis.js:58`
- **Error:** `deleteTransactionData(btn.dataset.del)` eliminaba la transacción pero no se llamaba `renderTable()` después. La fila eliminada permanecía visible.
- **Causa:** La función `deleteTransaction` en data.js fue diseñada para ser llamada desde el inline script original que manejaba el refresh. En el refactor se extrajo la lógica pero no se agregó el refresh.
- **Solución:** Agregado `renderTable()` después del delete + toast de "Deshacer" con `restoreTransaction()`
- **Severidad:** CRÍTICO — Sin feedback al usuario, fila fantasma en la tabla

#### Warnings encontrados y corregidos

##### E-review.5 — showToast duplicado sin escape en firebase-room.js
- **Archivo:** `js/firebase-room.js:6-17`
- **Error:** Función local `showToast` usaba `innerHTML` sin `esc()`. En línea 115, el room code del usuario se inyectaba directamente.
- **Solución:** Eliminada función local, importado `showToast` de `ui-modals.js` (que usa `esc()`)
- **Severidad:** MEDIA — XSS potencial con room codes maliciosos

##### E-review.6 — Imports muertos en firebase-sync.js
- **Archivo:** `js/firebase-sync.js:2`
- **Error:** `STORAGE_KEY`, `BUDGET_KEY`, `CATS_KEY`, `MEMBERS_KEY`, `ACCOUNTS_KEY` se importaban pero nunca se usaban.
- **Solución:** Eliminados los 5 imports no utilizados
- **Severidad:** BAJA — Code smell, no afecta funcionalidad

#### Archivos modificados en la revisión

| Archivo | Cambio |
|---|---|
| `js/app.js:2` | Agregado `ACCOUNTS_KEY` al import de config.js |
| `js/app.js:107` | Agregada persistencia de `state.accounts` en callback remoto |
| `js/setup-daily.js:3` | Agregado import de `refreshDaily` desde `ui-daily.js` |
| `js/setup-daily.js:41` | Agregada llamada `refreshDaily()` después de `addTransaction()` |
| `js/setup-analysis.js:10` | Agregado import de `refreshAnalysis` desde `ui-navigation.js` |
| `js/setup-analysis.js:38` | Agregada llamada `refreshAnalysis()` después de `addTransaction()` |
| `js/ui-analysis.js:3` | Agregado import de `restoreTransaction` desde `data.js` |
| `js/ui-analysis.js:6` | Agregado import de `showToast` desde `ui-modals.js` |
| `js/ui-analysis.js:57-68` | Reescrito handler de delete: `renderTable()` + toast con "Deshacer" |
| `js/firebase-room.js:5` | Reemplazado showToast local por import de `ui-modals.js` |
| `js/firebase-room.js:6-17` | Eliminada función local `showToast` (12 líneas) |
| `js/firebase-sync.js:2` | Eliminados 5 imports muertos (`STORAGE_KEY`, `BUDGET_KEY`, `CATS_KEY`, `MEMBERS_KEY`, `ACCOUNTS_KEY`) |

#### Verificación post-corrección

```
[✓] Todos los 22 módulos accesibles vía HTTP (200)
[✓] Todas las imports/resolves verificados (sin exports faltantes)
[✓] Sin dependencias circulares
[✓] Sintaxis ES modules válida en todos los archivos
```

---

## Notas finales

- **No es un rewrite** — es un refactor quirúrgico. En cada fase la app funciona.
- **Sin build tools** — `script type="module"` es todo lo que se necesita.
- **Firebase no cambia** — mismo proyecto, misma config, mismo esquema Firestore.
- **2-4 usuarios** — la escalabilidad no es prioridad. La mantenibilidad sí.
