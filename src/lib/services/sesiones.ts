import { all, one, run, tx, ahora, hoyISO, getConfig } from '../db';
import { aISO, caducidadRecuperacion, clasificarAusencia, fechaHora, formatoFecha, recuperacionesPorCancelacion, sumarDias } from '../rules';
import { crearMensaje, fail, ok, horaFin, type Result } from './common';

export type SesionRow = {
  id: number; grupoId: number; fecha: string; estado: string; motivoCancelacion: string | null; profesorRealId: number | null;
  grupo: string; nivel: string; categoria: string; horaInicio: string; duracionMin: number; plazasMax: number; precioMensual: number;
  profesorId: number; profesor: string; pista: string; profesorReal: string | null; inscritos: number;
};

const SESION_SELECT = `
  SELECT s.*, g.nombre AS grupo, g.nivel, g.categoria, g.horaInicio, g.duracionMin, g.plazasMax, g.precioMensual, g.profesorId,
    p.nombre AS profesor, pi.nombre AS pista, pr.nombre AS profesorReal,
    (SELECT COUNT(*) FROM inscripcion i WHERE i.grupoId = g.id AND i.fechaAlta <= s.fecha AND (i.fechaBaja IS NULL OR i.fechaBaja > s.fecha)) AS inscritos
  FROM sesion s JOIN grupo g ON g.id = s.grupoId JOIN profesor p ON p.id = g.profesorId JOIN pista pi ON pi.id = g.pistaId
  LEFT JOIN profesor pr ON pr.id = s.profesorRealId`;

export function getSesion(id: number) {
  return one<SesionRow>(`${SESION_SELECT} WHERE s.id = ?`, id);
}

export function sesionesDelDia(fecha: string, profesorId?: number) {
  return all<SesionRow>(
    `${SESION_SELECT} WHERE s.fecha = ? ${profesorId ? 'AND COALESCE(s.profesorRealId, g.profesorId) = ?' : ''} ORDER BY g.horaInicio`,
    ...(profesorId ? [fecha, profesorId] : [fecha]),
  );
}

export function sesionesRango(desde: string, hasta: string) {
  return all<SesionRow>(`${SESION_SELECT} WHERE s.fecha BETWEEN ? AND ? ORDER BY s.fecha, g.horaInicio`, desde, hasta);
}

export function sesionesDeGrupo(grupoId: number, limite = 12) {
  return all<SesionRow>(`${SESION_SELECT} WHERE s.grupoId = ? AND s.fecha <= ? ORDER BY s.fecha DESC LIMIT ?`, grupoId, hoyISO(), limite);
}

export type FilaClase = {
  alumnoId: number; nombre: string; apellidos: string; nivel: string; esRecuperacion: boolean; recuperacionId: number | null;
  estado: string | null; avisadoEn: string | null; edad?: number; notas: string | null;
};

/** Lista de la clase: inscritos a fecha de la sesión + alumnos que vienen a recuperar. */
export function listaDeClase(sesionId: number): FilaClase[] {
  const s = getSesion(sesionId);
  if (!s) return [];
  const insc = all<FilaClase>(
    `SELECT a.id AS alumnoId, a.nombre, a.apellidos, a.nivel, a.notas, 0 AS esRecuperacion, NULL AS recuperacionId, s.estado, s.avisadoEn
     FROM inscripcion i JOIN alumno a ON a.id = i.alumnoId
     LEFT JOIN asistencia s ON s.sesionId = ? AND s.alumnoId = a.id
     WHERE i.grupoId = ? AND i.fechaAlta <= ? AND (i.fechaBaja IS NULL OR i.fechaBaja > ?) ORDER BY a.apellidos, a.nombre`,
    sesionId, s.grupoId, s.fecha, s.fecha,
  );
  const rec = all<FilaClase>(
    `SELECT a.id AS alumnoId, a.nombre, a.apellidos, a.nivel, a.notas, 1 AS esRecuperacion, r.id AS recuperacionId, s.estado, s.avisadoEn
     FROM recuperacion r JOIN alumno a ON a.id = r.alumnoId
     LEFT JOIN asistencia s ON s.sesionId = ? AND s.alumnoId = a.id
     WHERE r.sesionDestinoId = ? AND r.estado IN ('reservada','usada') ORDER BY a.apellidos`,
    sesionId, sesionId,
  );
  return [...insc, ...rec].map((f) => ({ ...f, esRecuperacion: !!f.esRecuperacion }));
}

