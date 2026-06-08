# FinanzApp — App de Gastos Mensuales

App web **100% offline-first** para registrar ingresos/gastos personales, con sincronización en tiempo real vía Firebase Firestore. PWA instalable, single-page application en un solo HTML con JavaScript vanilla, CSS y Chart.js.

**URLs:**
- Producción: https://presupuesto-cddeb.web.app
- GitHub: https://github.com/DavidUribe97/FinanzApp
- Local: `http://localhost:8080`

---

## Stack técnico

| Componente | Detalle |
|---|---|
| HTML | Un solo archivo (`index.html`, ~2650 líneas) |
| CSS | Variables CSS, tema oscuro/claro, responsive, animaciones |
| JS | JavaScript vanilla, sin frameworks ni build tools |
| Charts | Chart.js v4.4.7 local (`chart.min.js`, 202KB) |
| Persistencia local | localStorage (`finanzas_data`, `finanzas_budgets`, `finanzas_categories`, etc.) |
| Sincronización | Firebase Firestore (Anonymous Auth + `onSnapshot` en tiempo real) |
| Hosting | Firebase Hosting |
| PWA | `manifest.json` + `sw.js` (cache-first de assets estáticos) |
| Fuentes | System font stack (sin Google Fonts, para offline) |
| Moneda | COP (pesos colombianos) con `Intl.NumberFormat('es-CO')` |

