#!/usr/bin/env node
/**
 * Verificación de imports — detecta identificadores usados que son exportados por
 * otro módulo del proyecto pero que NO se importan en el módulo actual.
 *
 * Previene bugs de tipo `ReferenceError: X is not defined` (como el de v2.3.4:
 * ui-members.js llamaba saveAccounts() sin importarla), que el `node --check`
 * no detecta porque solo valida sintaxis, no resuelve identificadores.
 *
 * Uso: node scripts/check-imports.mjs
 * Exit code 0 = sin problemas. Exit code 1 = se encontraron problemas.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const JS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'js');

const files = readdirSync(JS_DIR).filter(f => f.endsWith('.js'));
const src = Object.fromEntries(files.map(f => [f, readFileSync(join(JS_DIR, f), 'utf8')]));

/** Extrae los identificadores exportados de un módulo. */
function getExports(code) {
  const set = new Set();
  let m;
  const reDecl = /export\s+(?:async\s+)?(?:function|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reDecl.exec(code))) set.add(m[1]);
  const reList = /export\s*\{([^}]*)\}/g;
  while ((m = reList.exec(code))) {
    m[1].split(',').forEach(s => {
      s = s.trim();
      if (!s) return;
      const parts = s.split(/\s+as\s+/);
      set.add(parts[parts.length - 1]);
    });
  }
  const reDefault = /export\s+default\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reDefault.exec(code))) set.add(m[1]);
  return set;
}

/** Extrae los identificadores importados (nombres locales, con alias resuelto). */
function getImports(code) {
  const set = new Set();
  let m;
  const reNamed = /import\s*\{([^}]*)\}\s*from/g;
  while ((m = reNamed.exec(code))) {
    m[1].split(',').forEach(s => {
      s = s.trim();
      if (!s) return;
      const parts = s.split(/\s+as\s+/);
      set.add(parts[parts.length - 1]);
    });
  }
  const reDefault = /import\s+([A-Za-z_$][\w$]*)\s+from/g;
  while ((m = reDefault.exec(code))) set.add(m[1]);
  return set;
}

/** Extrae identificadores declarados localmente (no importados), incluyendo destructuring. */
function getLocalDecls(code) {
  const set = new Set();
  let m;
  const reDecl = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
  while ((m = reDecl.exec(code))) set.add(m[1]);
  const reDest = /\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g;
  while ((m = reDest.exec(code))) {
    m[1].split(',').forEach(s => {
      s = s.trim();
      if (!s) return;
      set.add(s.includes(':') ? s.split(':').pop().trim() : s);
    });
  }
  return set;
}

const exportsOf = new Map();
const importsOf = new Map();
const localOf = new Map();
for (const f of files) {
  exportsOf.set(f, getExports(src[f]));
  importsOf.set(f, getImports(src[f]));
  localOf.set(f, getLocalDecls(src[f]));
}

/** Mapa token → módulos que lo exportan. */
const exporters = new Map();
for (const [f, set] of exportsOf) {
  for (const name of set) {
    if (!exporters.has(name)) exporters.set(name, []);
    exporters.get(name).push(f);
  }
}

let problems = 0;
for (const f of files) {
  const exported = exportsOf.get(f);
  const imported = importsOf.get(f);
  const local = localOf.get(f);
  const code = src[f];
  const used = new Set();
  const lines = code.split('\n');
  lines.forEach(line => {
    if (line.includes('import') || line.includes('export')) return;
    let m;
    const re = /[A-Za-z_$][\w$]*/g;
    while ((m = re.exec(line))) {
      if (m[0] === '$' && line[m.index + 1] === '{') continue;
      used.add(m[0]);
    }
  });

  for (const name of used) {
    if (exported.has(name) || imported.has(name) || local.has(name)) continue;
    const others = (exporters.get(name) || []).filter(x => x !== f);
    if (others.length === 0) continue;
    console.error(`[ERROR] ${f}: usa "${name}" (exportado por ${others.join(', ')}) pero NO lo importa`);
    problems++;
  }
}

if (problems > 0) {
  console.error(`\n${problems} identificador(es) sin importar. Revisa los imports de esos módulos.`);
  process.exit(1);
}
console.log('check-imports: OK — todos los identificadores usados están importados o declarados.');
