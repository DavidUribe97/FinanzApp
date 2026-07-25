# FinanzApp — App de Gastos Mensuales

App web **100% offline-first** para registrar ingresos/gastos personales, con sincronización en tiempo real vía Firebase Firestore. PWA instalable, arquitectura modular ES sin build tools.

**URLs:**
- Producción: https://presupuesto-cddeb.web.app
- GitHub: https://github.com/DavidUribe97/FinanzApp
- Local: `http://localhost:8080`

---

## Stack técnico

| Componente | Detalle |
|---|---|
| HTML | `index.html` (~453 líneas, solo estructura + modales) |
| CSS | `css/styles.css` (~1002 líneas, variables, tema oscuro/claro) |
| JS | 22 módulos ES (`js/*.js`), sin frameworks ni build tools |
| Charts | Chart.js v4.4.7 local (`chart.min.js`, 202KB) |
| Persistencia local | localStorage (`finanzas_data`, `finanzas_budgets`, `finanzas_categories`, etc.) |
| Sincronización | Firebase Firestore (Anonymous Auth + `onSnapshot` en tiempo real) |
| Hosting | Firebase Hosting |
| PWA | `manifest.json` + `sw.js` (cache-first de assets estáticos + network-first de Firebase CDN) |
| Fuentes | System font stack (sin Google Fonts, para offline) |
| Moneda | COP (pesos colombianos) con `Intl.NumberFormat('es-CO')` |

