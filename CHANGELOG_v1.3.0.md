# v1.3.0 — Miembros editables, clave de salas, identidad visual por miembro

> ⚠️ **VERSIÓN EN PRUEBAS - NO DESPLEGAR A PRODUCCIÓN**
> 
> Esta versión está en la rama `v1.3.0-beta` y **NO está desplegada en Firebase Hosting**.
> La versión estable en producción es `v1.2.1` (rama `master`).
> 
> **Para probar localmente:**
> ```bash
> git checkout v1.3.0-beta
> python3 -m http.server 8080
> # Abrir http://localhost:8080
> ```

Versión **local** (sin deploy). Rama `v1.3.0-beta`, commit `de41ca5`.

> Este documento detalla los cambios de v1.3.0 respecto a v1.2.1. Cada sección explica **qué** cambió,
> **por qué** y **cómo** está implementado, para que un agente (o tú mismo) pueda retomar el trabajo
> sin reprocesar. Sigue el mismo formato del `LEEME.md` oficial.

---

## 1. Sistema de miembros editables

### Qué cambió
Antes: los nombres de los perfiles estaban hardcodeados como `David` y `Laura` (y `Compartido 👥`)
en la función `getWhoLabel()`. No había forma de cambiarlos sin editar el código.

Ahora: los miembros son dinámicos. Vienen con valores por defecto (`Él`, `Ella`, `Compartido 👥`)
pero se pueden renombrar, agregar nuevos y eliminar desde un panel en la vista análisis.

### Por qué
- La app es para uso personal, no solo para David y Laura.
- El usuario pidió poder cambiar los nombres sin editar código.
- También pidió poder agregar más personas (hijos, roomies, etc.).

### Cómo funciona

#### Almacenamiento
- `const MEMBERS_KEY = 'finanzas_members'` en `index.html:1417`.
- Se guarda en localStorage como `JSON.stringify(members)` vía `saveMembers()` (`:1795`).
- Se sincroniza a Firestore como parte del documento de la sala (campo `members` en `:1532`).

#### Valores por defecto
```js
const DEFAULT_MEMBERS = { yo: 'Él', pareja: 'Ella', compartido: 'Compartido 👥' };
```
(`index.html:1574`)

- `yo` → primer perfil (antes David/Él)
- `pareja` → segundo perfil (antes Laura/Ella)
- `compartido` → gastos compartidos
- Los IDs `yo`, `pareja`, `compartido` son **fijos** y nunca cambian (retrocompatibilidad total).
- Nuevos miembros obtienen IDs auto-generados: `m4`, `m5`, `m6`... (`:2796–2800`).

#### Funciones CRUD
| Función | Línea | Qué hace |
|---------|-------|----------|
| `loadMembers()` | `:1786` | Carga miembros desde localStorage; fallback a defaults |
| `saveMembers()` | `:1795` | Guarda en localStorage y dispara `syncToFirestore()` |
| `getMemberIds()` | `:1800` | Retorna `Object.keys(members)` |
| `getMemberList()` | `:1804` | Retorna `[{id, name}, ...]` |
| `getWhoLabel(who)` | `:1808` | Traduce ID a nombre visible |
| `setupMembersPanel()` | `:2780` | Setup del panel CRUD (add/edit/delete) |
| `renderMembers()` | `:2737` | Renderiza la lista de miembros en el panel |
| `updateWhoSelects()` | `:2812` | Actualiza los `<select>` de quién en formularios |

#### Eliminación de miembros
Cuando se elimina un miembro, todas sus transacciones se reasignan a `compartido` (`:2767–2768`):
```js
transactions.forEach(tx => {
  if ((tx.who || 'yo') === id) tx.who = 'compartido';
});
```