// -------------------------------------------------------------- asistencia (regla 2)
export type EstadoAsistencia = 'presente' | 'ausente' | 'ausenteAvisado';

export function marcarAsistencia(sesionId: number, alumnoId: number, estado: EstadoAsistencia | null): Result {
  const s = getSesion(sesionId);
  if (!s) return fail('Sesión no encontrada.');
  if (s.estado === 'cancelada') return fail('La clase está cancelada.');
  return tx(() => {
    const esRec = !!one("SELECT 1 FROM recuperacion WHERE sesionDestinoId=? AND alumnoId=? AND estado IN ('reservada','usada')", sesionId, alumnoId);
    if (estado === null) {
      run('DELETE FROM asistencia WHERE sesionId=? AND alumnoId=?', sesionId, alumnoId);
      borrarRecuperacionDeAusencia(sesionId, alumnoId);
      return ok('Marca quitada.');
    }
    const guardado = estado === 'presente' && esRec ? 'recuperacion' : estado;
    const avisadoEn = estado === 'ausenteAvisado' ? isoMinuto(ahora()) : null;
    run(`INSERT INTO asistencia (sesionId, alumnoId, estado, avisadoEn) VALUES (?,?,?,?)
         ON CONFLICT(sesionId, alumnoId) DO UPDATE SET estado=excluded.estado, avisadoEn=excluded.avisadoEn`, sesionId, alumnoId, guardado, avisadoEn);
    if (estado === 'ausenteAvisado') crearRecuperacionPorAusencia(sesionId, alumnoId, s.fecha);
    else borrarRecuperacionDeAusencia(sesionId, alumnoId);
    return ok(estado === 'ausenteAvisado' ? 'Ausencia avisada: genera derecho a recuperación.' : 'Guardado.');
  });
}

