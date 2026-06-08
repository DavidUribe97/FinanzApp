# FinanzApp — App de Gastos Mensuales

App web 100% offline para gestionar ingresos y gastos personales. Single-page application en un solo HTML con JavaScript vanilla, CSS y Chart.js.

## Estructura del proyecto

```
Presupuesto/
├── index.html        # App completa (HTML + CSS + JS) (~2455 líneas)
├── chart.min.js      # Chart.js v4.4.7 local (202KB)
├── manifest.json     # PWA manifest para instalación
├── sw.js             # Service Worker (caching offline)
├── icon-192.svg      # Icono PWA 192x192
├── icon-512.svg      # Icono PWA 512x512
├── firebase.json     # Config Firebase Hosting (ignore reglas)
├── .gitignore        # Archivos ignorados por Git
└── LEEME.md          # Este archivo
```

## Funcionalidades

- Registrar ingresos y gastos con categorías
- Resumen mensual con tarjetas (ingresos, gastos, saldo, conteo)
- Selector de mes/año
- Tabla de transacciones con búsqueda y filtros (tipo, texto)
- Editar y eliminar transacciones (con deshacer)
- Gráfica de dona (gastos por categoría)
- Gráfica de barras (ingresos vs gastos semanal)
- Gráfica de línea (evolución del saldo 12 meses)
- Presupuestos por categoría con barra de progreso
- Estadísticas (gasto diario, categoría top, vs mes anterior)
- Exportar a CSV y respaldo JSON
- Importar respaldo JSON
- Modo oscuro/claro
- 10 transacciones de ejemplo precargadas
- **Saldo acumulado entre meses** (arrastra deuda/saldo a favor)
- **Seguridad:** CSP, XSS sanitization, validación de esquema en import JSON
- **Código de sala mínimo 6 caracteres** + `encodeURIComponent` para caracteres especiales
- **Offline total** (sin dependencias externas)
- **PWA** (instalable desde el navegador)

## Stack técnico

| Componente | Detalle |
|---|---|
| HTML | Un solo archivo (`index.html`) |
| CSS | Variables CSS, tema oscuro/claro, responsive, animaciones |
| JS | JavaScript vanilla, sin frameworks |
| Charts | Chart.js v4.4.7 (local, CDN descargado a `chart.min.js`) |
| Persistencia | localStorage (`finanzas_data`, `finanzas_budgets`, `finanzas_theme`) |
| Fuentes | System font stack (sin Google Fonts para offline) |
| PWA | `manifest.json` + `sw.js` para instalación y cache offline |

## Cómo usar

### Local
Abrir `index.html` en cualquier navegador. Los datos se guardan automáticamente en localStorage.

