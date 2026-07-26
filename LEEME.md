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
| CSS | `css/styles.css` (~1142 líneas, variables, tema oscuro/claro, sin selectores duplicados) |
| JS | 22 módulos ES (`js/*.js`), sin frameworks ni build tools |
| Charts | Chart.js v4.4.7 local (`chart.min.js`, 202KB) |
| Persistencia local | localStorage (`finanzas_data`, `finanzas_budgets`, `finanzas_categories`, etc.) + `sessionStorage` (password de sala) |
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
│   └── styles.css          # Todo el CSS (~1142 líneas)
├── js/
│   ├── app.js              # Orchestador: imports, init(), wiring de callbacks
│   ├── state.js            # Objeto state centralizado (único dueño de variables mutables)
│   ├── config.js           # Constantes, Firebase config, categorías default
│   ├── utils.js            # Helpers: $, esc, formatCOP, getToday, getWhoLabel, etc.
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
- **UI refresh** → inyección de dependencias: `setNotifyRefresh(fn)` en `ui-categories.js` y `ui-members.js`, `setRefreshAnalysis(fn)` en `ui-analysis.js`.

### Carga de datos (init)

```
1. loadTheme()           → aplica tema desde localStorage
2. loadMembers()         → carga miembros desde localStorage
3. loadAccounts()        → carga cuentas desde localStorage
4. loadCategories()      → carga categorías desde localStorage
5. loadData()            → carga transacciones/presupuestos desde localStorage
  6. setSyncData/Members/Categories → inyecta syncToFirestore en los 3 módulos
  7. setRefreshAnalysis(refreshAnalysis) → inyecta callback en ui-analysis.js
  8. initFirebase()        → Firebase Auth + Firestore (async, background)
  9. setMode(savedMode)    → restaura modo diario/análisis
  10. renderDaily...()     → render inicial con datos locales
  11. setup*()             → registra event listeners
  12. registerServiceWorker() → registra SW (limpieza de cache delegada al SW activate handler)
```

Los datos locales cargan **antes** de Firebase, así que el primer render es instantáneo (sin flash de "vacío → con datos").

---

## Reglas de dependencia (no romper)

Estas reglas mantienen el grafo de dependencias acíclico. Romperlas crea ciclos de import que la app no puede resolver.

1. **Módulos de dominio → firebase-sync.js:** `data.js`, `members.js` y `categories.js` **nunca** importan `firebase-sync.js` directo. Usan `setSyncToFirestore(fn)` para recibir la función de sync inyectada desde `app.js`.

2. **firebase-sync.js → módulos de dominio:** `firebase-sync.js` **nunca** importa `data.js`, `members.js` ni `categories.js`. Usa `setRemoteUpdateCallback(fn)` para notificar actualizaciones remotas.

3. **state.js es el único dueño de variables mutables:** Todo lo demás lee/escribe `state.x`, nunca reasigna un import. `state` se exporta como `const` y sus propiedades se mutan directamente (`state.transactions = [...]`).

4. **UI refresh sin dependencias circulares:** `ui-categories.js` y `ui-members.js` usan `setNotifyRefresh(fn)` para notificar a `app.js` que debe refrescar la vista. `ui-analysis.js` usa `setRefreshAnalysis(fn)` para no importar `ui-navigation.js` directo (eso crearía un ciclo).

5. **Balance cache:** `invalidateBalanceCache()` se exporta de `data.js` y se llama en `app.js` dentro de `setRemoteUpdateCallback()` para que datos remotos recalculen balances correctamente.

6. **`getWhoLabel()` en utils.js:** La función `getWhoLabel(who)` vive en `utils.js` (no en `members.js`) para romper la dependencia circular `data.js ↔ members.js`. `members.js` la re-exporta para mantener backward compatibility con `ui-daily.js`, `ui-charts.js` y `ui-analysis.js`.

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

