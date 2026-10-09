import { all, one, run, tx, ahora, hoyISO, getConfig } from '../db';
import { diasEntre, encajaDisponibilidad, formatoFecha, haCaducado, mesDe, validarReservaRecuperacion } from '../rules';
import { crearMensaje, fail, ok, type Result } from './common';
import { getDisponibilidad } from './disponibilidad';

export type RecuperacionRow = {
  id: number; alumnoId: number; alumno: string; sesionOrigenId: number; sesionDestinoId: number | null; estado: string; caducaEn: string;
  origen: 'ausencia' | 'cancelacion'; fechaOrigen: string; grupoOrigen: string; nivel: string; diasRestantes: number;
  destinoFecha: string | null; destinoGrupo: string | null; destinoHora: string | null;
};

export function expirarRecuperaciones() {
  run("UPDATE recuperacion SET estado='caducada' WHERE estado='pendiente' AND caducaEn < ?", hoyISO());
}

export function listarRecuperaciones(filtro: { estado?: string; alumnoId?: number; tutorId?: number } = {}): RecuperacionRow[] {
  expirarRecuperaciones();
  const where: string[] = []; const p: (string | number)[] = [];
  if (filtro.estado) { where.push('r.estado = ?'); p.push(filtro.estado); }
  if (filtro.alumnoId) { where.push('r.alumnoId = ?'); p.push(filtro.alumnoId); }
  if (filtro.tutorId) { where.push('a.tutorId = ?'); p.push(filtro.tutorId); }
  const hoy = hoyISO();
  return all<Omit<RecuperacionRow, 'diasRestantes'>>(
    `SELECT r.*, a.nombre || ' ' || a.apellidos AS alumno, so.fecha AS fechaOrigen, go.nombre AS grupoOrigen, go.nivel,
       sd.fecha AS destinoFecha, gd.nombre AS destinoGrupo, gd.horaInicio AS destinoHora
     FROM recuperacion r JOIN alumno a ON a.id = r.alumnoId
     JOIN sesion so ON so.id = r.sesionOrigenId JOIN grupo go ON go.id = so.grupoId
     LEFT JOIN sesion sd ON sd.id = r.sesionDestinoId LEFT JOIN grupo gd ON gd.id = sd.grupoId
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY CASE r.estado WHEN 'pendiente' THEN 0 WHEN 'reservada' THEN 1 WHEN 'usada' THEN 2 ELSE 3 END, r.caducaEn`, ...p,
  ).map((r) => ({ ...r, diasRestantes: diasEntre(hoy, r.caducaEn) }));
}

function usadasEnMes(alumnoId: number, mes: string, excluirId?: number) {
  return one<{ n: number }>(
    `SELECT COUNT(*) n FROM recuperacion r JOIN sesion s ON s.id = r.sesionDestinoId
     WHERE r.alumnoId = ? AND r.origen = 'ausencia' AND r.estado IN ('reservada','usada') AND substr(s.fecha,1,7) = ? AND r.id <> ?`, alumnoId, mes, excluirId ?? 0)!.n;
}

export type SesionCompatible = {
  sesionId: number; fecha: string; horaInicio: string; grupo: string; pista: string; profesor: string; plazasLibres: number;
  valida: boolean; motivo?: string; encaja: boolean;
};