**Decisiones clave del stack:**
- **Sin build tools** — la app usa ES modules nativos (`<script type="module">`). Cero toolchain.
- **Firebase compat SDK vía CDN** — se usan los SDKs compat (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`) porque no requieren bundler.
- **Chart.js local** — descargado a `chart.min.js` para funcionar 100% offline.
- **System fonts** — se evita Google Fonts para que no haya dependencia externa.

---

## Estructura del proyecto

```
.
├── index.html              # HTML puro (~453 líneas) + chart.min.js + app.js module
├── css/
│   └── styles.css          # Todo el CSS (~1002 líneas)
├── js/
│   ├── app.js              # Orchestador: imports, init(), wiring de callbacks
│   ├── state.js            # Objeto state centralizado (único dueño de variables mutables)
│   ├── config.js           # Constantes, Firebase config, categorías default
│   ├── utils.js            # Helpers: $, esc, formatCOP, getToday, etc.
│   ├── data.js             # CRUD transacciones, sync, validación
│   ├── members.js          # Miembros y cuentas
│   ├── categories.js       # Categorías y subcategorías
│   ├── firebase-sync.js    # Firebase Auth + Firestore sync
│   ├── firebase-room.js    # Gestión de salas
│   ├── ui-modals.js        # Toasts, confirm, edit modal
│   ├── ui-daily.js         # Modo diario: feed, categorías, balance
│   ├── ui-analysis.js      # Modo análisis: tabla, resumen
│   ├── ui-charts.js        # Gráficos Chart.js
│   ├── ui-budgets.js       # Presupuestos
│   ├── ui-stats.js         # Estadísticas
│   ├── ui-members.js       # Panel de miembros
│   ├── ui-accounts.js      # Panel de cuentas
│   ├── ui-categories.js    # Panel de categorías
│   ├── ui-theme.js         # Tema oscuro/claro
│   ├── ui-navigation.js    # Navegación meses, modo, refresh
│   ├── setup-daily.js      # Event listeners modo diario
│   └── setup-analysis.js   # Event listeners modo análisis
├── chart.min.js            # Chart.js v4.4.7 (local, 202KB)
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (cache-first)
├── icon-192.svg            # Icono PWA 192x192
├── icon-512.svg            # Icono PWA 512x512
├── firebase.json           # Config Firebase Hosting + Firestore rules path
├── firestore.rules         # Security rules para Firestore
├── .firebaserc             # Proyecto Firebase (presupuesto-cddeb)
├── .gitignore              # Ignora node_modules, .firebase/, logs
├── docs/
│   └── archivo/
│       └── CHANGELOG_v1.3.0.md  # Changelog histórico (features v1.3.0, ya en master)
├── REFACTOR.md             # Plan de refactorización (histórico, congelado)
└── LEEME.md                # Esta documentación
```

---

## Arquitectura modular

### Cómo funciona sin build tools

```html
<!-- index.html: solo carga chart.min.js (UMD) y app.js (module) -->
<script src="chart.min.js"></script>
<script type="module" src="js/app.js"></script>
```

`app.js` importa todos los módulos. Cada módulo exporta funciones/constantes. No hay bundling — el navegador carga los módulos en cascada vía HTTP.

### Patrón de comunicación entre módulos

- **`state.js`** → objeto centralizado con toda la data mutable. Único dueño de las variables.
- **`firebase-sync.js`** → patrón de callbacks: `setRemoteUpdateCallback(fn)` para evitar dependencias circulares.
- **Data sync** → inyección de dependencias: `setSyncToFirestore(fn)` en `data.js`, `members.js` y `categories.js`.
- **UI refresh** → inyección de dependencias: `setNotifyRefresh(fn)` en `ui-categories.js` y `ui-members.js`.

### Carga de datos (init)

```
1. loadTheme()           → aplica tema desde localStorage
2. loadMembers()         → carga miembros desde localStorage
3. loadAccounts()        → carga cuentas desde localStorage
4. loadCategories()      → carga categorías desde localStorage
5. loadData()            → carga transacciones/presupuestos desde localStorage
6. setSyncData/Members/Categories → inyecta syncToFirestore en los 3 módulos
7. initFirebase()        → Firebase Auth + Firestore (async, background)
8. setMode(savedMode)    → restaura modo diario/análisis
9. renderDaily...()      → render inicial con datos locales
10. setup*()             → registra event listeners
11. registerServiceWorker() → limpia caches viejas, registra SW
```

Los datos locales cargan **antes** de Firebase, así que el primer render es instantáneo (sin flash de "vacío → con datos").

---

## Reglas de dependencia (no romper)

Estas reglas mantienen el grafo de dependencias acíclico. Romperlas crea ciclos de import que la app no puede resolver.

1. **Módulos de dominio → firebase-sync.js:** `data.js`, `members.js` y `categories.js` **nunca** importan `firebase-sync.js` directo. Usan `setSyncToFirestore(fn)` para recibir la función de sync inyectada desde `app.js`.

2. **firebase-sync.js → módulos de dominio:** `firebase-sync.js` **nunca** importa `data.js`, `members.js` ni `categories.js`. Usa `setRemoteUpdateCallback(fn)` para notificar actualizaciones remotas.

3. **state.js es el único dueño de variables mutables:** Todo lo demás lee/escribe `state.x`, nunca reasigna un import. `state` se exporta como `const` y sus propiedades se mutan directamente (`state.transactions = [...]`).

4. **UI refresh sin dependencias circulares:** `ui-categories.js` y `ui-members.js` usan `setNotifyRefresh(fn)` para notificar a `app.js` que debe refrescar la vista. No importan `ui-navigation.js` directo (eso crearía un ciclo).

---

## Cómo usar

### Local (desarrollo/pruebas)
```bash
python3 -m http.server 8080
# Abrir http://localhost:8080
```

**IMPORTANTE:** NO usar `file://` directo. `crypto.randomUUID()` requiere un contexto seguro (HTTPS o localhost).

### Despliegue a Firebase
```bash
firebase deploy --only hosting,firestore:rules
```

### Git (respaldar cambios)
```bash
git add -A && git commit -m "mensaje"
git push origin master --tags
```

---

## Mapa de funciones por módulo

### Datos (`js/data.js`)
| Función | Qué hace |
|---------|----------|
| `loadData()` | Carga transactions/budgets desde localStorage; si está vacío, inicializa `[]`/`{}` |
| `saveData()` | Guarda transactions en localStorage + dispara sync a Firestore |
| `saveBudgets()` | Guarda budgets en localStorage + dispara sync a Firestore |
| `addTransaction(data)` | Agrega transacción al array, guarda y refresca |
| `editTransaction(id, data)` | Edita transacción por ID (match por `String()` para retrocompatibilidad) |
| `deleteTransaction(id)` | Elimina con deshacer vía toast; retorna la transacción eliminada |
| `restoreTransaction()` | Restaura la última transacción eliminada (undo) |
| `getFilteredTransactions(month, year)` | Filtra transacciones por mes/año |
| `getDisplayTransactions()` | Filtra por mes + búsqueda + tipo + quién (para tabla de análisis) |
| `getCumulativeBalance(month, year)` | Saldo acumulado de meses anteriores |
| `getAccountBalance(accountKey)` | Saldo de una cuenta específica (clave `miembro:cuenta`) |
| `getMonthRange(month, year)` | Retorna `{start, end, days}` de un mes |
| `exportCSV()` / `exportJSON()` | Exportación de datos a archivo descargable |
| `isValidTx(tx)` | Valida estructura de transacción (para import) |
| `isValidCategories(cats)` | Valida estructura de categorías (para import) |
| `isValidBudgets(budgets)` | Valida estructura de presupuestos (para import) |
| `setSyncToFirestore(fn)` | Inyecta la función de sync (llamada desde `app.js`) |

### Firebase (`js/firebase-sync.js`, `js/firebase-room.js`)
| Función | Qué hace |
|---------|----------|
| `initFirebase()` | Firebase Auth + Firestore init; si no hay sala, abre modal y espera |
| `subscribeFirestore()` | `onSnapshot` en tiempo real; verifica passwordHash si existe |
| `syncToFirestore()` | Sube transactions, budgets, categories, members y accounts a Firestore |
| `setRemoteUpdateCallback(fn)` | Callback para notificar cuando llegan datos remotos |
| `sha256(str)` | Hash SHA-256 via Web Crypto API (para passwords de sala) |
| `updateSyncStatus(connected)` | Actualiza indicador visual de conexión |
| `updateRoomLabel()` | Muestra código de sala en el header |
| `openRoomModal()` / `closeRoomModal()` | Modal de sala (crear/unirse) |
| `leaveRoom()` | Salir de sala: limpia localStorage, desconecta Firestore |
| `setupRoomModal()` | Event listeners del modal de sala |

### UI - Modo diario (`js/ui-daily.js`)
| Función | Qué hace |
|---------|----------|
| `renderDailyBalance(animate)` | Tarjeta de saldo total + efectivo/digital + saldo mes anterior |
| `renderDailyFeed()` | Feed agrupado por fecha con day headers y neto por día |
| `renderDailyCategories(restore)` | Categorías en fila horizontal; restaura última categoría usada |
| `renderDailySubcategories()` | Subcategorías debajo de categoría seleccionada |
| `updateTypeToggle()` | Actualiza botones gasto/ingreso |
| `updateWhoToggle()` | Actualiza who-toggle: 3 defaults + miembros extra con colores |
| `setupCategoryDragScroll(container)` | Drag-to-scroll para filas de categorías y who-toggle |
| `saveLastCategory(type, cat, subcat)` | Guarda última categoría usada para restaurar al cambiar tipo |
| `refreshDaily(animate)` | Refresca balance + feed |

### UI - Modo análisis (`js/ui-analysis.js`, `js/ui-charts.js`, etc.)
| Función | Qué hace |
|---------|----------|
| `renderSummary()` | Tarjetas de resumen (ingresos, gastos, saldo, num transacciones) |
| `renderTable()` | Tabla con búsqueda, filtros, badges de miembro, cuentas |
| `renderCharts()` | Dona de gastos por categoría + barras por semana; tooltip muestra gasto por miembro |
| `renderLineChart()` | Evolución del saldo 12 meses |
| `renderBudgets()` | Barras de progreso con porcentaje y botón eliminar |
| `renderStats()` | Estadísticas: gasto diario, top categoría, vs mes anterior, por miembro |

### UI - Paneles (`js/ui-members.js`, `js/ui-accounts.js`, `js/ui-categories.js`)
| Función | Qué hace |
|---------|----------|
| `renderMembers()` | Lista de miembros con editar/eliminar (defaults no se eliminan) |
| `setupMembersPanel()` | CRUD de miembros: agregar, editar, eliminar con reasignación a compartido |
| `updateWhoSelects()` | Actualiza los `<select>` de quién en formularios |
| `filterWhoForType(type)` | Oculta Compartido si tipo es ingreso; fuerza gasto si Compartido seleccionado |
| `renderAccountsPanel()` | Lista de cuentas por miembro con íconos efectivo/digital |
| `setupAccountsPanel()` | CRUD de cuentas: agregar, editar, eliminar |
| `renderCatManager()` | CRUD de categorías con emoji picker |
| `renderSubcatList(type, idx)` | Lista de subcategorías de una categoría |
| `clearSubcatEdit()` | Limpia estado de edición de subcategoría |
| `setupCategoryManager()` | Event listeners de CRUD categorías + subcategorías |

### Setup (`js/setup-daily.js`, `js/setup-analysis.js`)
| Función | Qué hace |
|---------|----------|
| `setupDailyMode()` | Toggles tipo/quién + agregar transacción con validación de saldo |
| `setupAnalysisForm(onImportJSON)` | Formularios, filtros, presupuestos, export/import, edit modal |

### Navegación y tema (`js/ui-navigation.js`, `js/ui-theme.js`)
| Función | Qué hace |
|---------|----------|
| `setupNavigation()` | Navegación meses, botones sala/modo/tema |
| `setMode(daily)` | Cambia entre modo diario y análisis |
| `refreshAll(animate)` | Refresca vistas del modo activo (diario o análisis, no ambos) |
| `refreshAnalysis()` | Refresca solo vistas de análisis |
| `updateMonthLabel()` | Actualiza etiqueta de mes en header |
| `loadTheme()` / `toggleTheme()` | Tema oscuro/claro |

### Orchestrator (`js/app.js`)
| Función | Qué hace |
|---------|----------|
| `init()` | Punto de entrada: carga datos, inyecta callbacks, Firebase, render, listeners |
| `registerServiceWorker()` | Registra SW + limpia caches viejas |

---

## Features principales

### Miembros editables
Los miembros vienen con valores por defecto (`Él`, `Ella`, `Compartido 👥`) pero se pueden renombrar, agregar nuevos y eliminar desde un panel en la vista análisis. Al eliminar un miembro, sus transacciones se reasignan a "Compartido".

- **Por qué:** La app es para uso personal, no solo para David y Laura. El usuario pidió poder cambiar los nombres sin editar código y agregar más personas (hijos, roomies, etc.).
- IDs simbólicos para defaults (`yo`, `pareja`, `compartido`) en lugar de `m1`, `m2`, `m3` — legibles y retrocompatibles.
- IDs auto-incrementales para nuevos miembros (`m4`, `m5`...).

### Colores por miembro
Cada miembro tiene un color único de una paleta de 10 (azul, dorado, verde, púrpura, naranja, cian, rojo, lima, magenta, teal). Se aplica en badges de la tabla y en el botón activo del who-toggle.

- **Por qué:** El usuario pidió distinguir visualmente a cada miembro en la tabla de transacciones.
- Los colores se asignan por posición (`indexOf(id) % 10`), no por nombre. Si hay más de 10 miembros, los colores se reciclan.

### Clave de sala
Al crear una sala se puede establecer una contraseña (hash SHA-256). Al unirse a una sala protegida, se pide la clave. Salas legacy (sin `passwordHash` en Firestore) siguen funcionando sin contraseña.

- **Por qué:** El usuario quería privacidad adicional: que no cualquiera con el código pueda ver los datos.
- La clave se almacena en `localStorage` (`finanzas_room_pwd`). Si se borra localStorage, se pierde la clave.
- La validación es **client-side**: el hash se compara en `subscribeFirestore()`, no en Firestore Security Rules. Ver "Seguridad" más abajo.

### Who-toggle con scroll y miembros extra
Cuando hay más de 3 miembros, el who-toggle muestra scroll horizontal con drag-to-scroll. Cada miembro extra tiene un color único al activarse.

### Indicador de sala y salir
El código de la sala se muestra en el header. El botón "Salir de esta sala" en el modal desconecta Firestore, limpia localStorage y vuelve a modo offline.

### Sin datos de ejemplo
`loadData()` inicializa `transactions = []` cuando no hay datos. No se generan transacciones ficticias.

---

## Seguridad

### Firestore Security Rules

```
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

### CSP (Content-Security-Policy)
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.gstatic.com https://identitytoolkit.googleapis.com;
  style-src 'self' 'unsafe-inline';
  connect-src 'self' https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com;
  img-src 'self' data:;
  font-src 'self';
  manifest-src 'self'
">
```

### XSS prevention
- `esc(s)` escapa `&<>"'` en toda interpolación con `innerHTML`
- `sanitizeStr()` elimina etiquetas HTML en input del usuario
- CSP como capa adicional de defensa

### Seguridad de salas — decisión consciente
La validación de contraseña de sala ocurre **solo en el cliente** (`firebase-sync.js:subscribeFirestore`). Firestore Security Rules permiten leer/escribir a cualquier usuario autenticado anónimamente si conoce el código de sala. La contraseña es un filtro de UX, no un control de acceso server-side.

**Por qué se acepta:** La app es para uso familiar privado (2-4 usuarios). El código de sala funciona como "secreto compartido" tipo URL. No existe listado público de salas. Para cerrar esto de verdad se necesitaría una Cloud Function que valide el hash antes de permitir escritura, pero la complejidad no justifica el beneficio para este caso de uso.

Detalle completo: ver REFACTOR.md sección "Decisión de seguridad: Firestore rules".

---

## Decisiones de diseño

### Por qué ES modules sin build tools
- **Intencional:** cero toolchain, cero dependencias npm. El navegador carga los módulos directamente.
- Refactorización fases 1-9: se separó un HTML de ~3690 líneas en 22 módulos ES.

### Por qué el patrón de callbacks para Firebase
- `firebase-sync.js` no puede importar `data.js` (ciclo de dependencias).
- `setRemoteUpdateCallback(fn)` permite que `app.js` conecte los dos sin ciclos.

### Por qué `setSyncToFirestore(fn)` en data/members/categories
- Los módulos de dominio necesitan sincronizar cuando cambian datos, pero no pueden importar `firebase-sync.js` (regla 1 de dependencias).
- `app.js` inyecta `syncToFirestore` en los 3 módulos durante `init()`.

### Por qué `setNotifyRefresh(fn)` en ui-categories/ui-members
- Estos módulos necesitan notificar a la app que refresque la vista después de CRUD, pero no pueden importar `ui-navigation.js` (crearía ciclo).
- `app.js` inyecta `refreshAll` como callback.

### Por qué nombres fijos (Él, Ella, Compartido 👥)
- Los perfiles configurables NO se sincronizan entre dispositivos.
- Se hardcodearon IDs simbólicos (`yo`, `pareja`, `compartido`) para garantizar consistencia en la sala compartida y retrocompatibilidad con transacciones legacy.

### Por qué `encodeURIComponent` para códigos de sala
- Firestore interpreta `/` como subcolecciones.
- `encodeURIComponent()` codifica `/` como `%2F`.

### Por qué NO hay pruebas automatizadas
- App personal para 2-4 personas. El riesgo es mínimo.
- Test manual: probar en `http://localhost:8080` antes de deploy.

---

## Bugs conocidos y soluciones

| Bug | Síntoma | Solución | Commit |
|-----|---------|----------|--------|
| IDs numéricos de ejemplo vs string | Botones editar/eliminar no funcionaban | `String(t.id) === String(id)` | `9159038` |
| `crypto.randomUUID()` falla en `file://` | App rota desde archivo local | `generateId()` con try/catch + fallback | `9159038` |
| Código de sala con `/` rompe Firestore | "Invalid document reference" | `encodeURIComponent()` | `a8f213b` |
| Snapshot Firestore sobreescribe cambios locales | Se pierde transacción en progreso | Deep clone + skip si `pendingSyncs > 0` | `c620ba4` |
| API key restringida por HTTP referrer | Firebase Auth falla | Quitar restricción | — |
| `getSubCatEmoji()` retorna `''` | Feed muestra emoji vacío | Fallback a `getCatEmoji()` | — |
| Acumulación de listeners drag-scroll | Scroll errático | Guard `dataset.dragInit` | — |
| `firstTimeSetup` sin campo `accounts` | No se podían crear salas nuevas (firestore.rules lo requiere) | Agregar `accounts: state.accounts` al objeto data | `38cdffb` |
| `.catch(() => {})` silencioso en `firstTimeSetup` | Errores de Firestore invisibles | `try/catch` con `console.warn` + `updateSyncStatusUI(false)` | `38cdffb` |
| Timezone: `T00:00:00` y `toISOString()` | Fechas se desalineaban en offsets UTC positivos | Helpers `parseLocalDate()` y `toLocalDateStr()` | `38cdffb` |
| Sin validación de `:` en nombres de cuenta | `parseAccountValue()` se rompía con `:` en el nombre | `if (name.includes(':'))` al guardar cuenta | `38cdffb` |
| SW sin cache de Firebase CDN | App no cargaba offline si el CDN de Firebase caía | Network-first cache para `gstatic.com/firebasejs/` | `38cdffb` |
| Rename de categoría sin confirmación | Renombrar afectaba transacciones sin aviso | `showConfirmModal` antes del rename mostrando transacciones afectadas | `38cdffb` |
| `refreshAll()` renderiza todo en remote update | Render innecesario del modo inactivo al recibir datos remotos | Solo renderizar modo activo | `38cdffb` |
| Compartido podía registrar ingresos | `compartido+ingreso` se guardaba en data sin restricción | 4 capas: data, importación, sync y UI rechazan `compartido+ingreso` | `pendiente` |
| Compartido visible en panel de cuentas | `renderAccountsPanel()` y `accountMemberSelect` mostraban Compartido como cuenta normal | Filtrado por `member !== 'compartido'` en ambos | `pendiente` |
| Fecha de transacción con `toISOString()` en setup-daily | `getToday().toISOString().slice(0,10)` usaba UTC para fecha de transacción | Reemplazado por `toLocalDateStr(getToday())` | `pendiente` |

---

## Tags (versiones)

| Tag | Fecha | Descripción | Estado |
|-----|-------|-------------|--------|
| `v1.0.0` | 2026-06-07 | Versión base funcional | ✅ Estable |
| `v1.1.0` | 2026-06-08 | Scroll horizontal, emoji picker | ✅ Estable |
| `v1.2.0` | 2026-06-08 | Subcategorías jerárquicas | ✅ Estable |
| `pre-refactor` | 2026-07-24 | Última versión antes de refactor | 📌 Snapshot |
| `fase-1` a `fase-9` | 2026-07-24 | Refactorización en 9 fases | ✅ |
| `v1.3.0` | 2026-07-24 | Miembros editables, clave salas, colores | ✅ En master |
| `v2.0` | 2026-07-24 | Modularización completa + 6 post-fixes | ✅ En master |

---

## FAQ

**P: ¿Por qué no funciona File → Open en el navegador?**
R: `crypto.randomUUID()` requiere un contexto seguro. Usar `python3 -m http.server 8080`.

**P: ¿Por qué los botones de editar/eliminar no responden?**
R: Verificar CSP. O IDs mixtos string/number sin `String(t.id) === String(id)`.

**P: ¿Cómo cambio el código de sala?**
R: Consola → `localStorage.removeItem('finanzas_room'); location.reload();`

**P: ¿Los datos de Firebase se borran si nadie usa la app por un mes?**
R: No. La data en Firestore persiste. Solo la cuenta anónima se limpia.

**P: ¿Qué pasa si pierdo la clave de la sala?**
R: No hay recuperación — el hash está en Firestore, la clave original no. Se debe crear una sala nueva.