### Utils (`js/utils.js`)
| Función | Qué hace |
|---------|----------|
| `$(id)` | Atajo para `document.getElementById` |
| `esc(s)` | Escapa HTML para prevenir XSS en innerHTML |
| `formatCOP(n)` | Formatea número como COP sin decimales |
| `formatCOPShort(n)` | Formatea COP abreviado (1.5M, 50K) |
| `sanitizeStr(str, maxLen)` | Elimina tags HTML y trunca a maxLen |
| `validateAmount(amount)` | Retorna mensaje de error si el monto es inválido, null si es válido |
| `downloadBlob(blob, filename)` | Descarga un Blob como archivo |
| `generateId()` | Genera UUID; fallback a timestamp+random si crypto no disponible |
| `safeRoomCode(code)` | Codifica código de sala para usar como ID de documento Firestore |
| `getToday()` | Retorna `new Date()` — stub para testing futuro |
| `parseLocalDate(dateStr)` | Convierte 'YYYY-MM-DD' a Date en hora local |
| `toLocalDateStr(date)` | Convierte Date a string 'YYYY-MM-DD' en hora local |
| `renderEmojiPicker(selected, onSelect, pickerId)` | Renderiza grilla de emojis con callback de selección |
| `getWhoLabel(who)` | Convierte id de miembro en nombre legible (requiere `state.members`) |

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
| `invalidateBalanceCache()` | Marca cache de balances como sucio para recálculo |
| `setSyncToFirestore(fn)` | Inyecta la función de sync (llamada desde `app.js`) |

### Firebase (`js/firebase-sync.js`, `js/firebase-room.js`)
| Función | Qué hace |
|---------|----------|
| `initFirebase()` | Firebase Auth + Firestore init; si no hay sala, abre modal y espera |
| `subscribeFirestore()` | `onSnapshot` en tiempo real; verifica passwordHash si existe |
| `promptRoomPassword(roomCode, isCreate)` | Modal para ingresar contraseña de sala; retorna Promise con hash o null |
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
| `setRefreshAnalysis(fn)` | Inyecta callback de refresh para evitar ciclo con `ui-navigation.js` |

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
| `registerServiceWorker()` | Registra SW (limpieza de cache delegada al SW activate handler) |

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
- La clave se almacena en `sessionStorage` (`finanzas_room_pwd`). Se mantiene durante la sesión (resiste refresh de página) pero se borra al cerrar el navegador.
- Si `sessionStorage` está vacío pero Firestore tiene `passwordHash`, la app abre un modal para reingresar la contraseña (fail-closed).
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
      allow create: if request.auth != null
        && request.resource.data.keys().hasAll([
          'transactions', 'budgets', 'categories', 'members', 'accounts'
        ])
        && request.resource.data.transactions is list
        && request.resource.data.budgets is map
        && request.resource.data.categories is map
        && request.resource.data.members is map
        && request.resource.data.accounts is map
        && request.resource.data.transactions.size() <= 10000;
      allow update: if request.auth != null
        && request.resource.data.transactions.size() <= 10000;
    }
    match /config/{doc} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
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

**Límite de salas:** Se usa un documento `config/meta` con un contador `roomCount` (máx. 50). Esto evita exponer todos los documentos `rooms/*` al verificar el límite (lo que hacía `collection().get()` antes). El contador se incrementa al crear y decrementa al salir, con guard anti-underflow.

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

### Por qué `setRefreshAnalysis(fn)` en ui-analysis
- `ui-analysis.js` necesitaba llamar `refreshAll()` de `ui-navigation.js`, pero eso crearía un ciclo: `ui-analysis.js → ui-navigation.js → ui-analysis.js`.
- `app.js` inyecta `refreshAnalysis` como callback via `setRefreshAnalysis(fn)`.

### Por qué `sessionStorage` para password (no `localStorage`)
- `localStorage` persiste el password indefinidamente — incluso después de cerrar el navegador. Si el dispositivo es compartido, otro usuario podría heredar la sesión.
- `sessionStorage` se limpia automáticamente al cerrar el navegador. Resiste refresh de página (mantiene la sesión durante la visita), pero no persiste entre sesiones.
- Si `sessionStorage` está vacío pero Firestore tiene `passwordHash`, la app abre un modal para reingresar la contraseña (fail-closed).