function isoMinuto(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${aISO(d)}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function crearRecuperacionPorAusencia(sesionId: number, alumnoId: number, fecha: string) {
  if (one("SELECT 1 FROM recuperacion WHERE sesionOrigenId=? AND alumnoId=? AND origen='ausencia'", sesionId, alumnoId)) return;
  run("INSERT INTO recuperacion (alumnoId, sesionOrigenId, sesionDestinoId, estado, caducaEn, origen) VALUES (?,?,NULL,'pendiente',?, 'ausencia')",
    alumnoId, sesionId, caducidadRecuperacion(fecha, getConfig().diasCaducidadRecuperacion));
}

function borrarRecuperacionDeAusencia(sesionId: number, alumnoId: number) {
  run("DELETE FROM recuperacion WHERE sesionOrigenId=? AND alumnoId=? AND origen='ausencia' AND estado='pendiente'", sesionId, alumnoId);
}

/** Aviso de ausencia hecho por la familia / alumno: aplica la regla de las horas. */
export function avisarAusencia(sesionId: number, alumnoId: number): Result<{ avisada: boolean }> {
  const s = getSesion(sesionId);
  if (!s) return fail('Sesión no encontrada.') as Result<any>;
  const inicio = fechaHora(s.fecha, s.horaInicio);
  const cfg = getConfig();
  const ahoraD = ahora();
  if (inicio <= ahoraD) return fail('Esa clase ya ha empezado.') as Result<any>;
  const estado = clasificarAusencia(inicio, ahoraD, cfg.horasAvisoAusencia);
  const horas = Math.max(0, Math.floor((inicio.getTime() - ahoraD.getTime()) / 3_600_000));
  return tx(() => {
    run(`INSERT INTO asistencia (sesionId, alumnoId, estado, avisadoEn) VALUES (?,?,?,?)
         ON CONFLICT(sesionId, alumnoId) DO UPDATE SET estado=excluded.estado, avisadoEn=excluded.avisadoEn`, sesionId, alumnoId, estado, isoMinuto(ahoraD));
    if (estado === 'ausenteAvisado') {
      crearRecuperacionPorAusencia(sesionId, alumnoId, s.fecha);
      return ok(`Ausencia avisada con ${horas} h de antelación (mínimo ${cfg.horasAvisoAusencia} h): genera una recuperación, válida hasta el ${formatoFecha(caducidadRecuperacion(s.fecha, cfg.diasCaducidadRecuperacion))}.`, { avisada: true });
    }
    return ok(`Aviso registrado con solo ${horas} h de antelación (mínimo ${cfg.horasAvisoAusencia} h): la ausencia no genera recuperación.`, { avisada: false });
  });
}

export function cerrarClase(sesionId: number): Result {
  const s = getSesion(sesionId);
  if (!s) return fail('Sesión no encontrada.');
  if (s.estado === 'cancelada') return fail('La clase está cancelada.');
  return tx(() => {
    const lista = listaDeClase(sesionId);
    const sinMarcar = lista.filter((f) => !f.estado);
    for (const f of sinMarcar) run("INSERT INTO asistencia (sesionId, alumnoId, estado) VALUES (?,?,'ausente')", sesionId, f.alumnoId);
    run("UPDATE sesion SET estado='impartida' WHERE id=?", sesionId);
    // Recuperaciones cuya asistencia fue positiva pasan a "usada"
    run(`UPDATE recuperacion SET estado='usada' WHERE sesionDestinoId=? AND estado='reservada'
         AND EXISTS (SELECT 1 FROM asistencia a WHERE a.sesionId=recuperacion.sesionDestinoId AND a.alumnoId=recuperacion.alumnoId AND a.estado='recuperacion')`, sesionId);
    const presentes = lista.filter((f) => f.estado === 'presente' || f.estado === 'recuperacion').length;
    return ok(`Clase cerrada. ${presentes} presentes${sinMarcar.length ? `; ${sinMarcar.length} sin marcar guardados como ausentes` : ''}.`);
  });
}

export function reabrirClase(sesionId: number): Result {
  run("UPDATE sesion SET estado='programada' WHERE id=? AND estado='impartida'", sesionId);
  return ok('Clase reabierta.');
}

export function asignarSustituto(sesionId: number, profesorRealId: number | null): Result {
  const s = getSesion(sesionId);
  if (!s) return fail('Sesión no encontrada.');
  const real = profesorRealId && profesorRealId !== s.profesorId ? profesorRealId : null;
  run('UPDATE sesion SET profesorRealId=? WHERE id=?', real, sesionId);
  return ok(real ? 'Sustitución registrada: las horas se atribuyen al sustituto.' : 'Sustitución quitada.');
}

// -------------------------------------------------------------- clase cancelada (regla 4)
export function cancelarSesion(sesionId: number, motivo: string): Result<{ afectados: number }> {
  const s = getSesion(sesionId);
  if (!s) return fail('Sesión no encontrada.') as Result<any>;
  if (s.estado === 'cancelada') return fail('La clase ya estaba cancelada.') as Result<any>;
  if (s.estado === 'impartida') return fail('No se puede cancelar una clase ya impartida.') as Result<any>;
  return tx(() => {
    run("UPDATE sesion SET estado='cancelada', motivoCancelacion=? WHERE id=?", motivo || 'Lluvia', sesionId);
    const inscritos = all<{ alumnoId: number }>('SELECT alumnoId FROM inscripcion WHERE grupoId=? AND fechaAlta <= ? AND (fechaBaja IS NULL OR fechaBaja > ?)', s.grupoId, s.fecha, s.fecha).map((r) => r.alumnoId);
    const recs = recuperacionesPorCancelacion(inscritos, s.fecha, getConfig().diasCaducidadRecuperacion);
    for (const r of recs) {
      run("INSERT INTO recuperacion (alumnoId, sesionOrigenId, sesionDestinoId, estado, caducaEn, origen) VALUES (?,?,NULL,'pendiente',?, 'cancelacion')", r.alumnoId, sesionId, r.caducaEn);
      crearMensaje({
        plantilla: 'lluvia', alumnoId: r.alumnoId, referencia: `sesion:${sesionId}:cancelada:${r.alumnoId}`,
        vars: { grupo: s.grupo, fecha: formatoFecha(s.fecha), hora: s.horaInicio, alumno: one<{ nombre: string }>('SELECT nombre FROM alumno WHERE id=?', r.alumnoId)!.nombre },
      });
    }
    // Quienes tenían reservada una recuperación en esta sesión vuelven a tener el derecho pendiente.
    run("UPDATE recuperacion SET estado='pendiente', sesionDestinoId=NULL WHERE sesionDestinoId=? AND estado='reservada'", sesionId);
    return ok(`Clase cancelada. Se han creado ${recs.length} recuperaciones y ${recs.length} avisos pendientes de revisión en Mensajes.`, { afectados: recs.length });
  });
}

export function descripcionSesion(s: Pick<SesionRow, 'fecha' | 'horaInicio' | 'duracionMin' | 'grupo'>) {
  return `${s.grupo} · ${formatoFecha(s.fecha)} ${s.horaInicio}–${horaFin(s.horaInicio, s.duracionMin)}`;
}

export { sumarDias };
