import { all, one, hoyISO, getConfig } from '../db';
import { fechaHora } from '../rules';
import { listarCuotas } from './cuotas';
import { listarRecuperaciones } from './recuperaciones';
import { mensajesDeTutor } from './mensajes';

export function listarTutores() {
  return all<{ id: number; nombre: string; hijos: string }>(
    `SELECT t.id, t.nombre, (SELECT group_concat(nombre, ', ') FROM alumno WHERE tutorId = t.id) AS hijos FROM tutor t ORDER BY t.nombre`);
}

export function getFamilia(tutorId: number) {
  const tutor = one<{ id: number; nombre: string; telefono: string | null; email: string | null; consentimientoFecha: string | null; consentimientoVersion: string | null }>('SELECT * FROM tutor WHERE id=?', tutorId);
  if (!tutor) return null;
  const hijos = all<{ id: number; nombre: string; apellidos: string; nivel: string; estado: string }>('SELECT id, nombre, apellidos, nivel, estado FROM alumno WHERE tutorId=? ORDER BY fechaNacimiento', tutorId);
  const ahoraIso = hoyISO();
  const proximas = hijos.map((h) => ({
    hijo: h,
    grupos: all<{ id: number; nombre: string; diaSemana: number; horaInicio: string; duracionMin: number; profesor: string; pista: string }>(
      `SELECT g.id, g.nombre, g.diaSemana, g.horaInicio, g.duracionMin, p.nombre AS profesor, pi.nombre AS pista FROM inscripcion i JOIN grupo g ON g.id=i.grupoId
       JOIN profesor p ON p.id=g.profesorId JOIN pista pi ON pi.id=g.pistaId WHERE i.alumnoId=? AND i.fechaBaja IS NULL ORDER BY g.diaSemana, g.horaInicio`, h.id),
    sesiones: all<{ sesionId: number; fecha: string; estado: string; grupo: string; horaInicio: string; asistencia: string | null }>(
      `SELECT s.id AS sesionId, s.fecha, s.estado, g.nombre AS grupo, g.horaInicio, a.estado AS asistencia FROM sesion s JOIN grupo g ON g.id=s.grupoId
       JOIN inscripcion i ON i.grupoId=g.id AND i.alumnoId=? AND i.fechaBaja IS NULL
       LEFT JOIN asistencia a ON a.sesionId=s.id AND a.alumnoId=? WHERE s.fecha >= ? AND s.estado <> 'impartida' ORDER BY s.fecha, g.horaInicio LIMIT 6`, h.id, h.id, ahoraIso),
    recuperaciones: listarRecuperaciones({ alumnoId: h.id }).filter((r) => r.estado === 'pendiente' || r.estado === 'reservada'),
  }));
  const cuotas = listarCuotas({ tutorId }).slice(0, 12);
  const mensajes = mensajesDeTutor(tutorId).slice(0, 8);
  return { tutor, hijos, proximas, cuotas, mensajes, cfg: getConfig() };
}

export const _f = fechaHora;

export function proximasSesionesAlumno(alumnoId: number) {
  return all<{ sesionId: number; fecha: string; estado: string; grupo: string; horaInicio: string; asistencia: string | null }>(
    `SELECT s.id AS sesionId, s.fecha, s.estado, g.nombre AS grupo, g.horaInicio, a.estado AS asistencia FROM sesion s JOIN grupo g ON g.id=s.grupoId
     JOIN inscripcion i ON i.grupoId=g.id AND i.alumnoId=? AND i.fechaBaja IS NULL
     LEFT JOIN asistencia a ON a.sesionId=s.id AND a.alumnoId=? WHERE s.fecha >= ? AND s.estado <> 'impartida' ORDER BY s.fecha, g.horaInicio LIMIT 8`, alumnoId, alumnoId, hoyISO());
}