#### Decisiones de diseño
- **IDs simbólicos para defaults** (`yo`, `pareja`, `compartido`) en lugar de `m1`, `m2`, `m3` — para que el código sea legible y las transacciones legacy sigan funcionando sin migración.
- **IDs auto-incrementales** (`m4`, `m5`...) para nuevos miembros — simples, únicos, sin colisiones.
- **No se reusan IDs** al eliminar — si eliminas `m4` y agregas uno nuevo, será `m5` (o el siguiente disponible).
- **Eliminar reasigna a `compartido`**, no borra las transacciones — no se pierde data histórica.

---

## 2. Colores por miembro

### Qué cambió
Antes: todos los miembros se veían iguales en la tabla (badge gris) y en el who-toggle (verde al activarse).

Ahora: cada miembro tiene un color único de una paleta de 10, tanto en los badges de la tabla
como en el botón activo del who-toggle diario.

### Por qué
- El usuario pidió poder distinguir visualmente a cada miembro en la tabla de transacciones.
- Los 3 defaults (Él, Ella, Compartido) tenían colores dedicados (azul, dorado, verde) desde v1.0.
- Se extendió el mismo concepto a todos los miembros.

### Cómo funciona

#### Paleta de colores (`MEMBER_COLORS`, `:1812–1823`)
```js
const MEMBER_COLORS = [
  { bg: 'rgba(79,142,247,0.15)', text: 'var(--accent-blue)' },   // 0: yo → azul
  { bg: 'rgba(245,200,66,0.15)', text: 'var(--accent-gold)' },    // 1: pareja → dorado
  { bg: 'rgba(0,212,170,0.15)', text: 'var(--accent-green)' },    // 2: compartido → verde
  { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },               // 3: m4 → púrpura
  { bg: 'rgba(249,115,22,0.15)', text: '#f97316' },               // 4: m5 → naranja
  { bg: 'rgba(6,182,212,0.15)', text: '#06b6d4' },                // 5: m6 → cian
  { bg: 'rgba(225,29,72,0.15)', text: '#e11d48' },                // 6: m7 → rojo
  { bg: 'rgba(132,204,22,0.15)', text: '#84cc16' },               // 7: m8 → lima
  { bg: 'rgba(217,70,239,0.15)', text: '#d946ef' },               // 8: m9 → magenta
  { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },               // 9: m10 → teal
];
```

#### Asignación de color
Se usa `Object.keys(members).indexOf(id) % MEMBER_COLORS.length` (`:1826–1830`):
- Los 3 defaults tienen índices fijos 0, 1, 2 → azul, dorado, verde.
- El primer miembro extra (sea cual sea su ID) obtiene el índice 3 → púrpura.
- Si hay más de 10 miembros, los colores se reciclan con `% 10`.

#### Dónde se aplica

| Lugar | Código | Línea |
|-------|--------|-------|
| Badge en tabla de transacciones | `getMemberBadgeStyle(whoVal)` en `renderTable()` | `:2314` |
| Botón del who-toggle (activo) | `updateWhoToggle()` → `col.text` como `background` | `:2147–2156` |

#### Tabla: badge con inline styles
```html
<span class="badge" style="background:${getMemberBadgeStyle(whoVal).bg};color:${getMemberBadgeStyle(whoVal).color}">
```
(`:2314`)

#### Who-toggle: botón activo con color sólido, inactivo transparente
- **Activo**: `background` = `col.text` (el color sólido), `color` = `#fff` (texto blanco).
- **Inactivo**: fondo transparente, texto gris (`var(--text-secondary)` del CSS por defecto).
- El color **no** aparece en el texto inactivo — solo en el badge de la tabla y en el botón activo.
- Los 3 defaults mantienen sus clases CSS fijas (`active-who-yo`, `active-who-pareja`, `active-who-compartido`) con sus colores dedicados.

