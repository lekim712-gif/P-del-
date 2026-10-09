import { all, one, run, tx, ahora, hoyISO } from '../db';
import { calcularEdad, encajaDisponibilidad, type Disponibilidad } from '../rules';
import { GRUPO_SELECT, fail, ok, type GrupoRow, type Result } from './common';
import { inscribir } from './alumnos';

export function getDisponibilidad(alumnoId: number): Disponibilidad[] {
  return all<Disponibilidad>('SELECT diaSemana, franja FROM disponibilidad WHERE alumnoId = ?', alumnoId);
}

export function guardarDisponibilidad(alumnoId: number, celdas: Disponibilidad[]): Result {
  tx(() => {
    run('DELETE FROM disponibilidad WHERE alumnoId = ?', alumnoId);
    for (const c of celdas) {
      if (c.diaSemana >= 1 && c.diaSemana <= 6) run('INSERT OR IGNORE INTO disponibilidad (alumnoId, diaSemana, franja) VALUES (?,?,?)', alumnoId, c.diaSemana, c.franja);
    }
  });
  return ok('Disponibilidad guardada. Ya puedes ver los grupos que encajan contigo.');
}

export type Propuesta = GrupoRow & { encaja: boolean; plazasLibres: number; solicitud: string | null };

/** Grupos del mismo nivel (y categoría por edad) en los que el alumno no está, ordenados: encajan primero, con plaza primero. */
export function propuestasPara(alumnoId: number): Propuesta[] {
  const a = one<{ nivel: string; fechaNacimiento: string }>('SELECT nivel, fechaNacimiento FROM alumno WHERE id = ?', alumnoId);
  if (!a) return [];
  const categoria = calcularEdad(a.fechaNacimiento, ahora()) < 14 ? 'infantil' : 'adultos';
  const disp = getDisponibilidad(alumnoId);
  const grupos = all<GrupoRow>(
    `${GRUPO_SELECT} WHERE g.nivel = ? AND g.categoria = ?
     AND NOT EXISTS (SELECT 1 FROM inscripcion i WHERE i.alumnoId = ? AND i.grupoId = g.id AND i.fechaBaja IS NULL)
     ORDER BY g.diaSemana, g.horaInicio`, a.nivel, categoria, alumnoId);
  const sol = all<{ grupoId: number; estado: string }>("SELECT grupoId, estado FROM solicitud WHERE alumnoId = ? AND estado IN ('pendiente','espera')", alumnoId);
  return grupos
    .map((g) => ({ ...g, encaja: encajaDisponibilidad(g.diaSemana, g.horaInicio, disp), plazasLibres: g.plazasMax - g.inscritos, solicitud: sol.find((s) => s.grupoId === g.id)?.estado ?? null }))
    .sort((x, y) => Number(y.encaja) - Number(x.encaja) || Number(y.plazasLibres > 0) - Number(x.plazasLibres > 0));
}

export function solicitarGrupo(alumnoId: number, grupoId: number): Result {
  if (one("SELECT 1 FROM solicitud WHERE alumnoId=? AND grupoId=? AND estado IN ('pendiente','espera')", alumnoId, grupoId)) return fail('Ya has solicitado este grupo.');
  if (one('SELECT 1 FROM inscripcion WHERE alumnoId=? AND grupoId=? AND fechaBaja IS NULL', alumnoId, grupoId)) return fail('Ya estás inscrito en este grupo.');
  run("INSERT INTO solicitud (alumnoId, grupoId, estado, creadoEn) VALUES (?,?,'pendiente',?)", alumnoId, grupoId, hoyISO());
  return ok('Solicitud enviada. Recepción la confirmará en breve.');
}

export function cancelarSolicitud(id: number): Result {
  run("DELETE FROM solicitud WHERE id=? AND estado IN ('pendiente','espera')", id);
  return ok('Solicitud cancelada.');
}

export type SolicitudRow = {
  id: number; alumnoId: number; alumno: string; nivel: string; grupoId: number; grupo: string; estado: string; creadoEn: string;
  inscritos: number; plazasMax: number; encaja: boolean;
};

export function listarSolicitudes(soloAbiertas = true): SolicitudRow[] {
  const filas = all<Omit<SolicitudRow, 'encaja'> & { diaSemana: number; horaInicio: string }>(
    `SELECT s.*, a.nombre || ' ' || a.apellidos AS alumno, a.nivel, g.nombre AS grupo, g.diaSemana, g.horaInicio, g.plazasMax,
       (SELECT COUNT(*) FROM inscripcion i WHERE i.grupoId = g.id AND i.fechaBaja IS NULL) AS inscritos
     FROM solicitud s JOIN alumno a ON a.id = s.alumnoId JOIN grupo g ON g.id = s.grupoId
     ${soloAbiertas ? "WHERE s.estado = 'pendiente'" : ''} ORDER BY s.estado = 'pendiente' DESC, s.creadoEn, s.id`);
  return filas.map((f) => ({ ...f, encaja: encajaDisponibilidad(f.diaSemana, f.horaInicio, getDisponibilidad(f.alumnoId)) }));
}

export function solicitudesDeAlumno(alumnoId: number) {
  return all<{ id: number; grupo: string; estado: string; creadoEn: string }>(
    `SELECT s.id, g.nombre AS grupo, s.estado, s.creadoEn FROM solicitud s JOIN grupo g ON g.id = s.grupoId WHERE s.alumnoId = ? ORDER BY s.id DESC LIMIT 6`, alumnoId);
}

export function resolverSolicitud(id: number, aceptar: boolean): Result {
  const s = one<{ alumnoId: number; grupoId: number; estado: string }>('SELECT * FROM solicitud WHERE id = ?', id);
  if (!s || s.estado !== 'pendiente') return fail('La solicitud ya estaba resuelta.');
  if (!aceptar) {
    run("UPDATE solicitud SET estado='rechazada' WHERE id=?", id);
    return ok('Solicitud rechazada.');
  }
  const r = inscribir(s.alumnoId, s.grupoId);
  if (!r.ok) return r;
  run('UPDATE solicitud SET estado = ? WHERE id = ?', r.data?.resultado === 'espera' ? 'espera' : 'confirmada', id);
  return ok(r.msg);
}

export function pendientesSolicitudes(): number {
  return one<{ n: number }>("SELECT COUNT(*) n FROM solicitud WHERE estado='pendiente'")?.n ?? 0;
}