export function sesionesCompatibles(recuperacionId: number): SesionCompatible[] {
  const r = one<{ id: number; alumnoId: number; estado: string; caducaEn: string; origen: 'ausencia' | 'cancelacion'; nivel: string }>(
    `SELECT r.*, g.nivel FROM recuperacion r JOIN sesion s ON s.id = r.sesionOrigenId JOIN grupo g ON g.id = s.grupoId WHERE r.id = ?`, recuperacionId);
  if (!r) return [];
  const ahoraD = ahora();
  const cfg = getConfig();
  const disp = getDisponibilidad(r.alumnoId);
  const cand = all<{ id: number; fecha: string; estado: string; horaInicio: string; nivel: string; grupo: string; pista: string; profesor: string; plazasMax: number; inscritos: number; reservas: number; yaInscrito: number }>(
    `SELECT s.id, s.fecha, s.estado, g.horaInicio, g.nivel, g.nombre AS grupo, pi.nombre AS pista, p.nombre AS profesor, g.plazasMax,
       (SELECT COUNT(*) FROM inscripcion i WHERE i.grupoId = g.id AND i.fechaAlta <= s.fecha AND (i.fechaBaja IS NULL OR i.fechaBaja > s.fecha)) AS inscritos,
       (SELECT COUNT(*) FROM recuperacion x WHERE x.sesionDestinoId = s.id AND x.estado IN ('reservada','usada')) AS reservas,
       (SELECT COUNT(*) FROM inscripcion i WHERE i.grupoId = g.id AND i.alumnoId = ? AND i.fechaBaja IS NULL) AS yaInscrito
     FROM sesion s JOIN grupo g ON g.id = s.grupoId JOIN pista pi ON pi.id = g.pistaId JOIN profesor p ON p.id = g.profesorId
     WHERE s.fecha >= ? AND s.estado = 'programada' AND g.nivel = ? ORDER BY s.fecha, g.horaInicio LIMIT 40`, r.alumnoId, hoyISO(), r.nivel);
  return cand.filter((c) => !c.yaInscrito).map((c) => {
    const libres = c.plazasMax - c.inscritos - c.reservas;
    const v = validarReservaRecuperacion({
      recuperacion: r, nivelOrigen: r.nivel, destino: { fecha: c.fecha, horaInicio: c.horaInicio, nivel: c.nivel, plazasLibres: libres, estado: c.estado },
      usadasEnMes: usadasEnMes(r.alumnoId, mesDe(c.fecha)), ahora: ahoraD, cfg,
    });
    return { sesionId: c.id, fecha: c.fecha, horaInicio: c.horaInicio, grupo: c.grupo, pista: c.pista, profesor: c.profesor, plazasLibres: libres, valida: v.ok, motivo: v.ok ? undefined : v.motivo, encaja: encajaDisponibilidad(new Date(c.fecha + 'T12:00').getDay(), c.horaInicio, disp) };
  }).sort((a, b) => Number(b.valida) - Number(a.valida) || Number(b.encaja) - Number(a.encaja));
}

export function reservarRecuperacion(recuperacionId: number, sesionId: number): Result {
  const opciones = sesionesCompatibles(recuperacionId);
  const op = opciones.find((o) => o.sesionId === sesionId);
  if (!op) return fail('Esa sesión no es compatible con la recuperación.');
  if (!op.valida) return fail(op.motivo ?? 'No se puede reservar esa sesión.');
  return tx(() => {
    const r = one<{ alumnoId: number }>('SELECT alumnoId FROM recuperacion WHERE id=?', recuperacionId)!;
    run("UPDATE recuperacion SET estado='reservada', sesionDestinoId=? WHERE id=?", sesionId, recuperacionId);
    const al = one<{ nombre: string }>('SELECT nombre FROM alumno WHERE id=?', r.alumnoId)!;
    crearMensaje({
      plantilla: 'recuperacion', alumnoId: r.alumnoId, referencia: `recuperacion:${recuperacionId}:reserva:${sesionId}`,
      vars: { alumno: al.nombre, grupo: op.grupo, fecha: formatoFecha(op.fecha), hora: op.horaInicio },
    });
    return ok(`Recuperación reservada: ${op.grupo}, ${formatoFecha(op.fecha)} a las ${op.horaInicio}. Confirmación creada en Mensajes.`);
  });
}

export function liberarReserva(recuperacionId: number): Result {
  const r = one<{ estado: string }>('SELECT estado FROM recuperacion WHERE id=?', recuperacionId);
  if (r?.estado !== 'reservada') return fail('Solo se puede liberar una reserva activa.');
  run("UPDATE recuperacion SET estado='pendiente', sesionDestinoId=NULL WHERE id=?", recuperacionId);
  return ok('Reserva liberada: el derecho vuelve a estar pendiente.');
}

export { haCaducado };
