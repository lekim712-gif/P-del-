import type { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG_POR_DEFECTO, aISO, type Config } from './rules';

export const DB_PATH = path.join(process.cwd(), 'data', 'demo.db');

type Global = typeof globalThis & { __padelDb?: DatabaseSync };

/** node:sqlite se carga con getBuiltinModule para que el bundler no intente empaquetarlo. */
export function openDatabase(file: string): DatabaseSync {
  const sqlite = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');
  const d = new sqlite.DatabaseSync(file);
  d.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  return d;
}

export function db(): DatabaseSync {
  const g = globalThis as Global;
  if (!g.__padelDb) {
    if (!fs.existsSync(DB_PATH)) {
      throw new Error('No existe la base de datos. Ejecuta primero: npm run db:reset');
    }
    g.__padelDb = openDatabase(DB_PATH);
  }
  return g.__padelDb;
}

type Param = string | number | null;

export function all<T = Record<string, any>>(sql: string, ...params: Param[]): T[] {
  return db().prepare(sql).all(...params).map((r) => ({ ...r })) as T[];
}

export function one<T = Record<string, any>>(sql: string, ...params: Param[]): T | undefined {
  const r = db().prepare(sql).get(...params);
  return r ? ({ ...r } as T) : undefined;
}

export function run(sql: string, ...params: Param[]): { id: number; changes: number } {
  const r = db().prepare(sql).run(...params);
  return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
}

export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec('BEGIN');
  try {
    const r = fn();
    d.exec('COMMIT');
    return r;
  } catch (e) {
    d.exec('ROLLBACK');
    throw e;
  }
}

// ------------------------------------------------------------ configuración y reloj
export function getConfig(): Config & { fechaDemo: string; consentimientoVersion: string; textoConsentimiento: string } {
  const filas = all<{ clave: string; valor: string }>('SELECT clave, valor FROM configuracion');
  const cfg: Record<string, any> = { ...CONFIG_POR_DEFECTO, fechaDemo: '', consentimientoVersion: '', textoConsentimiento: '' };
  for (const f of filas) cfg[f.clave] = f.clave in CONFIG_POR_DEFECTO ? Number(f.valor) : f.valor;
  return cfg as Config & { fechaDemo: string; consentimientoVersion: string; textoConsentimiento: string };
}

/** "Ahora" de la demo: la hora real, o la fecha fijada en Configuración (reloj simulado). */
export function ahora(): Date {
  const fila = one<{ valor: string }>("SELECT valor FROM configuracion WHERE clave = 'fechaDemo'");
  const real = new Date();
  if (fila?.valor) {
    const [y, m, d] = fila.valor.split('-').map(Number);
    return new Date(y, m - 1, d, real.getHours(), real.getMinutes());
  }
  return real;
}

export function hoyISO(): string {
  return aISO(ahora());
}
