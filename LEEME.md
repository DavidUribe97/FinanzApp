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
| JS | 23 módulos ES (`js/*.js`), sin frameworks ni build tools |
| Charts | Chart.js v4.4.7 local (`chart.min.js`, 202KB) |
| Persistencia local | localStorage (`finanzas_data`, `finanzas_budgets`, `finanzas_categories`, etc.) |
| Sincronización | Firebase Firestore (Anonymous Auth + `onSnapshot` en tiempo real) |
| Hosting | Firebase Hosting |
| PWA | `manifest.json` + `sw.js` (cache-first de assets estáticos) |
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
/home/david/Presupuesto/
├── index.html              # HTML puro (~453 líneas) + chart.min.js + app.js module
├── css/
│   └── styles.css          # Todo el CSS (~1002 líneas)
├── js/
│   ├── app.js              # Orchestador: imports, window bindings, init()
│   ├── state.js            # Objeto state centralizado
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
├── REFACTOR.md             # Plan de refactorización completo
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

- **`state.js`** → objeto centralizado con toda la data mutable
- **`app.js`** → `Object.defineProperty(window, ...)` expone propiedades de `state` al scope global para compatibilidad
- **Firebase sync** → patrón de callbacks: `setRemoteUpdateCallback(fn)` para evitar dependencias circulares
- **Data sync** → inyección de dependencias: `setSyncToFirestore(fn)` en `data.js`

### Carga de datos (init)

```
1. loadTheme()           → aplica tema desde localStorage
2. loadMembers()         → carga miembros desde localStorage
3. loadAccounts()        → carga cuentas desde localStorage
4. loadCategories()      → carga categorías desde localStorage
5. loadData()            → carga transacciones/presupuestos desde localStorage
6. initFirebase()        → Firebase Auth + Firestore (async, background)
7. setMode(savedMode)    → restaura modo diario/análisis
8. renderDaily...()      → render inicial con datos locales
9. setup*()              → registra event listeners
10. registerServiceWorker() → limpia caches viejas, registra SW
```

Los datos locales cargan **antes** de Firebase, así que el primer render es instantáneo (sin flash de "vacío → con datos").

---

## Cómo usar

### Local (desarrollo/pruebas)
```bash
cd /home/david/Presupuesto
python3 -m http.server 8080
# Abrir http://localhost:8080
```

**IMPORTANTE:** NO usar `file://` directo. `crypto.randomUUID()` requiere un contexto seguro (HTTPS o localhost).

### Despliegue a Firebase
```bash
cd /home/david/Presupuesto
firebase deploy --only hosting,firestore:rules
```

### Git (respaldar cambios)
```bash
git add -A && git commit -m "mensaje"
git push origin refactor/fase-6-ui-panels --tags
```

---

## Mapa de funciones por módulo

### Datos (`js/data.js`)
| Función | Qué hace |
|---------|----------|
| `loadData()` | Carga transactions/budgets desde localStorage |
| `saveData()` | Guarda transactions en localStorage + sync a Firestore |
| `saveBudgets()` | Guarda budgets en localStorage + sync a Firestore |
| `addTransaction(data)` | Agrega transacción, guarda y refresca |
| `editTransaction(id, data)` | Edita transacción por ID |
| `deleteTransaction(id)` | Elimina con deshacer vía toast |
| `getFilteredTransactions(month, year)` | Filtra por mes/año |
| `getCumulativeBalance(month, year)` | Saldo acumulado de meses anteriores |
| `exportCSV()` / `exportJSON()` | Exportación de datos |

### Firebase (`js/firebase-sync.js`, `js/firebase-room.js`)
| Función | Qué hace |
|---------|----------|
| `initFirebase()` | Firebase Auth + Firestore init |
| `subscribeFirestore()` | `onSnapshot` en tiempo real |
| `syncToFirestore()` | Sube datos a Firestore |
| `setRemoteUpdateCallback(fn)` | Callback para actualizaciones remotas |
| `openRoomModal()` / `closeRoomModal()` | Modal de sala |
| `leaveRoom()` | Salir de sala compartida |

### UI - Modo diario (`js/ui-daily.js`)
| Función | Qué hace |
|---------|----------|
| `renderDailyBalance(animate)` | Tarjeta de saldo total |
| `renderDailyFeed()` | Feed agrupado por fecha |
| `renderDailyCategories()` | Categorías en fila horizontal |
| `renderDailySubcategories()` | Subcategorías debajo de categoría |
| `refreshDaily(animate)` | Refresca toda la vista diaria |

