import { all, one, run, ahora, hoyISO } from '../db';
import { mesDe } from '../rules';
import { actualizarEstadosCuotas, fail, generarRecordatoriosCuotas, NOMBRE_TIPO_RECORDATORIO, ok, type Result } from './common';

export type CuotaRow = {
  id: number; alumnoId: number; alumno: string; tutor: string | null; mes: string; importeBase: number; descuento: number;
  importeFinal: number; estado: 'pagada' | 'pendiente' | 'vencida'; fechaVencimiento: string; fechaPago: string | null; metodo: string | null;
};

export function mesesConCuotas(): string[] {
  return all<{ mes: string }>('SELECT DISTINCT mes FROM cuota ORDER BY mes DESC').map((r) => r.mes);
}

export function listarCuotas(f: { mes?: string; estado?: string; q?: string; tutorId?: number }): CuotaRow[] {
  actualizarEstadosCuotas();
  const where: string[] = []; const p: (string | number)[] = [];
  if (f.mes) { where.push('c.mes = ?'); p.push(f.mes); }
  if (f.estado) { where.push('c.estado = ?'); p.push(f.estado); }
  if (f.tutorId) { where.push('a.tutorId = ?'); p.push(f.tutorId); }
  if (f.q) { where.push("lower(a.nombre || ' ' || a.apellidos) LIKE ?"); p.push(`%${f.q.toLowerCase()}%`); }
  return all<CuotaRow>(
    `SELECT c.*, a.nombre || ' ' || a.apellidos AS alumno, t.nombre AS tutor FROM cuota c
     JOIN alumno a ON a.id = c.alumnoId LEFT JOIN tutor t ON t.id = a.tutorId
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.mes DESC, CASE c.estado WHEN 'vencida' THEN 0 WHEN 'pendiente' THEN 1 ELSE 2 END, a.apellidos`, ...p,
  );
}

export function totalesCuotas(mes: string) {
  actualizarEstadosCuotas();
  const r = all<{ estado: string; total: number; n: number }>('SELECT estado, COALESCE(SUM(importeFinal),0) total, COUNT(*) n FROM cuota WHERE mes=? GROUP BY estado', mes);
  const g = (e: string) => r.find((x) => x.estado === e) ?? { total: 0, n: 0 };
  return { cobrado: g('pagada').total, pendiente: g('pendiente').total, vencido: g('vencida').total, nCobradas: g('pagada').n, nPendientes: g('pendiente').n, nVencidas: g('vencida').n };
}

export function registrarCobro(cuotaId: number, metodo: string): Result {
  if (!['efectivo', 'transferencia', 'tarjeta'].includes(metodo)) return fail('Método de pago no válido.');
  const c = one<{ estado: string; importeFinal: number }>('SELECT estado, importeFinal FROM cuota WHERE id=?', cuotaId);
  if (!c) return fail('Cuota no encontrada.');
  if (c.estado === 'pagada') return fail('Esta cuota ya está pagada.');
  run("UPDATE cuota SET estado='pagada', fechaPago=?, metodo=? WHERE id=?", hoyISO(), metodo, cuotaId);
  return ok(`Cobro de ${c.importeFinal.toFixed(2).replace('.', ',')} € registrado (${metodo}).`);
}

export function deshacerCobro(cuotaId: number): Result {
  const c = one<{ fechaVencimiento: string }>('SELECT fechaVencimiento FROM cuota WHERE id=?', cuotaId);
  if (!c) return fail('Cuota no encontrada.');
  run("UPDATE cuota SET estado='pendiente', fechaPago=NULL, metodo=NULL WHERE id=?", cuotaId);
  actualizarEstadosCuotas();
  return ok('Cobro deshecho.');
}

export function generarRecordatorios(): Result {
  const { creados, porTipo } = generarRecordatoriosCuotas();
  if (!creados) return ok('No hay recordatorios nuevos que generar hoy (o ya estaban creados).');
  const detalle = Object.entries(porTipo).map(([t, n]) => `${n} × ${NOMBRE_TIPO_RECORDATORIO[t as keyof typeof NOMBRE_TIPO_RECORDATORIO]}`).join('; ');
  return ok(`Creados ${creados} mensajes pendientes de revisión: ${detalle}.`);
}

export function csvCuotas(mes: string): string {
  const filas = listarCuotas({ mes });
  const esc = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cab = ['Mes', 'Alumno', 'Tutor', 'Importe base', 'Descuento', 'Importe final', 'Estado', 'Vencimiento', 'Fecha pago', 'Método'];
  const lineas = filas.map((c) => [c.mes, c.alumno, c.tutor, c.importeBase.toFixed(2), c.descuento.toFixed(2), c.importeFinal.toFixed(2), c.estado, c.fechaVencimiento, c.fechaPago, c.metodo].map(esc).join(';'));
  return '﻿' + [cab.map(esc).join(';'), ...lineas].join('\r\n');
}

export const _ahora = ahora; export const _mes = mesDe;