#### Decisiones de diseño
- **Color en la fuente del badge** — el texto del badge se colorea con el color del miembro, no solo el fondo. Así el color identifica al miembro, no a la casilla.
- **Color solo en estado activo del toggle** — evitar el efecto "el color es de la posición, no del nombre". El color pertenece al miembro, no al botón.
- **Por qué no se usaron clases CSS para miembros extra**: los 3 defaults tienen clases hardcodeadas (`active-who-yo`, etc.) porque son fijos. Para miembros dinámicos se usan inline styles, que es el mismo mecanismo pero aplicado al HTML en lugar del CSS.
- **Retrocompatibilidad**: los badges legacy en localStorage (sin `members`) usan `Él`/`Ella`/`Compartido` con los colores de siempre.

---

## 3. Clave de sala

### Qué cambió
Antes: cualquier persona con el código de la sala podía conectarse, sin contraseña.

Ahora: al **crear** una sala nueva se puede establecer una clave. Al **unirse** a una sala protegida,
se pide la clave. Las salas existentes (sin clave) siguen funcionando sin contraseña.

### Por qué
- El usuario quería privacidad adicional: que no cualquiera con el código pueda ver los datos.
- Ya existía un código de sala (ej. `M85/R5X`), pero era fácil de compartir accidentalmente.
- La clave es client-side (hash SHA-256), no viaja en texto plano.

### Cómo funciona

#### Hash SHA-256 (`sha256()`, `:3057–3061`)
```js
async function sha256(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
```
- Usa Web Crypto API (`crypto.subtle.digest`).
- Retorna un string hexadecimal en minúsculas de 64 caracteres.
- Requiere contexto seguro (HTTPS o localhost) — no funciona en `file://`.

#### Flag `isCreatingRoom` (`:3064`)
- `true` → el usuario está **creando** una sala (se guarda el `passwordHash` en Firestore).
- `false` → el usuario está **uniéndose** a una sala existente (se verifica el hash contra el almacenado).

Se setea en:
- `openRoomModal()` (`:1758, :1768`): según si ya hay un código de sala guardado.
- `setupRoomModal()` tabs (`:3068, :3079`): al hacer clic en "Crear sala" o "Unirse a sala".
- `initFirebase()` (`:1455`): al cargar una sala existente desde localStorage.

#### Crear sala (flujo)
1. Usuario ingresa código + clave + confirmar clave.
2. `roomForm` submit (`:3097–3105`): valida que clave tenga ≥4 caracteres y coincida con confirmación.
3. `firstTimeSetup()` (`:1535–1536`): guarda `passwordHash` en el documento Firestore:
   ```js
   if (isCreatingRoom && roomPassword) {
     data.passwordHash = await sha256(roomPassword);
   }
   ```

#### Unirse a sala (flujo)
1. Usuario ingresa código + clave (opcional para salas legacy).
2. `subscribeFirestore()` (`:1476–1491`): verifica la clave si el documento tiene `passwordHash`:
   ```js
   if (data.passwordHash && roomPassword) {
     const hash = await sha256(roomPassword);
     if (hash !== data.passwordHash) {
       showToast('Contraseña incorrecta — modo offline');
       // No se conecta a Firestore
     }
   }
   ```

#### Salas legacy
- Si el documento Firestore **no** tiene el campo `passwordHash`, la verificación se salta.
- El usuario puede unirse sin clave (solo con el código).

#### Por qué no se usa la clave como parte del document ID
- Se consideró derivar el ID del documento de la clave (ej. `hash(code + password)`), pero eso impediría compartir el código de sala sin compartir la clave. El diseño actual mantiene el código de sala como identificador público y la clave como protección adicional.

#### Limitaciones conocidas
- La clave se almacena en `localStorage` (`finanzas_room_pwd`) — si el usuario borra localStorage, pierde la clave y debe recordarla.
- No hay una opción "recordar clave" en el modal de unirse.
- Si se pierde la clave de la sala, no hay recuperación (el hash está en Firestore, la clave original no).

---

## 4. Who-toggle con scroll y centrado

### Qué cambió
Antes: el who-toggle tenía 3 botones fijos (Él, Ella, Compartido) que ocupaban todo el ancho.