**Decisiones clave del stack:**
- **Sin build tools** — la app se sirve directamente desde el HTML, sin npm/webpack/vite. Cero toolchain.
- **Firebase compat SDK vía CDN** — se usan los SDKs compat (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`) porque no requieren bundler.
- **Chart.js local** — descargado a `chart.min.js` para funcionar 100% offline.
- **System fonts** — se evita Google Fonts para que no haya dependencia externa.

---

## Estructura del proyecto

```
/home/david/Presupuesto/
├── index.html          # App completa (HTML + CSS + JS embebido)
├── chart.min.js        # Chart.js v4.4.7 (local, 202KB)
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (cache-first)
├── icon-192.svg        # Icono PWA 192x192
├── icon-512.svg        # Icono PWA 512x512
├── firebase.json       # Config Firebase Hosting + Firestore rules path
├── firestore.rules     # Security rules para Firestore
├── .firebaserc         # Proyecto Firebase (presupuesto-cddeb)
├── .gitignore          # Ignora node_modules, .firebase/, logs
├── LEEME.md            # Esta documentación
└── .firebase/          # Cache local de Firebase (no commiteado)
```

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
git push origin master --tags
```

---

## Arquitectura y flujo de datos

### Vista general

```
Usuario → index.html (UI + JS)
               │
               ├── localStorage (persistencia local)
               │      ├── finanzas_data        → transactions[]
               │      ├── finanzas_budgets      → budgets{}
               │      ├── finanzas_categories   → categoriesData{}
               │      ├── finanzas_theme        → 'dark' | 'light'
               │      ├── finanzas_mode         → 'daily' | 'analysis'
               │      ├── finanzas_last_cat     → última categoría usada
               │      └── finanzas_room         → código de sala
               │
               └── Firebase Firestore (sync opcional)
                      └── rooms/{roomCode}
                           ├── transactions[]
                           ├── budgets{}
                           └── categories{}
```

### Ciclo de vida de una transacción

1. **Usuario agrega gasto** → `addTransaction()` en `index.html`
2. → `transactions.push(data)` (array global en memoria)
3. → `saveData()` → `localStorage.setItem(...)` (persistencia local inmediata)
4. → `syncToFirestore()` → escribe a Firestore (si hay conexión)
5. → `refreshAll(true)` → re-renderiza toda la UI

### Sincronización Firestore (tiempo real)

- `initFirebase()` → Anonymous Auth → `subscribeFirestore()` con `onSnapshot`
- Cada cambio remoto dispara el snapshot, que actualiza `transactions`, `budgets`, `categoriesData` en memoria y localStorage
- Si hay `pendingSyncs` (escrituras locales no enviadas), el snapshot **no sobreescribe** los datos locales para no perder cambios
- Si Firebase no está disponible, la app funciona igual con localStorage
- `pendingSyncs` se acumulan y se vacían cuando Firebase se conecta (`flushPendingSyncs()`)

### Almacenamiento en Firestore

**Toda la data de una sala se guarda en un ÚNICO documento:**

```
rooms/{roomCode}:
  - transactions: [...]   (array, máx 10.000 items - validado en firestore.rules)
  - budgets: {cat1: monto, ...}
  - categories: {ingreso: [...], gasto: [...]}
  - createdAt: timestamp
  - updatedAt: timestamp
```

Esto es intencional (simplicidad) pero implica:
- Límite de 1MB por documento Firestore (~10-15K transacciones)
- Cada cambio descarga el documento COMPLETO en todos los dispositivos
- No hay paginación ni subcolecciones

### Dos modos de vista

- **Modo diario** (`#dailyView`) — interfaz táctil rápida: seleccionar categoría → monto → ✓. Ideal para el día a día.
- **Modo análisis** (`#analysisView`) — tabla, gráficos, presupuestos, estadísticas, exportación. Para revisión detallada.
- Se cambia con el botón 📊/◀ en el header. El modo se persiste en localStorage (`finanzas_mode`).

---

## Mapa de funciones clave

Organizadas por tipo para que un agente encuentre rápido lo que necesita modificar.

### Gestión de datos

| Función | Archivo:línea | Qué hace |
|---------|--------------|----------|
| `loadData()` | `index.html:~1400` | Carga transactions/budgets desde localStorage. Si está corrupto, genera datos de ejemplo |
| `saveData()` | `index.html:~1410` | Guarda transactions en localStorage + sync a Firestore |
| `saveBudgets()` | `index.html:~1415` | Guarda budgets en localStorage + sync a Firestore |
| `saveCategories()` | — | Guarda categoriesData en localStorage + sync a Firestore |
| `generateSampleData()` | `index.html:~1434` | Genera 10 transacciones de ejemplo para el mes actual |
| `getFilteredTransactions(month, year)` | `index.html:~1391` | Filtra transactions por mes/año |
| `getCumulativeBalance(month, year)` | `index.html:~1415` | Calcula saldo acumulado de TODOS los meses anteriores |
| `addTransaction(data)` | `index.html:~1411` | Agrega transacción, guarda y refresca |
| `editTransaction(id, data)` | `index.html:~1417` | Edita transacción por ID, guarda y refresca |
| `deleteTransaction(id)` | `index.html:~1446` | Elimina con deshacer vía toast |
| `generateId()` | `index.html:~1291` | `crypto.randomUUID()` con fallback para `file://` |
| `isValidTx(tx)` | `index.html:~1983` | Valida estructura de una transacción |
| `importJSON(file)` | `index.html:~2090` | Importa respaldo JSON con validación de esquema completa |

### Firebase / Sync

| Función | Archivo:línea | Qué hace |
|---------|--------------|----------|
| `initFirebase()` | `index.html:~1190` | Inicializa Firebase Auth + Firestore. Si falla, modo offline |
| `subscribeFirestore()` | `index.html:~1220` | `onSnapshot` en tiempo real. No sobreescribe si hay `pendingSyncs` |
| `syncToFirestore()` | `index.html:~1258` | Sube transactions+budgets+categories a Firestore |
| `flushPendingSyncs()` | `index.html:~1274` | Vacía cola de syncs pendientes cuando Firebase se conecta |
| `safeRoomCode(code)` | `index.html:~1216` | `encodeURIComponent` para códigos de sala con caracteres especiales |
| `firstTimeSetup(ref, resolve)` | `index.html:~1244` | Crea el documento Firestore la primera vez que se abre una sala |
| `updateSyncStatus(connected)` | `index.html:~1315` | Actualiza indicador visual ● conectado / ○ desconectado |
| `openRoomModal()` / `closeRoomModal()` | `index.html:~1328` | Modal para ingresar/cambiar código de sala |

### Renderizado (UI)

| Función | Archivo:línea | Qué hace |
|---------|--------------|----------|
| `renderDailyBalance(animate)` | `index.html:~1639` | Tarjeta de saldo total con arrastre de meses anteriores |
| `renderDailyFeed()` | `index.html:~1685` | Feed del modo diario agrupado por fecha (Hoy/Ayer/fecha) |
| `renderDailyCategories()` | `index.html:~1598` | Categorías en fila horizontal deslizable |
| `renderSummary()` | `index.html:~1756` | Tarjetas de resumen (ingresos, gastos, saldo total) del modo análisis |
| `renderTable()` | `index.html:~1790` | Tabla de transacciones con búsqueda y filtros |
| `renderCharts()` | `index.html:~1828` | Gráfico dona (gastos por categoría) + barras (ingresos/gastos semanal) |
| `renderLineChart()` | `index.html:~1912` | Gráfico de línea: evolución del saldo 12 meses |
| `renderBudgets()` | `index.html:~1962` | Barras de progreso de presupuestos por categoría |
| `renderStats()` | `index.html:~2008` | Estadísticas (gasto diario, top categoría, vs mes anterior) |
| `renderCatManager()` | `index.html:~2276` | Lista de categorías con opciones editar/eliminar |
| `renderEmojiPicker(selected)` | `index.html:~1396` | Selector visual de emojis en cuadrícula |
| `setupCategoryDragScroll(container)` | `index.html:~1656` | Drag-to-scroll con mouse para categorías |
| `refreshAll(animate)` | `index.html:~2116` | Refresca TODAS las vistas |

### Inicialización (event listeners)

| Función | Archivo:línea | Qué hace |
|---------|--------------|----------|
| `init()` | `index.html:~2402` | Punto de entrada. Carga datos, Firebase, renderiza, registra eventos |
| `setupNavigation()` | `index.html:~2343` | Navegación meses, botones sala/modo/tema |
| `setupDailyMode()` | `index.html:~2359` | Toggles tipo/quién + agregar transacción diaria |
| `setupRoomModal()` | `index.html:~2436` | Formulario código de sala |
| `setupCategoryManager()` | `index.html:~2460` | CRUD de categorías |
| `setupAnalysisForm()` | `index.html:~2520` | Formularios análisis, edición, filtros, presupuestos, export/import |
| `registerServiceWorker()` | `index.html:~2610` | Registra SW + limpia caches viejas |

### Helpers

| Función | Archivo:línea | Qué hace |
|---------|--------------|----------|
| `$(id)` | `index.html:~1302` | Atajo para `document.getElementById(id)` |
| `esc(s)` | `index.html:~1304` | Escape HTML (XSS prevention) |
| `formatCOP(n)` | `index.html:~1306` | Formatea número a COP usando `Intl.NumberFormat` |
| `formatCOPShort(n)` | `index.html:~1308` | Versión corta (1.5M, 250K, etc.) |
| `sanitizeStr(str, maxLen)` | `index.html:~1332` | Elimina HTML + trunca |
| `validateAmount(amount)` | `index.html:~1340` | Valida monto positivo dentro del límite |
| `downloadBlob(blob, filename)` | `index.html:~1356` | Descarga un Blob como archivo |
| `getToday()` | `index.html:~1290` | `new Date()` fresco (evita desfase al pasar medianoche) |
| `showToast(msg, label, fn)` | `index.html:~1542` | Toast con opción de acción (ej. Deshacer) |
| `dismissAllToasts()` | `index.html:~1576` | Cierra todos los toasts activos |
| `getWhoLabel(who)` | `index.html:~1339` | Traduce 'yo'/'pareja'/'compartido' a 'David'/'Laura'/'Compartido 👥' |
| `loadTheme()` / `toggleTheme()` | `index.html:~2328` | Tema oscuro/claro con persistencia |
| `getCatNames(type)` | `index.html:~1150` | Lista de nombres de categorías por tipo |
| `getCatEmoji(name)` | `index.html:~1154` | Emoji de una categoría por nombre |

---

## Decisiones de diseño (para no re-trabajar)

### Por qué un solo HTML
- **Intencional:** cero toolchain, cero build, cero dependencias. Abres el archivo y funciona.
- Si se vuelve inmanejable (>3000 líneas), migrar a módulos JS separados cargados con `<script type="module">`.

### Por qué nombres fijos (David, Laura, Compartido 👥)
- Los perfiles configurables NO se sincronizaban entre dispositivos (cada uno veía sus propios nombres).
- Se hardcodearon para garantizar consistencia en la sala compartida.

### Por qué `encodeURIComponent` para códigos de sala
- Se intentó usar el código directamente como ID de documento Firestore.
- **Error:** si el código tiene `/` (ej. `M85/R5X`), Firestore interpreta las barras como subcolecciones.
- **Solución:** `encodeURIComponent()` codifica `/` como `%2F`, eliminando la ambigüedad.

### Por qué NO se usa `btoa` para códigos de sala
- `btoa` produce strings con `+` y `=`, que también son problemáticos en IDs Firestore.
- `encodeURIComponent` es más predecible y reversible.

### Por qué NO hay pruebas automatizadas
- App personal para 2-4 personas. El riesgo de bugs es bajo.
- Las funciones `isValidTx`, `isValidCategories`, `isValidBudgets`, `getCumulativeBalance`, `formatCOP` son las candidatas naturales si se añaden tests.
- Test manual: probar en `http://localhost:8080` antes de deploy.

### Por qué los datos de ejemplo se guardan en localStorage al cargar
- `loadData()` llama a `localStorage.setItem()` incluso con datos de ejemplo.
- Esto es intencional: asegura que la primera carga persista los datos de ejemplo.
- **Efecto secundario:** si se modifican los datos de ejemplo en el código, los usuarios existentes no verán los cambios (ya tienen datos guardados). Para forzar actualización, borrar localStorage.

### Por qué NO restringir la API key de Firebase por HTTP referrer
- **Error:** Se configuró la API key de Firebase con restricción por HTTP referrers (`https://presupuesto-cddeb.web.app/*`, `http://localhost:8080/*`) siguiendo buenas prácticas de seguridad.
- **Problema:** Firebase Auth (sign-in anónimo) rompe porque el `Referer` header no siempre coincide con el patrón configurado — el SDK carga dinámicamente scripts/iframes desde `identitytoolkit.googleapis.com` y la verificación del referrer falla, bloqueando el login anónimo.
- **Solución:** Dejar la API key sin restricción de aplicación ("None"). La seguridad real está en las Firebase Security Rules (solo auth anónimo puede leer/escribir), el CSP (bloquea scripts externos), y el XSS escaping en el código.
- **Lección:** Para apps que usan Firebase Auth con SDK cliente, NO restringir la API key por HTTP referrers. La API key Firebase es pública por diseño y no es un secreto. Usar Security Rules + App Check si se necesita más seguridad.

### Por qué probar en localhost antes de deploy
- **Lección:** Tras modificar la API key en Google Cloud Console y hacer deploy a Firebase, la app dejó de funcionar (Firebase Auth roto, sin acceso a salas). El error solo se detectó al probar en producción.
- **Regla:** Cualquier cambio en configuración externa (API keys, Firebase, CSP, reglas) debe probarse primero en localhost (`python3 -m http.server 8080`). Si el cambio rompe algo local, no hacer deploy.

---

| Bug | Síntoma | Solución | Commit |
|-----|---------|----------|--------|
| IDs numéricos de ejemplo vs string de `crypto.randomUUID()` | Botones editar/eliminar no funcionaban en datos de ejemplo | `String(t.id) === String(id)` | `9159038` |
| `crypto.randomUUID()` falla en `file://` | App rota al abrir desde archivo local | `generateId()` con try/catch + fallback | `9159038` |
| Código de sala con `/` rompe Firestore | "Invalid document reference" | `encodeURIComponent()` en `safeRoomCode()` | `a8f213b` |
| CSP bloquea JS inline | App no funciona (botones sin efecto) | `'unsafe-inline'` en `script-src` | `c3f4a39` |
| `init()` de 265 líneas | Difícil de mantener y depurar | Dividida en 7 funciones | `c620ba4` |
| `loadData()` sin try/catch | App explota si localStorage está corrupto | try/catch en ambos JSON.parse | `c620ba4` |
| Snapshot Firestore sobreescribe cambios locales | Se pierde la transacción que estabas escribiendo | Deep clone + skip si `pendingSyncs > 0` | `c620ba4` |
| Editar categoría no permitía cambiar tipo | El dropdown de tipo se ignoraba al guardar | Mover categoría entre arrays si cambia tipo | `d44d66e` |
| API key restringida por HTTP referrer bloquea Auth anónimo | Firebase Auth falla, no se puede acceder a la sala | Quitar restricción HTTP referrers de la API key | — |

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
- Solo permite scripts de `'self'` y Firebase CDN (`www.gstatic.com`)
- Conexiones solo a Firebase/Google APIs
- `'unsafe-inline'` necesario porque todo el JS está embebido en el HTML

### XSS prevention
- `esc(s)` escapa `&<>"'` en toda interpolación con `innerHTML`
- `sanitizeStr()` elimina etiquetas HTML en input del usuario
- CSP como capa adicional de defensa

### Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /rooms/{room} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.data.keys().hasAll(['transactions', 'budgets', 'categories'])
        && request.resource.data.transactions is list
        && request.resource.data.budgets is map
        && request.resource.data.categories is map
        && request.resource.data.transactions.size() <= 10000;
    }
  }
}
```
- Solo usuarios autenticados anónimamente pueden leer/escribir
- Validación de tipo en servidor (transactions debe ser array, etc.)
- Límite de 10.000 transacciones por sala

---

## Firebase: costos y límites

### Lo que NO cuesta
- **Lecturas de Firestore** desde el snapshot en tiempo real
- **Escrituras** de transacciones individuales
- **Auth** anónimo
- **Hosting** (plan Spark: 10GB almacenamiento, 360MB/día ancho de banda)
- **Cálculo de saldo acumulado** (es 100% local en el navegador)

### Límites del plan gratuito (Spark)
| Recurso | Límite diario |
|---------|--------------|
| Firestore lecturas | 50.000 |
| Firestore escrituras | 20.000 |
| Firestore eliminaciones | 20.000 |
| Firestore almacenamiento | 1 GiB total |
| Auth (anónimo) | Ilimitado |
| Hosting ancho de banda | 360 MB/día |
| Hosting almacenamiento | 10 GB |

### Cuándo podrías pagar
- Si la app crece a +50 usuarios activos con cientos de transacciones diarias.
- Con 2-4 personas, es virtualmente imposible alcanzar los límites gratuitos.

### Cuentas anónimas: limpieza automática
Google elimina cuentas anónimas inactivas por **30+ días**. La data en Firestore **no se pierde** — al volver a abrir la app, se crea una nueva cuenta anónima y se accede a la misma sala (con el mismo código). No hay pérdida de datos.

---

## Convenciones de código

### Nombres
- **IDs de elementos HTML:** `camelCase` con prefijo descriptivo (ej. `txForm`, `btnAgregar`, `dailyBalance`)
- **Variables JS:** `camelCase`
- **Constantes:** `UPPER_SNAKE_CASE` (ej. `STORAGE_KEY`, `MAX_AMOUNT`)
- **Funciones:** `camelCase`, verbos descriptivos (ej. `loadData`, `renderSummary`, `syncToFirestore`)
- **Selectores DOM:** función helper `$(id)` = `document.getElementById(id)`

### Estilo
- **Indentación:** 2 espacios
- **Comillas:** simples en JS, dobles en HTML/CSS
- **Punto y coma:** obligatorio
- **Eventos:** `addEventListener`, NO atributos HTML `onclick`
- **CSS:** variables CSS para tema, clases BEM-lite (ej. `badge-ingreso`, `btn-primary`, `feed-item`)

### Constantes definidas
```js
MAX_AMOUNT = 999999999;
MAX_DESC_LENGTH = 100;
ANIMATION_STEPS = 20;
ANIMATION_INTERVAL_MS = 20;
CHART_COLORS = ['#00d4aa','#ff4d6d','#f5c842','#4f8ef7', ...];
FIRESTORE_COLLECTION = 'rooms';
EMOJIS = ['🍕','🥩','🥗', ...];  // ~160 emojis para el picker
```

### Móneda
```js
const formatCOP = n => new Intl.NumberFormat('es-CO', {
  style: 'currency', currency: 'COP',
  minimumFractionDigits: 0, maximumFractionDigits: 0
}).format(n);
```

---

## Limitaciones conocidas (no invertir tiempo aquí)

| Limitación | Por qué no importa |
|-----------|-------------------|
| Un solo documento Firestore (límite 1MB) | Con ~100 transacciones/mes, tomaría ~10 años alcanzar 1MB |
| Sin paginación en tabla | Con <1000 transacciones totales, el DOM se renderiza en <100ms |
| Sin tests automatizados | App personal, 2-4 usuarios. El riesgo es mínimo |
| Sin rate limiting en Firestore | Con 2-4 usuarios, jamás se alcanza el límite de escrituras |
| Sin sesión/expiración | Las cuentas anónimas no tienen sesión; la app se autentica sola al abrir |
| Sin variables de entorno | Sin build tools no hay `process.env`. Firebase API key es pública por diseño |
| Sin separación en archivos múltiples | Archivo único fue una decisión deliberada para simplicidad offline |

---

## FAQ para agentes (no reprocesar)

**P: ¿Por qué no funciona File → Open en el navegador?**
R: `crypto.randomUUID()` requiere un contexto seguro. Usar `python3 -m http.server 8080`.

**P: ¿Por qué los botones de editar/eliminar no responden?**
R: Posible CSP bloqueando JS inline (ver `'unsafe-inline'` en `script-src`). O IDs mixtos string/number sin `String(t.id) === String(id)`.

**P: ¿Por qué no se ve la sala después de cambiar el código?**
R: El código se guarda en localStorage (`finanzas_room`). Si tiene caracteres especiales como `/`, verificar `encodeURIComponent`.

**P: ¿Por qué el saldo acumulado no aparece?**
R: Solo aparece si hay transacciones en MESES ANTERIORES al actual. No confundir con el neto del mes.

**P: ¿Por qué al editar una categoría no cambia el tipo?**
R: Bug corregido en v1.1.0. Si el código tiene el bug, buscar en `setupCategoryManager()` que `categoriesData[origType].splice(idx, 1)` y `categoriesData[type].push(...)` se ejecuten cuando `origType !== type`.

**P: ¿Cómo cambio el código de sala?**
R: Consola del navegador → `localStorage.removeItem('finanzas_room'); location.reload();`

**P: ¿Los datos de Firebase se borran si nadie usa la app por un mes?**
R: No. La data en Firestore persiste. Solo la cuenta anónima se limpia, pero al volver se crea una nueva y se accede a la misma sala.

---

## Próximas mejoras sugeridas (pendientes)

- [x] ~~Categorías personalizables~~
- [x] ~~Sincronización Firebase~~
- [x] ~~Firebase Hosting~~
- [x] ~~Saldo acumulado entre meses~~
- [x] ~~Emoji picker~~
- [ ] **Layout análisis responsive** — mejorar distribución en pantallas muy pequeñas
- [ ] **Alertas de presupuesto** — notificación al superar 80%/100%
- [ ] **Exportar reporte anual** (PDF o HTML)
- [ ] **Paginación/virtual scroll** en tabla de transacciones
- [ ] **Gráfica de evolución con saldo acumulado** (en vez de neto mensual)
- [ ] **Modo oscuro automático** según preferencia del sistema (`prefers-color-scheme`)

---

## Tags (versiones)

| Tag | Fecha | Descripción |
|-----|-------|-------------|
| `v1.0.0` | 2026-06-07 | Versión base funcional: CSP, XSS, saldo acumulado, Firebase |
| `v1.1.0` | 2026-06-08 | Scroll horizontal categorías, emoji picker, bugfix tipo categoría, solo editar en diario |