### Por qué `config/meta` para límite de salas
- **Antes:** `collection(ROOMS_COLLECTION).get()` traía TODOS los documentos de sala para contar. Esto exponía datos (transactions, budgets, etc.) a cualquier usuario autenticado — violación de privacidad.
- **Ahora:** Un solo documento `config/meta` con `roomCount` (máx. 50). Lectura mínima, sin exposición de datos.
- El contador se incrementa al crear sala y decrementa al salir, con guard anti-underflow (`Math.max(0, count - 1)`).

### Por qué `invalidateBalanceCache()` en remote update
- `getBalanceMap()` usa cache por mes/tipo para evitar recálculos.
- Cuando llegan datos remotos vía Firestore, los caches pueden estar obsoletos.
- `setRemoteUpdateCallback()` en `app.js` llama `invalidateBalanceCache()` para forzar recálculo en la próxima consulta.

### Por qué `getWhoLabel()` vive en utils.js (no en members.js)
- `data.js` necesitaba `getWhoLabel()` para `exportCSV()`, pero `members.js` ya importaba `getAccountBalance()` de `data.js` — crearía un ciclo `data.js ↔ members.js`.
- Mover `getWhoLabel()` a `utils.js` rompe el ciclo. `members.js` la re-exporta (`export { getWhoLabel }`) para que los consumidores existentes (`ui-daily.js`, `ui-charts.js`, `ui-analysis.js`) no necesiten cambiar sus imports.

### Por qué nombres fijos (Él, Ella, Compartido 👥)
- Los perfiles configurables NO se sincronizan entre dispositivos.
- Se hardcodearon IDs simbólicos (`yo`, `pareja`, `compartido`) para garantizar consistencia en la sala compartida y retrocompatibilidad con transacciones legacy.

### Por qué `encodeURIComponent` para códigos de sala
- Firestore interpreta `/` como subcolecciones.
- `encodeURIComponent()` codifica `/` como `%2F`.

