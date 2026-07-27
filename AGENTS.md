# AGENTS.md — Reglas para agentes trabajando en FinanzApp

## Autorización (lo más importante)
- NUNCA hagas `git commit`, `git push`, merge, ni `firebase deploy` sin
  autorización explícita del usuario en ese mismo turno. Preparar los
  cambios y mostrar el diff no requiere permiso; ejecutar el commit/push/
  deploy sí.
- Si el usuario dice "arregla X", eso autoriza escribir el código. NO
  autoriza subirlo. Pide confirmación aparte antes de `git push`.
- Excepción: si el usuario ya dijo explícitamente "commitea y sube todo
  lo que hagas de aquí en adelante", esa autorización aplica solo a esa
  sesión/conversación, no a futuras.

## Flujo de ramas
- `master` = producción. Solo recibe merges desde `develop`, nunca
  commits directos.
- `develop` = integración. Todo el trabajo nuevo (features, fixes no
  urgentes) se hace aquí o en una rama `feature/nombre` que luego se
  mergea a `develop`.
- `hotfix/nombre` = solo para bugs urgentes en producción. Sale de
  `master`, se mergea de vuelta a `master` Y a `develop`.
- Nunca mezcles trabajo de reestructuración/documentación con features
  nuevas en el mismo commit — commits separados, aunque sea la misma
  rama.

## Antes de dar algo por "terminado"
- Corre `node --check` en cada archivo .js que toques — cero excepciones.
- Prueba en local (`firebase serve` o equivalente) ANTES de decir que
  algo está listo para desplegar. "Listo" significa probado, no "el
  código se ve bien".
- Si el cambio toca el flujo de salas/Firestore, prueba explícitamente:
  crear sala nueva, unirse a sala existente, reconectar con contraseña.
  Estos tres casos ya se rompieron por separado en el pasado — no asumas
  que uno funciona porque el otro funciona.
- No declares un hallazgo ("esto no se usa", "esto está roto") sin
  verificarlo con grep/lectura directa del código. Un reporte
  equivocado cuesta más que no reportar nada.

## Documentación
- Toda función exportada lleva JSDoc de una línea. No documentes lo
  obvio por el nombre.
- Si documentas la firma de una función en LEEME.md, cópiala literal
  del código (`grep -n "function nombre"`) — no la reconstruyas de
  memoria.
- Todo texto visible al usuario lleva tildes/ñ correctos. Verifica
  encoding UTF-8 al escribir archivos.
- LEEME.md = estado actual del sistema (vivo, se actualiza). 
  REFACTOR.md = histórico (congelado, no se edita salvo para anotar que
  algo pasó, no para reescribir el pasado).
- Antes de agregar lógica a un flujo compartido (ej. un formulario
  usado en más de un caso), verifica que el comportamiento nuevo aplique
  a TODOS los casos que disparan ese código, no solo al que estás
  probando.

## Dependencias (ver también LEEME.md § Reglas de dependencia)
- Si una función pura es necesaria en dos módulos que ya se importan
  entre sí, muévela a utils.js — no crees un import cruzado nuevo.