### UI - Modo análisis (`js/ui-analysis.js`, `js/ui-charts.js`, etc.)
| Función | Qué hace |
|---------|----------|
| `renderSummary()` | Tarjetas de resumen |
| `renderTable()` | Tabla con búsqueda y filtros |
| `renderCharts()` | Dona + barras |
| `renderLineChart()` | Evolución del saldo 12 meses |
| `renderBudgets()` | Barras de progreso |
| `renderStats()` | Estadísticas |

### UI - Paneles (`js/ui-members.js`, `js/ui-accounts.js`, `js/ui-categories.js`)
| Función | Qué hace |
|---------|----------|
| `renderMembers()` | Lista de miembros |
| `renderAccountsPanel()` | Lista de cuentas |
| `renderCatManager()` | CRUD de categorías |
| `setupCategoryManager()` | Event listeners de CRUD |

### Setup (`js/setup-daily.js`, `js/setup-analysis.js`)
| Función | Qué hace |
|---------|----------|
| `setupDailyMode()` | Toggles tipo/quién + agregar transacción |
| `setupAnalysisForm()` | Formularios, filtros, presupuestos, export/import |

### Navegación y tema (`js/ui-navigation.js`, `js/ui-theme.js`)
| Función | Qué hace |
|---------|----------|
| `setupNavigation()` | Navegación meses, botones sala/modo/tema |
| `setMode(daily)` | Cambia entre modo diario y análisis |
| `refreshAll(animate)` | Refresca TODAS las vistas |
| `loadTheme()` / `toggleTheme()` | Tema oscuro/claro |

### Orchestrador (`js/app.js`)
| Función | Qué hace |
|---------|----------|
| `init()` | Punto de entrada: carga datos, Firebase, render, listeners |
| `registerServiceWorker()` | Registra SW + limpia caches |
| `renderEmojiPicker()` | Selector de emojis |
| `importJSON(file)` | Importa respaldo JSON |
| `bindWindow()` | Expone state al scope global |

---

## Decisiones de diseño

### Por qué ES modules sin build tools
- **Intencional:** cero toolchain, cero dependencias npm. El navegador carga los módulos directamente.
- Fase 1-9 de refactorización: se separó un HTML de ~3690 líneas en 23 módulos ES.

### Por qué el patrón de callbacks para Firebase
- `firebase-sync.js` no puede importar `data.js` (ciclo de dependencias).
- `setRemoteUpdateCallback(fn)` permite que `app.js` conecte los dos sin ciclos.

### Por qué `Object.defineProperty(window, ...)` para state
- Permite que funciones legacy en el scope global (como `importJSON`) accedan a `state.transactions` como `transactions`.
- Los módulos usan `state.xxx` directamente.

### Por qué nombres fijos (David, Laura, Compartido 👥)
- Los perfiles configurables NO se sincronizan entre dispositivos.
- Se hardcodearon para garantizar consistencia en la sala compartida.

### Por qué `encodeURIComponent` para códigos de sala
- Firestore interpreta `/` como subcolecciones.
- `encodeURIComponent()` codifica `/` como `%2F`.

### Por qué NO hay pruebas automatizadas
- App personal para 2-4 personas. El riesgo es mínimo.
- Test manual: probar en `http://localhost:8080` antes de deploy.

---

## Firestore Security Rules

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

---

## Seguridad

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

> **Nota:** `unsafe-inline` ya no es necesario para JS (el inline script fue eliminado en Fase 8). Se mantiene por compatibilidad y para el inline CSS del theme toggle.

### XSS prevention
- `esc(s)` escapa `&<>"'` en toda interpolación con `innerHTML`
- `sanitizeStr()` elimina etiquetas HTML en input del usuario
- CSP como capa adicional de defensa

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

---

## Tags (versiones)

| Tag | Fecha | Descripción | Estado |
|-----|-------|-------------|--------|
| `v1.0.0` | 2026-06-07 | Versión base funcional | ✅ Estable |
| `v1.1.0` | 2026-06-08 | Scroll horizontal, emoji picker | ✅ Estable |
| `v1.2.0` | 2026-06-08 | Subcategorías jerárquicas | ✅ Estable |
| `pre-refactor` | 2026-07-24 | Última versión antes de refactor | 📌 Snapshot |
| `fase-1` | 2026-07-24 | CSS separado | ✅ |
| `fase-2` | 2026-07-24 | state/config/utils | ✅ |
| `fase-3` | 2026-07-24 | data/members/categories | ✅ |
| `fase-4` | 2026-07-24 | Firebase sync | ✅ |
| `fase-5` | 2026-07-24 | UI rendering (6 módulos) | ✅ |
| `fase-6` | 2026-07-24 | UI panels (3 módulos) | ✅ |
| `fase-7` | 2026-07-24 | Setup/navigation/theme | ✅ |
| `fase-8` | 2026-07-24 | Orchestrador app.js, zero inline JS | ✅ |

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