Ahora: al agregar más de 3 miembros, los botones se muestran en una fila horizontal
con scroll (deslizable con el mouse) y los botones extra tienen colores únicos al activarse.

### Por qué
- Con más de 3 miembros, los botones no caben en el ancho del contenedor.
- El scroll horizontal evita que los botones se compriman demasiado.
- El drag con mouse mejora la experiencia en desktop (sin scrollbar visible).

### Cómo funciona

#### Clase `.fill` (`:230`)
```css
.who-toggle.fill button { flex: 1; flex-shrink: 1; }
```
- Cuando `Object.keys(members).length <= 3`, se añade `.fill` → los botones se expanden equitativamente.
- Cuando hay 4+ miembros, `.fill` se elimina → los botones mantienen su tamaño natural y el contenedor scrollea.

#### Centrado (`::before`/`::after`, `:212–215`)
```css
.who-toggle::before, .who-toggle::after {
  content: '';
  margin: auto;
}
```
- Pseudo-elementos que actúan como espaciadores flexibles para centrar los botones cuando el contenido no desborda.
- Cuando hay scroll, los pseudo-elementos colapsan a 0 y los botones se alinean a la izquierda (scroll normal).

#### Drag scroll (`setupCategoryDragScroll()`, `:2086–2111`)
- Guard `dataset.dragInit`: solo se inicializa una vez por contenedor.
- Eventos: `mousedown` → inicia, `mousemove` → desplaza, `mouseup`/`mouseleave` → detiene.
- Multiplicador `1.5` para la velocidad del arrastre.
- Se usa también para las cuadrículas de categorías y subcategorías (misma función reutilizada).

#### Asignación de botones por ID (bug fix crítico)
En v1.3.0-beta, los botones extra se asignaban por posición (`existing[existingIdx]`),
lo que causaba que al eliminar y agregar miembros, los nombres "saltaran" entre botones
(el botón que decía "Pedro" pasaba a decir "Ana").

**Solución** (`:2134`): buscar cada botón por `data-who`:
```js
let btn = toggle.querySelector(`.who-extra-btn[data-who="${id}"]`);
```
- Los botones sobrantes se eliminan al final (`:2158–2160`).
- Los botones faltantes se crean y agregan al DOM.

---

## 5. Indicador de sala activa y salir de sala

### Qué cambió
Antes: no había indicador visual de la sala activa. Para cambiar de sala había que
borrar localStorage manualmente o abrir el modal.

Ahora: el código de la sala se muestra en el header, y hay un botón "Salir de esta sala"
en el modal de sala.

### Cómo funciona

#### Indicador en header
- Elemento `<span id="roomCodeLabel">` en `:949`.
- `updateRoomLabel()` (`:1728–1737`): muestra el código de sala con tooltip (`title`).
- Se actualiza desde `updateSyncStatus()` y `leaveRoom()`.

#### Salir de sala (`leaveRoom()`, `:1739–1749`)
```js
function leaveRoom() {
  if (firestoreUnsub) { firestoreUnsub(); firestoreUnsub = null; }
  roomCode = null;
  roomPassword = null;
  localStorage.removeItem(ROOM_KEY);
  localStorage.removeItem(ROOM_KEY + '_pwd');
  updateSyncStatus(false);
  updateRoomLabel();
  closeRoomModal();
  showToast('Has salido de la sala');
}
```
- Desconecta el listener de Firestore.
- Limpia `roomCode` y `roomPassword` de memoria y localStorage.
- Actualiza UI.
- Botón en `:1258`, evento en `:3126`.

---

## 6. Eliminación de datos de ejemplo

### Qué cambió
Antes: `loadData()` llamaba a `generateSampleData()` si localStorage estaba vacío,
generando 10 transacciones de ejemplo con datos ficticios.