### Online (Firebase Hosting)
La app está desplegada en:
[https://presupuesto-cddeb.web.app](https://presupuesto-cddeb.web.app)

Para actualizar:
```bash
cd /home/david/Presupuesto
firebase deploy --only hosting
```

## Uso diario

1. Abrir `index.html` en el teléfono
2. Modo diario: tocar categoría → escribir monto → agregar
3. Botón 📊 para ver análisis completo (gráficos, presupuestos, estadísticas)
4. Navegar entre meses con ◀ ▶

## Firebase — servicios usados

### Firestore (base de datos en tiempo real)
- SDKs cargados vía CDN (compat, sin build tools)
- Anonymous Auth automático al iniciar
- Código de sala compartida (se pide una vez, se guarda en localStorage)
- `onSnapshot` en tiempo real para sync bidireccional
- Fallback offline: si Firebase no está disponible, la app funciona igual con localStorage

### Hosting (despliegue web)
- Hosteado en Firebase Hosting → [presupuesto-cddeb.web.app](https://presupuesto-cddeb.web.app)
- `firebase.json` con reglas `ignore` para no subir archivos innecesarios
- Un solo comando para actualizar: `firebase deploy --only hosting`

### Para cambiar el código de sala
Abre la consola del navegador (F12) y ejecuta:
```js
localStorage.removeItem('finanzas_room'); location.reload();
```

### Notas
- Firestore gratis: **1 GiB + 50K lecturas/escrituras/eliminaciones por día**
- Cada transacción lleva `who` ("yo"/"pareja"/"compartido") para identificar quién la hizo
- Los perfiles (nombres) se guardan solo en localStorage (cada usuario personaliza los suyos)

## Cambios realizados (historial de mejoras)

### 1. Multiusuario — Quién gasta/ingresa
**Archivo:** `index.html`  
**Qué:** Cada transacción tiene campo `who` (`"yo"`, `"pareja"`, `"compartido"`). Selector de 3 botones en modo diario. Columna "Quién" en tabla de análisis. Filtro por persona. Estadísticas de gastos por persona.  
**Por qué:** Para que ambos usen la app y sepan quién gastó qué. También para analizar gastos individuales vs compartidos. Cuando se agregue Firebase, esto permite sincronizar entre dos teléfonos identificando a cada usuario.

### 2. Perfil configurable
**Archivo:** `index.html`  
**Qué:** Modal de bienvenida al primer uso pidiendo "Tu nombre" y "Nombre de tu pareja". Botón ⚙️ en el header para editarlos. Se almacena en `localStorage` (`finanzas_profile`).  
**Por qué:** Los nombres se muestran en toda la app (feed, tabla, estadísticas) para identificar quién hace cada transacción.

### 3. Dos modos: Diario + Análisis
**Archivo:** `index.html`  
**Qué:** Se agregó modo diario (`#dailyView`) y modo análisis (`#analysisView`). Se cambia con botón 📊/◀ en el header. El modo se persiste en localStorage (`finanzas_mode`).  
**Por qué:** El modo diario es para uso cotidiano en el teléfono (rápido, sin distracciones). El análisis mantiene toda la funcionalidad anterior. Misma data, dos vistas.

### 2. Modo diario — Diseño mobile-first
**Archivo:** `index.html`  
**Qué:** 
- Tarjeta de saldo grande (centrada, fuente 38px, color verde/rojo según saldo)
- Ingresos/gastos mini debajo del saldo
- Toggle Gasto/Ingreso con colores
- Grilla de categorías con emojis (4 columnas, tap targets grandes)
- Input de monto grande con placeholder "$ monto"
- Botón ✓ para agregar
- Feed tipo chat agrupado por fecha (Hoy, Ayer, fecha)
- Cada feed-item: emoji, categoría, monto (+/-), botón ✕ para eliminar
- Sin confirmación al eliminar (undo vía toast)
- Descripción opcional colapsable
- Navegación de meses con ◀ ▶ en la parte superior
**Por qué:** Agregar un gasto requiere 3 toques: categoría → monto → ✓. Sin formularios largos, sin selects, sin scroll. Ideal para el día a día.

### 3. Modo análisis preservado
**Archivo:** `index.html`  
**Qué:** Todo lo anterior (gráficos, tabla, presupuestos, estadísticas, exportación) está intacto en `#analysisView`.  
**Por qué:** Para analizar los datos en PC con calma. Separado del uso diario.

### 4. Offline total — CDN reemplazado por archivo local
**Archivos:** `index.html` (líneas 7-9), `chart.min.js` (nuevo)  
**Qué:** Se eliminó `<link>` a Google Fonts y `<script>` a Chart.js CDN. Se descargó Chart.js v4.4.7 como `chart.min.js` local. Se reemplazó `'DM Sans'` por system font stack y `'DM Mono'` por `'SF Mono', 'Cascadia Code', 'Consolas', 'Courier New', monospace`.  
**Por qué:** La app ahora funciona 100% sin internet. Google Fonts requiere conexión para cargar; Chart.js desde CDN también. System fonts son instantáneas, no requieren descarga.

### 2. IDs únicos seguros
**Archivo:** `index.html` (líneas 738-749, 1238)  
**Qué:** Los IDs de transacciones de ejemplo usan contador incremental (`let idCounter = Date.now()`). Las nuevas transacciones usan `crypto.randomUUID()`.  
**Por qué:** `Date.now()` puede colisionar si se agregan 2 transacciones en el mismo milisegundo. `crypto.randomUUID()` garantiza unicidad global.

### 3. Generador de fechas de ejemplo mejorado
**Archivo:** `index.html` (líneas 731-734)  
**Qué:** Se renombró `offset` → `daysAgo` y se eliminó la variable `day` no usada.  
**Por qué:** El nombre `offset` era confuso; `daysAgo` describe mejor que los días hacia atrás pueden generar fechas del mes anterior. Mejor legibilidad.

### 4. Validación de entrada
**Archivo:** `index.html` (líneas 1234, 1237-1238, 1301, 1304-1305)  
**Qué:** Se agregó límite máximo de $999,999,999. Se sanitiza la descripción eliminando etiquetas HTML (`<[^>]*>`) y limitando a 100 caracteres.  
**Por qué:** Evita valores desbordados, inyección HTML, y descripciones excesivamente largas.

### 5. Limpieza de deshacer al cambiar filtros
**Archivo:** `index.html` (líneas 692, 830-832, 1249-1250)  
**Qué:** Se eliminó variable `undoTimeout` no usada. Se agregó función `dismissAllToasts()`. Al cambiar búsqueda o filtro de tipo, se descartan todos los toasts y se limpia `undoData`.  
**Por qué:** Si el usuario elimina una transacción, aparece "Deshacer". Si cambia el filtro, el toast ya no es relevante. Se limpia para evitar restaurar datos en contexto incorrecto.

### 6. PWA (Progressive Web App)
**Archivos:** `manifest.json`, `sw.js`, `icon-192.svg`, `icon-512.svg` (nuevos), `index.html` (líneas 6-7, 1320-1322)  
**Qué:** Se agregó manifest con nombre, iconos SVG, tema oscuro. Service Worker que cachea `index.html`, `chart.min.js`, `manifest.json`. Se registra el SW al iniciar.  
**Por qué:** Permite instalar la app desde el navegador como si fuera nativa, y funciona offline incluso en recarga.

## Convenciones de código

- **ID de elementos**: `camelCase` con prefijo (ej. `txForm`, `btnAgregar`)
- **Variables**: `camelCase`
- **Constantes**: `UPPER_SNAKE_CASE` (ej. `CATEGORIES`, `STORAGE_KEY`)
- **Funciones**: `camelCase`, verbos descriptivos (ej. `loadData`, `renderSummary`)
- **Selectores DOM**: función helper `$(id)` = `document.getElementById(id)`
- **Eventos**: `addEventListener`, no atributos HTML `onclick`
- **CSS**: variables CSS para tema, clases BEM-lite (ej. `badge-ingreso`, `btn-primary`)
- **Moneda**: COP (pesos colombianos), formato con `Intl.NumberFormat('es-CO')`
- **Persistencia**: localStorage con prefijo `finanzas_`

## Puntos clave para continuar

- La app es un **solo archivo HTML** con JS embebido. Mantenerlo así o migrar a módulos si crece mucho.
- Los datos de ejemplo se generan en `generateSampleData()` y se cargan solo si localStorage está vacío.
- Los gráficos se destruyen y recrean en cada `refresh()`. Si hay muchas transacciones, considerar virtual scrolling.
- El Service Worker cachea solo assets estáticos. Datos siempre van a localStorage.
- Para añadir categorías, editar `CATEGORIES` al inicio del script.
- Para cambiar moneda, modificar `formatCOP()`.

## Próximas mejoras sugeridas

- [x] Categorías personalizables por el usuario
- [x] Sincronización Firebase/multi-dispositivo
- [x] Firebase Hosting (despliegue online)
- [ ] Paginación o virtual scroll en tabla de transacciones
- [ ] Reportes anuales (PDF)
- [ ] Alertas de presupuesto (notificación)
- [ ] Tests automatizados

### 4. Perfil sin molestias
**Qué:** El modal de perfiles ya no se abre automáticamente al iniciar. Solo se accede desde el botón ⚙️ en el header.  
**Por qué:** Si ya configuraste los nombres una vez, no necesitas verlo cada vez que abres la app.

### 5. Neto diario en el feed
**Archivo:** `index.html` (función `renderDailyFeed`)  
**Qué:** Cada encabezado de día (Hoy, Ayer, fecha) ahora muestra el neto del día, ej: `Hoy +$15K` o `Ayer -$35K`. En verde si es positivo, rojo si negativo.  
**Por qué:** Ves de un vistazo cómo va el saldo cada día sin hacer cuentas mentales.

### 6. Editar desde el feed diario
**Archivo:** `index.html` (feed items + event listeners)  
**Qué:** Cada transacción en el feed ahora tiene botón ✏️ al lado del ✕. Al tocarlo, abre el modal de edición (cambiando a modo análisis automáticamente).  
**Por qué:** Si te equivocas al agregar un gasto, puedes corregirlo sin tener que ir al modo análisis manualmente.

### 7. Categorías dinámicas (editar desde análisis)
**Archivo:** `index.html` (panel `#catManagerPanel`, funciones `loadCategories`/`saveCategories`/`getCatNames`/`getCatEmoji`)  
**Qué:** Las categorías ya no son constantes hardcodeadas. Se almacenan en localStorage (`finanzas_categories`). En el modo análisis hay un panel "Gestionar categorías" donde puedes:
- **Añadir** nueva categoría (tipo + nombre + emoji)
- **Editar** nombre o emoji de categorías existentes
- **Eliminar** categorías (transacciones existentes no se modifican)
- **Restaurar** las categorías por defecto
- Las categorías se incluyen en el backup JSON (export/import)
- Al editar el nombre de una categoría, todas las transacciones con ese nombre se actualizan automáticamente
**Por qué:** Para personalizar las categorías según tus gastos reales sin tocar código.

### 8. Recordar última categoría
**Archivo:** `index.html` (`renderDailyCategories`, `saveLastCategory`, `loadLastCategory`)  
**Qué:** Al agregar una transacción, se guarda la categoría usada en localStorage (`finanzas_last_cat`). La próxima vez que entres al mismo tipo (Gasto/Ingreso), queda preseleccionada.  
**Por qué:** Si siempre agregas "Transporte" o "Alimentación", ahorras un toque cada vez.

### 9. Bugfix: botón editar en tabla usaba dataset incorrecto
**Archivo:** `index.html` (línea 1551)  
**Qué:** Se cambió `btn.dataset.del` → `btn.dataset.edit` en el event listener del botón editar de la tabla de análisis.  
**Por qué:** El botón editar abría la función de eliminar por usar el dataset equivocado.

### 10. `today` dinámico (corrige desfase al pasar medianoche)
**Archivo:** `index.html`  
**Qué:** Se reemplazó `const today = new Date()` (fijo al cargar) por `function getToday() { return new Date(); }`. Todas las referencias a `today` en funciones de renderizado (`renderDailyFeed`, `renderStats`, `addDailyTx`) ahora llaman a `getToday()` para obtener la fecha actual en cada render.  
**Por qué:** Si la app quedaba abierta pasando la medianoche, "Hoy" y "Ayer" se desfasaban. Ahora siempre se calcula fresco.

### 11. Animación de saldo al agregar/editar/eliminar
**Archivo:** `index.html` (`renderDailyBalance`)  
**Qué:** `renderDailyBalance` acepta un parámetro `animate`. Cuando es `true`, anima el contador del saldo desde el valor anterior al nuevo en 20 pasos (~400ms). `refreshAll()` pasa `animate=true` a `refreshDaily()`.  
**Por qué:** Feedback visual inmediato al cambiar el saldo sin ser brusco.

### 12. Tooltip en gráfica de dona con desglose por persona
**Archivo:** `index.html` (`renderCharts`)  
**Qué:** Se agregó un `whoMap` que acumula montos por categoría y por persona (`yo`, `pareja`, `compartido`). El tooltip de la gráfica de dona ahora muestra, debajo del total de cada categoría, cuánto puso cada quién. Usa los nombres del perfil.  
**Por qué:** Para ver no solo cuánto se gastó en cada categoría, sino quién pagó.

### 13. Scroll en gestor de categorías
**Archivo:** `index.html` (CSS)  
**Qué:** Se agregó `#catManagerList { max-height: 320px; overflow-y: auto; }`  
**Por qué:** Con muchas categorías, el panel no se desbordaba verticalmente de forma controlada.

### 14. Keyboard "Done" en input de monto
**Archivo:** `index.html` (línea 826)  
**Qué:** Se agregó `enterkeyhint="done"` al `#dailyAmount`.  
**Por qué:** En móvil, el teclado numérico mostraba "Go" como acción; ahora muestra "Done" (más coherente con la acción de confirmar).

### 15. Loading state en importación JSON
**Archivo:** `index.html` (`importJSON`)  
**Qué:** Al iniciar la importación se muestra un toast "Importando…". Al terminar (éxito, error, o cancelación) se limpia con `dismissAllToasts()`.  
**Por qué:** El usuario ve feedback inmediato de que la operación empezó, especialmente con archivos grandes.

### 16. CSV export: preserva etiqueta "Compartido" con emoji
**Archivo:** `index.html` (`exportCSV`)  
**Qué:** Se eliminó el `.replace(/\s*👥$/, '')` que quitaba el emoji de "Compartido 👥" en el CSV exportado.  
**Por qué:** El emoji es parte de la información. Quitarlo perdía el detalle visual de quién participó.

### 17. word-break corregido
**Archivo:** `index.html` (CSS línea 139)  
**Qué:** Se cambió `word-break: break-all` → `word-break: break-word; overflow-wrap: break-word` en `.balance-amount`.  
**Por qué:** `break-all` rompía palabras a media letra con números muy grandes.

### 18. Firebase + sincronización en tiempo real
**Archivo:** `index.html`  
**Qué:** Integración completa con Firebase:
- SDKs cargados vía CDN (`firebase-app-compat`, `firebase-auth-compat`, `firebase-firestore-compat`)
- Anonymous Auth automático al iniciar la app
- Sistema de sala con código compartido (se pide al primer inicio, se guarda en `localStorage`)
- `onSnapshot` en Firestore que mantiene ambos dispositivos sincronizados en tiempo real
- `saveData()`/`saveBudgets()`/`saveCategories()` modificados para escribir también en Firestore
- `syncToFirestore()` que sincroniza todo (transactions + budgets + categories) en un solo doc
- Si Firebase no está disponible (offline), la app funciona igual con localStorage
- Las actualizaciones remotas no activan la animación de saldo para evitar parpadeos
**Por qué:** Sincronización multi-dispositivo sin necesidad de servidores propios, usando el free tier de Firebase.

## Firebase config
```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBI4ZQJU2N7Tqht9eCLt1YXzMEbpV6-L7Q",
  authDomain: "presupuesto-cddeb.firebaseapp.com",
  projectId: "presupuesto-cddeb",
  storageBucket: "presupuesto-cddeb.firebasestorage.app",
  messagingSenderId: "561524123795",
  appId: "1:561524123795:web:89df1890188e42aef98566"
};
```

### Cómo cambiar el código de sala
- El código de sala se pide una sola vez al iniciar la app
- Para cambiarlo: abre la consola del navegador (F12) y ejecuta:
  ```js
  localStorage.removeItem('finanzas_room'); location.reload();
  ```

### Probar localmente (sin deploy)
```bash
cd /home/david/Presupuesto && python3 -m http.server 8080
```
Luego abre `http://localhost:8080` en el navegador. Usar `file://` directo no funciona bien porque `crypto.randomUUID()` requiere un contexto seguro (HTTPS o localhost).

---

## 19. Firebase Hosting + Git
**Archivos:** `firebase.json`, `.gitignore` (nuevos), `manifest.json` (corregido)  
**Qué:**
- Se creó `firebase.json` con `public: "."` y `ignore` para excluir `node_modules/`, archivos ocultos, y `LEEME.md`
- Se corrigió `manifest.json` para que apunte a los iconos `.svg` en lugar de `.png`
- Se instaló `firebase-tools` y se desplegó la app en Firebase Hosting
- Se inicializó repositorio Git con `.gitignore`
- URL pública: [https://presupuesto-cddeb.web.app](https://presupuesto-cddeb.web.app)
**Por qué:** La app ahora está disponible online. Para actualizar solo hay que ejecutar `firebase deploy --only hosting`.

## 20. Bugfixes — Comparación de IDs, randomUUID, SW cache
**Archivos:** `index.html`, `sw.js`  
**Qué:**
- Se normalizaron las comparaciones de IDs con `String(t.id) === String(id)` para que funcionen tanto con IDs numéricos (datos de ejemplo) como string (`crypto.randomUUID()`)
- Se creó `generateId()` como fallback cuando `crypto.randomUUID()` no está disponible (protocolo `file://`)
- Se agregaron los iconos SVG al cache del Service Worker
**Por qué:** Los botones de editar/eliminar no funcionaban porque `dataset` devuelve strings y los IDs de ejemplo eran números (`===` fallaba). `crypto.randomUUID()` lanza excepción en `file://`.

## 21. Nombres fijos + Sala visible + Estado de sync
**Archivos:** `index.html`  
**Qué:**
- Se eliminó el sistema de perfiles (modal y configuración). Los nombres ahora son fijos: **David**, **Laura**, **Compartido 👥**
- Se agregó indicador de sincronización en el header: ● conectado / ○ desconectado
- El botón de ajustes ahora muestra la sala actual y permite cambiar el código
- Se agregaron toasts de error cuando Firebase falla
**Por qué:** Los perfiles no se sincronizaban entre dispositivos, causando confusión. Ahora los nombres son consistentes. El indicador de sync permite saber si los cambios se están guardando online.

## 22. Seguridad: CSP, XSS sanitization, validación de esquema en importación

**Archivos:** `index.html`, `firestore.rules`
**Qué:**
- Se agregó meta tag **CSP** (Content-Security-Policy) restringiendo scripts solo a `'self'` y `www.gstatic.com`, y conexiones solo a Firebase/Google APIs
- Se creó función `esc()` para escapar HTML en toda interpolación con `innerHTML` (categorías, descripciones, toasts)
- Se sanitizan nombres de categorías y emojis al guardar con `.replace(/<[^>]*>/g, '')`
- Se agregaron funciones `isValidTx()`, `isValidCategories()`, `isValidBudgets()` que validan el esquema completo antes de importar JSON
- Se actualizaron las **reglas de Firestore** para validar que:
  - `transactions` sea un array
  - `budgets` sea un map
  - `categories` sea un map
  - `transactions.size() <= 10000`
- El formulario de código de sala exige mínimo **6 caracteres**
**Por qué:** Evitar inyección XSS, datos corruptos en importación, y escrituras maliciosas a Firestore.

## 23. Arrastre de saldo entre meses (saldo acumulado)

**Archivo:** `index.html`
**Qué:**
- Se agregó función `getCumulativeBalance(month, year)` que suma el neto (ingresos - gastos) de **todos los meses anteriores** al mes actual
- La tarjeta de "Saldo total" en el dashboard ahora muestra: `saldo anterior + (ingresos - gastos del mes)`
- Si hay deuda o saldo a favor del mes anterior, se muestra una línea adicional:
  - **"Deuda mes anterior: -$X"** en rojo
  - **"Saldo a favor mes anterior: +$X"** en verde
- Si no hay arrastre, la línea no se muestra
- La tarjeta "Saldo total" en el modo análisis también refleja el acumulado
- **No genera lecturas/escrituras extras a Firestore** — el cálculo es 100% local sobre los datos ya cargados en memoria
**Por qué:** Para ver la situación financiera real acumulada, no solo el neto del mes aislado.

## 25. Refactorización — código base mejorado

**Archivo:** `index.html`

**Qué se mejoró:**

### ✅ DRY — código repetido extraído a funciones
- `sanitizeStr(str, maxLen)` — reemplaza 5 apariciones de `.replace(/<[^>]*>/g, '').slice(0, 100)`
- `validateAmount(amount)` — reemplaza 3 apariciones de la misma validación de monto
- `downloadBlob(blob, filename)` — reemplaza el patrón `Blob → URL.createObjectURL → a.click() → revoke` en `exportCSV` y `exportJSON`

### ✅ Manejo de errores
- `loadData()` ahora envuelve `JSON.parse` en `try/catch` — si localStorage está corrupto, genera datos de ejemplo en lugar de romper la app
- `showToast()` verifica que el contenedor exista antes de usarlo

### ✅ Protección de datos en sync remoto
- `subscribeFirestore()` ya no reemplaza ciegamente `transactions` cuando hay `pendingSyncs` pendientes
- Los datos del snapshot se clonan con `JSON.parse(JSON.stringify(...))` para evitar mutaciones por referencia

### ✅ init() dividido en 7 funciones
- `setupNavigation()` — navegación entre meses, botones sala/modo/tema
- `setupDailyMode()` — toggle gasto/ingreso/quién + agregar transacción
- `setupRoomModal()` — formulario de código de sala
- `setupCategoryManager()` — CRUD de categorías
- `setupAnalysisForm()` — formulario de análisis, tabla, filtros, presupuestos, export/import, edición
- `registerServiceWorker()` — registro del SW

### ✅ Constantes nombradas
- `MAX_AMOUNT = 999999999` (antes número mágico repetido 3 veces)
- `MAX_DESC_LENGTH = 100`
- `ANIMATION_STEPS = 20` y `ANIMATION_INTERVAL_MS = 20` (antes números mágicos en renderDailyBalance)
- `CHART_COLORS` (antes array inline en renderCharts)
- `FIRESTORE_COLLECTION = 'rooms'` (antes string repetido)

### ✅ JSDoc añadido
`loadData`, `saveData`, `saveBudgets`, `getFilteredTransactions`, `getCumulativeBalance`, `generateSampleData`, `renderDailyBalance`, `refreshAll`, `importJSON`, `isValidTx`, `initFirebase`, `syncToFirestore`

**Por qué:** Código más mantenible, legible y tolerante a errores sin cambiar el comportamiento externo.

## 26. Refinamiento UI/UX + Bugfix

**Archivo:** `index.html`

**Qué:**
- **Modo diario:** se eliminó el botón ✕ (eliminar). Solo queda ✏️ (editar). Eliminar solo desde modo análisis.
- **Editar desde modo diario:** ya no cambia a modo análisis después de editar.
- **Categorías en modo diario:** ahora son una fila horizontal deslizable (touch + drag con mouse), sin scrollbar visible. Se agregó `setupCategoryDragScroll()` para arrastrar con click sostenido.
- **Selector de emojis:** reemplazó el input de texto por una cuadrícula de 8 columnas con ~160 emojis predefinidos (incluye streaming, transporte, salud, etc.). Al seleccionar un emoji, el picker se cierra automáticamente.
- **Bugfix categorías:** al editar una categoría y cambiar su tipo (Gasto ↔ Ingreso), ahora la categoría se mueve al array correcto. Antes se quedaba pegada al tipo original ignorando el cambio.
- **Emoji picker:** se oculta al seleccionar, se muestra al abrir el formulario. La cuadrícula filtra visualmente sin barra de scroll.

**Por qué:** Mejora de experiencia de uso diario y corrección de bug que impedía cambiar el tipo de una categoría existente.

## 24. GitHub — control de versiones

**Archivos:** `.gitignore`
**Qué:**
- Se creó repositorio Git con historial completo (6 commits hasta v1.0.0)
- Se agregó remote a GitHub: `https://github.com/DavidUribe97/FinanzApp`
- Se subió la rama `master` y el tag `v1.0.0` (versión base funcional)
- El remote URL se mantiene limpio (sin token), la autenticación se hizo con token de acceso personal (classic) con permiso `repo`
**Por qué:** Backup del código, historial de cambios, y posibilidad de colaborar.
