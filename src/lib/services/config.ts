import { run, getConfig } from '../db';
import { CONFIG_POR_DEFECTO } from '../rules';
import { fail, ok, type Result } from './common';

export function guardarConfig(valores: Record<string, string>): Result {
  const errores: string[] = [];
  for (const k of Object.keys(CONFIG_POR_DEFECTO)) {
    if (!(k in valores)) continue;
    const n = Number(valores[k]);
    if (!Number.isFinite(n) || n < 0) errores.push(`«${k}» debe ser un número positivo.`);
    if (k === 'diaVencimiento' && (n < 1 || n > 28)) errores.push('El día de vencimiento debe estar entre 1 y 28.');
    if ((k === 'descuentoHermano' || k === 'descuentoMultiGrupo') && n > 100) errores.push('Un descuento no puede superar el 100 %.');
  }
  if (valores.fechaDemo && !/^\d{4}-\d{2}-\d{2}$/.test(valores.fechaDemo)) errores.push('La fecha de la demo no es válida.');
  if (errores.length) return fail(errores.join(' '));
  for (const [k, v] of Object.entries(valores)) {
    run('INSERT INTO configuracion (clave, valor) VALUES (?,?) ON CONFLICT(clave) DO UPDATE SET valor=excluded.valor', k, String(v));
  }
  return ok('Configuración guardada. Las reglas nuevas se aplican desde ya.');
}

export { getConfig };