Ahora: `loadData()` inicializa `transactions = []` cuando no hay datos. La función
`generateSampleData()` fue eliminada por completo.

### Por qué
- Los datos de ejemplo interferían con la UX: el usuario tenía que borrarlos manualmente.
- Al compartir sala, un dispositivo podía sincronizar datos de ejemplo a los demás.
- El usuario prefiere empezar desde cero.

### Código actual (`:1838–1853`)
```js
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    transactions = raw ? JSON.parse(raw) : [];
  } catch { transactions = []; }
  // similar para budgets
}
```

---

## 7. Resumen de cambios en el DOM (HTML)

| Elemento | Línea | Propósito |
|----------|-------|-----------|
| `#membersPanel` | `:1122` | Panel de administración de miembros en vista análisis |
| `#membersList` | `:1129` | Lista de miembros con botones editar/eliminar |
| `#memberForm` | `:1134` | Formulario para agregar/editar miembro |
| `#roomCodeLabel` | `:949` | Indicador de sala activa en el header |
| `#roomLeaveBtn` | `:1258` | Botón "Salir de esta sala" en el modal |
| `#roomModal .room-tabs` | `:1238–1247` | Tabs "Crear sala" / "Unirse a sala" |
| `#roomConfirmPwd` | `:1270` | Campo confirmar clave (solo en modo crear) |
| `#whoToggle` | `:980` | Contenedor del who-toggle con scroll |

---

## 8. Cambios en estilos CSS

| Regla | Línea | Propósito |
|-------|-------|-----------|
| `.who-toggle` (scroll) | `:198–210` | Flexbox con `overflow-x: auto` y ocultación de scrollbar |
| `.who-toggle::before/after` | `:212–215` | Centrado pseudo-elementos |
| `.who-toggle.fill button` | `:230` | Botones expandidos cuando ≤3 miembros |
| `.who-extra-btn.active-who-color` | `:234` | Texto blanco para botón activo (inline style da el bg) |

---

## 9. Retrocompatibilidad

| Escenario | Comportamiento |
|-----------|---------------|
| Usuario existente con transacciones en sala legacy | Sigue funcionando: `loadMembers()` usa defaults, `getWhoLabel('yo')` devuelve 'Él'. No se pierde data. |
| Sala sin `passwordHash` en Firestore | Se accede sin clave (legacy). |
| Sala con `passwordHash` | Se pide clave al unirse (nuevo comportamiento). |
| Transacciones con `who='yo'` | Se muestra el nombre configurado (default 'Él'). |
| Transacciones con `who='m4'` | Se muestra el nombre del miembro si existe, o fallback a 'Compartido'. |
| localStorage sin `finanzas_members` | Se crea con `DEFAULT_MEMBERS`. |

---

## 10. Bugs corregidos durante el desarrollo

| Bug | Síntoma | Solución |
|-----|---------|----------|
| Botones extra cambiaban de nombre al hacer clic | El botón que decía "Pedro" pasaba a decir "Ana" al seleccionar otro miembro | Asignación por `data-who` en lugar de por posición (`existing[existingIdx]`) |
| Colores se asignaban a la "casilla" no al nombre | El color del botón inactivo cambiaba al seleccionar otro miembro | Color solo en estado activo (fondo sólido), inactivo transparente |
| Función `generateSampleData()` seguía referenciada | Código muerto ocupando espacio | Eliminada completamente |

---

## 11. Próximas mejoras sugeridas (después de pruebas)

- [ ] **Persistencia de clave al reconectar** — recordar la clave en la sesión para no pedirla cada vez
- [ ] **Editar clave de sala** — opción en el modal para cambiar la clave (requiere clave actual)
- [ ] **Reorder de miembros** — arrastrar para cambiar el orden en el who-toggle
- [ ] **Avatar/emoji por miembro** — selector de emoji para identificar visualmente a cada persona
- [ ] **Modo oscuro automático** según preferencia del sistema (`prefers-color-scheme`)
