import { all, one, hoyISO } from '../db';
import { pagoProfesores, redondear } from '../rules';

export type ClaseProfe = {
  sesionId: number; fecha: string; grupo: string; horaInicio: string; duracionMin: number; horas: number; importe: number;
  esSustitucion: boolean; titular: string; profesorId: number; profesorRealId: number | null;
};

export function listarProfesores() {
  return all<{ id: number; nombre: string; telefono: string; tarifaHora: number; tipoContrato: string }>('SELECT * FROM profesor ORDER BY nombre');
}

export function resumenMes(mes: string) {
  const profes = listarProfesores();
  const tarifas = Object.fromEntries(profes.map((p) => [p.id, p.tarifaHora]));
  const ses = all<{ id: number; fecha: string; estado: string; duracionMin: number; profesorId: number; profesorRealId: number | null; grupo: string; horaInicio: string }>(
    `SELECT s.id, s.fecha, s.estado, g.duracionMin, g.profesorId, s.profesorRealId, g.nombre AS grupo, g.horaInicio
     FROM sesion s JOIN grupo g ON g.id = s.grupoId WHERE substr(s.fecha,1,7) = ? ORDER BY s.fecha, g.horaInicio`, mes);
  const pago = pagoProfesores(ses, tarifas);
  return profes.map((p) => {
    const clases: ClaseProfe[] = ses
      .filter((s) => s.estado === 'impartida' && (s.profesorRealId ?? s.profesorId) === p.id)
      .map((s) => ({
        sesionId: s.id, fecha: s.fecha, grupo: s.grupo, horaInicio: s.horaInicio, duracionMin: s.duracionMin, horas: s.duracionMin / 60,
        importe: redondear((s.duracionMin / 60) * p.tarifaHora), esSustitucion: !!s.profesorRealId && s.profesorRealId !== s.profesorId,
        titular: profes.find((x) => x.id === s.profesorId)?.nombre ?? '', profesorId: s.profesorId, profesorRealId: s.profesorRealId,
      }));
    const cubiertas = ses.filter((s) => s.estado === 'impartida' && s.profesorId === p.id && s.profesorRealId && s.profesorRealId !== p.id).length;
    const programadas = ses.filter((s) => s.estado === 'programada' && (s.profesorRealId ?? s.profesorId) === p.id).length;
    return { ...p, horas: pago[p.id]?.horas ?? 0, clases: pago[p.id]?.clases ?? 0, importe: pago[p.id]?.importe ?? 0, detalle: clases, cubiertas, programadas };
  });
}

export function gruposDeProfesor(id: number) {
  return all<{ id: number; nombre: string }>('SELECT id, nombre FROM grupo WHERE profesorId = ? ORDER BY diaSemana, horaInicio', id);
}

export function mesesDisponibles() {
  const hoy = hoyISO().slice(0, 7);
  const ms = all<{ m: string }>('SELECT DISTINCT substr(fecha,1,7) m FROM sesion ORDER BY m DESC').map((r) => r.m);
  return ms.filter((m) => m <= hoy);
}

export function sesionesSustituibles(mes: string) {
  return all<{ id: number; fecha: string; grupo: string; horaInicio: string; estado: string; profesorId: number; profesorRealId: number | null; titular: string }>(
    `SELECT s.id, s.fecha, g.nombre AS grupo, g.horaInicio, s.estado, g.profesorId, s.profesorRealId, p.nombre AS titular
     FROM sesion s JOIN grupo g ON g.id = s.grupoId JOIN profesor p ON p.id = g.profesorId
     WHERE substr(s.fecha,1,7) = ? AND s.estado <> 'cancelada' ORDER BY s.fecha DESC, g.horaInicio`, mes);
}

export function csvProfesores(mes: string): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lineas = [['Profesor', 'Contrato', 'Tarifa €/h', 'Clases', 'Horas', 'Importe €'].map(esc).join(';')];
  for (const p of resumenMes(mes)) lineas.push([p.nombre, p.tipoContrato, p.tarifaHora.toFixed(2), p.clases, p.horas.toFixed(2), p.importe.toFixed(2)].map(esc).join(';'));
  lineas.push('');
  lineas.push(['Detalle', 'Fecha', 'Grupo', 'Horas', 'Importe €', 'Sustitución'].map(esc).join(';'));
  for (const p of resumenMes(mes)) for (const c of p.detalle) lineas.push([p.nombre, c.fecha, c.grupo, c.horas.toFixed(2), c.importe.toFixed(2), c.esSustitucion ? `Sustituye a ${c.titular}` : ''].map(esc).join(';'));
  return '﻿' + lineas.join('\r\n');
}

export const _one = one;