### Por qué NO se borran caches en registerServiceWorker()
- **Antes:** `registerServiceWorker()` borraba todos los caches y desregistraba el SW en cada carga. Esto rompía el offline mode.
- **Ahora:** La limpieza de caches viejos la maneja el SW en su handler `activate` (compara el nombre del cache actual vs los existentes y borra los obsoletos). `registerServiceWorker()` solo llama `navigator.serviceWorker.register('sw.js')`.
- El SW usa `skipWaiting()` + `clients.claim()` para activarse inmediatamente después de instalar.

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
| Compartido podía registrar ingresos | `compartido+ingreso` se guardaba en data sin restricción | 4 capas: data, importación, sync y UI rechazan `compartido+ingreso` | `bd4a917` |
| Compartido visible en panel de cuentas | `renderAccountsPanel()` y `accountMemberSelect` mostraban Compartido como cuenta normal | Filtrado por `member !== 'compartido'` en ambos | `bd4a917` |
| Fecha de transacción con `toISOString()` en setup-daily | `getToday().toISOString().slice(0,10)` usaba UTC para fecha de transacción | Reemplazado por `toLocalDateStr(getToday())` | `bd4a917` |
| Fuga de datos entre salas | `firstTimeSetup` escribía state (data vieja) a sala nueva | `resetRoomState()` limpia state al cambiar de sala | `5bef7c4` |
| Acceso a sala protegida sin contraseña | Condición `data.passwordHash && state.roomPassword` se saltaba el check si no había password | Si room tiene `passwordHash` y usuario no ingresa contraseña → rechaza | `5bef7c4` |
| `resetRoomState()` dejaba state con `null`/`{}` | TypeError al crear sala nueva (categories/members/accounts eran null) | Restaurar defaults (`DEFAULT_CATEGORIES`, `DEFAULT_MEMBERS`, `DEFAULT_ACCOUNTS`) | `v2.1` |
| Service Worker borraba todos los caches en cada carga | Modo offline roto — el SW se desregistraba y limpiaba todo en `registerServiceWorker()` | Eliminar cache-busting agresivo; limpieza delegada al SW `activate` handler | `v2.1` |
| `subscribeFirestore()` usaba `async` dentro de `Promise` constructor | Anti-pattern que puede causar unhandled rejection silencioso | Reescrito con función anidada `startSnapshot()` + `.then()` chains | `v2.1` |
| SW sin cache de `css/styles.css` y módulos JS | Offline mode no funcionaba — assets faltantes en cache | Agregados `css/styles.css` + 22 `js/*.js` al array `ASSETS` del SW (cache v4) | `v2.1` |
| `importJSON()` no persistía members/accounts | Al importar JSON, members y accounts del archivo se perdían | `importJSON()` ahora llama `saveMembers()` y `saveAccounts()` | `v2.1` |
| `isValidTx()` no validaba largo de `subcategory` | Subcategorías >50 chars pasaban la validación de import | Agregado `tx.subcategory.length <= 50` a la validación | `v2.1` |
| `parseAccountValue()` crasheaba con valor null/undefined | Select vacío causaba `TypeError: Cannot read properties of null` | Retornar defaults `{ who: 'yo', account: 'Efectivo' }` para valores falsy | `v2.1` |
| Selector de cuentas ocultaba cuentas con balance 0 | En modo gasto, cuentas con $0 no aparecían en el select | Eliminado filtro `.filter(({...}) => getAccountBalance(...) > 0)` | `v2.1` |
| Dependencia circular `data.js ↔ members.js` | `data.js` importaba `getWhoLabel` de `members.js`; `members.js` importaba `getAccountBalance` de `data.js` | `getWhoLabel()` movida a `utils.js`; `members.js` re-exporta para backward compat | `v2.1` |
| Variable CSS `--card-bg` usada pero nunca definida | Emoji picker y display de emoji sin fondo correcto | Reemplazada por `--bg-card` (definida en temas dark/light) | `v2.1` |
| Selectores `.feed-item` y `.feed-amount` definidos dos veces | CSS conflicto — segunda definición sobreescribía la primera | Consolidados en una sola definición cada uno | `v2.1` |
| Regla `table th, table td` redundante en `@media 480px` | Dos reglas consecutivas en mismo media query; la primera era inmediatamente sobrescrita | Eliminada la regla redundante | `v2.1` |
| Auto-creación de salas en modo "Unirse" | `subscribeFirestore()` creaba la sala automáticamente si `!snap.exists`, sin importar si el usuario quería crear o unirse | Rechaza con toast "Sala no encontrada" si `isCreatingRoom === false` y el doc no existe | `v2.2` |
| Sin límite de creación de salas | Cualquiera podía crear salas indefinidas sin verificación pre-existencia ni tope | Pre-existence check + conteo de salas (máx 50) antes de crear | `v2.2` |
| `collection().get()` exponía datos de todas las salas | Al verificar límite de 50 salas, se traían todos los documentos con transactions, budgets, etc. | Documento `config/meta` con `roomCount` — lectura mínima sin exposición | `v2.3` |
| Password en `localStorage` persistía entre sesiones | Cerrar el navegador no borraba la sesión — otro usuario del dispositivo podía heredar la clave | Movido a `sessionStorage` (se borra al cerrar navegador) | `v2.3` |
| Sin re-prompt de contraseña al reconectar | Si `sessionStorage` se vaciaba (cerrar/abrir navegador), la app seguía sin contraseña | `promptRoomPassword()` abre modal si `passwordHash` existe pero `state.roomPassword` es null | `v2.3` |
| `promptRoomPassword()` con recursión infinita | `resolver()` helper se llamaba a sí mismo indefinidamente | Eliminado `resolver`; `roomCodeResolver` se nullifica en la primera llamada | `v2.3` |
| Timeout stale tras rounds múltiples de re-prompt | Timeout de una llamada anterior se disparaba después de la siguiente | `clearTimeout(timeoutId)` previene timeouts stale | `v2.3` |
| `style-src` sin `unsafe-inline` | CSS inline (`element.style.xxx`, `style="..."` en innerHTML) bloqueado por CSP | Agregado `'unsafe-inline'` a `style-src` (sin build tool no hay forma de evitarlo) | `v2.3` |
| SW retornaba `undefined` en offline total | `caches.match()` fallaba + fetch fallaba → SW devolvía `undefined` | Retornar `Response('Offline', { status: 503 })` como fallback | `v2.3` |
| `isValidCategories()` aceptaba strings como subcategorías | Import corrupto pasaba validación con `["cat"]` en vez de `[{name, emoji}]` | Ahora rechaza strings: valida `typeof sub !== 'string'` | `v2.3` |
| Dead code en `members.js` | Funciones exportadas pero sin consumidores (`getMemberIds`, `getMemberList`, `getAllAccounts`, etc.) | Eliminadas junto con imports no usados en `ui-daily.js` | `v2.3` |
| Dependencia circular `ui-analysis.js → ui-navigation.js` | `ui-analysis` importaba `refreshAll` de `ui-navigation`, que a su vez importa `ui-analysis` | `setRefreshAnalysis(fn)` callback pattern (como `setNotifyRefresh`) | `v2.3` |
| Balance cache desactualizado en remote update | Datos remotos actualizaban `state` pero caches de `getBalanceMap()` se quedaban viejos | `invalidateBalanceCache()` exportado y llamado en `setRemoteUpdateCallback()` | `v2.3` |
| `resetRoomState()` incondicional en la misma sala | Reingresar contraseña de sala en la que ya estabas vaciaba categorías/miembros/cuentas en memoria | Guard `if (newCode !== state.roomCode)` — solo resetea al cambiar de sala, no al re-confirmar la misma | `v2.3` |
| Tabla de transacciones al final del grid en análisis | Usuario no veía la tabla sin hacer scroll | Movida a primera posición en `content-grid`; max-height 400px con scroll | `v2.3` |

### Hotfix #2 revertido (2026-07-25)

Hotfix #2 (cuentas automáticas en salas viejas) fue implementado y revertido el mismo día. Causó SyntaxError, balances incorrectos y data leak entre cuentas de miembros. Decisión: crear nueva sala y migrar datos manualmente via exportar/importar JSON.

| Evento | Commit | Detalle |
|--------|--------|---------|
| Intento hotfix #2 | `1fc43c6` → `d77d71d` | 4 commits: migración automática de cuentas desde transacciones |
| Revert | `5bef7c4` | Restaurar auto-inject de defaults, ajuste manual |
| Fix de balance (revertido) | Sin commit | `resolveAccountKey()` — fallback por miembro para transacciones viejas. No resolvió el problema de sala vieja |
| Limpieza final | `bd38724` | Master reseteado, ramas hotfix eliminadas, deploy |

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
| `bd38724` | 2026-07-25 | Hotfix #1 (data leak) + #3 (password bypass), revert #2, deploy limpio | ✅ En master + deployado |
| `v2.1` | 2026-07-25 | 14 fixes: resetRoomState defaults, SW v4, subscribeFirestore refactor, CSS limpieza, circular dependency fix | ✅ En master + deployado |
| `v2.2` | 2026-07-25 | Anti-spam salas: rechazo en join, pre-existence check, límite 50 salas | ✅ En master + deployado |
| `v2.3` | 2026-07-26 | Seguridad: config/meta, sessionStorage, prompt contraseña, balance cache, circular dependency, dead code, CSP | ✅ En master |

---

## FAQ

**P: ¿Por qué no funciona File → Open en el navegador?**
R: `crypto.randomUUID()` requiere un contexto seguro. Usar `python3 -m http.server 8080`.

**P: ¿Por qué los botones de editar/eliminar no responden?**
R: Verificar CSP. O IDs mixtos string/number sin `String(t.id) === String(id)`.

**P: ¿Cómo cambio el código de sala?**
R: Consola → `sessionStorage.removeItem('finanzas_room'); location.reload();`

**P: ¿Los datos de Firebase se borran si nadie usa la app por un mes?**
R: No. La data en Firestore persiste. Solo la cuenta anónima se limpia.

**P: ¿Qué pasa si pierdo la clave de la sala?**
R: No hay recuperación — el hash está en Firestore, la clave original no. Se debe crear una sala nueva.
