import { all, one, run, tx, hoyISO } from '../db';
import { formatoFecha } from '../rules';
import { crearMensaje, fail, ok, type Result } from './common';

export type MensajeRow = {
  id: number; destinatarioTipo: string; destinatarioId: number; plantilla: string; texto: string; canal: string; estado: string;
  creadoEn: string; referencia: string | null; destinatario: string; telefono: string | null;
};

const SEL = `SELECT m.*,
  CASE m.destinatarioTipo WHEN 'tutor' THEN (SELECT nombre FROM tutor WHERE id = m.destinatarioId)
    WHEN 'alumno' THEN (SELECT nombre || ' ' || apellidos FROM alumno WHERE id = m.destinatarioId) ELSE 'Coordinación de la escuela' END AS destinatario,
  CASE m.destinatarioTipo WHEN 'tutor' THEN (SELECT telefono FROM tutor WHERE id = m.destinatarioId)
    WHEN 'alumno' THEN (SELECT telefono FROM alumno WHERE id = m.destinatarioId) ELSE NULL END AS telefono
  FROM mensaje m`;

export function listarMensajes(estado?: string): MensajeRow[] {
  return all<MensajeRow>(`${SEL} ${estado ? 'WHERE m.estado = ?' : ''} ORDER BY m.creadoEn DESC, m.id DESC`, ...(estado ? [estado] : []));
}

export function mensajesDeTutor(tutorId: number): MensajeRow[] {
  return all<MensajeRow>(`${SEL} WHERE m.destinatarioTipo = 'tutor' AND m.destinatarioId = ? AND m.estado = 'enviadoSimulado' ORDER BY m.creadoEn DESC`, tutorId);
}

export function aprobarMensaje(id: number): Result {
  const r = run("UPDATE mensaje SET estado='enviadoSimulado' WHERE id=? AND estado='pendienteRevision'", id);
  return r.changes ? ok('Mensaje aprobado y enviado (simulado).') : fail('El mensaje ya estaba enviado.');
}

export function aprobarTodos(ids: number[]): Result {
  let n = 0;
  tx(() => { for (const id of ids) n += run("UPDATE mensaje SET estado='enviadoSimulado' WHERE id=? AND estado='pendienteRevision'", id).changes; });
  return ok(`${n} mensajes aprobados y enviados (simulado).`);
}

export function descartarMensaje(id: number): Result {
  run("DELETE FROM mensaje WHERE id=? AND estado='pendienteRevision'", id);
  return ok('Mensaje descartado.');
}

export function editarTextoMensaje(id: number, texto: string): Result {
  run("UPDATE mensaje SET texto=? WHERE id=? AND estado='pendienteRevision'", texto, id);
  return ok('Texto actualizado.');
}

export function listarPlantillas() {
  return all<{ clave: string; nombre: string; texto: string }>('SELECT * FROM plantilla ORDER BY rowid');
}

export function guardarPlantilla(clave: string, texto: string): Result {
  if (!texto.trim()) return fail('El texto no puede estar vacío.');
  run('UPDATE plantilla SET texto=? WHERE clave=?', texto.trim(), clave);
  return ok('Plantilla guardada.');
}

/** Envío masivo: a un grupo entero o a todos los alumnos de un nivel. Entra como pendiente de revisión. */
export function envioMasivo(args: { plantilla: string; grupoId?: number; nivel?: string; alumnoId?: number; fecha?: string; hora?: string }): Result<{ creados: number }> {
  let alumnos: { id: number; nombre: string; grupo: string }[] = [];
  if (args.alumnoId) {
    alumnos = all("SELECT id, nombre, '' AS grupo FROM alumno WHERE id=?", args.alumnoId);
  } else if (args.grupoId) {
    alumnos = all('SELECT a.id, a.nombre, g.nombre AS grupo FROM inscripcion i JOIN alumno a ON a.id=i.alumnoId JOIN grupo g ON g.id=i.grupoId WHERE i.grupoId=? AND i.fechaBaja IS NULL', args.grupoId);
  } else if (args.nivel) {
    alumnos = all("SELECT DISTINCT a.id, a.nombre, '' AS grupo FROM alumno a WHERE a.estado='activo' AND a.nivel=?", args.nivel);
  } else {
    alumnos = all("SELECT a.id, a.nombre, '' AS grupo FROM alumno a WHERE a.estado='activo'");
  }
  if (!alumnos.length) return fail('No hay destinatarios para esa selección.') as Result<any>;
  const vistos = new Set<string>(); let creados = 0;
  tx(() => {
    for (const a of alumnos) {
      const al = one<{ tutorId: number | null }>('SELECT tutorId FROM alumno WHERE id=?', a.id)!;
      const clave = al.tutorId ? `t${al.tutorId}` : `a${a.id}`;
      if (vistos.has(clave)) continue; // una familia con dos hijos en el grupo recibe un solo mensaje
      vistos.add(clave);
      const id = crearMensaje({
        plantilla: args.plantilla, alumnoId: a.id,
        vars: { alumno: a.nombre, grupo: a.grupo || 'tu grupo', fecha: args.fecha ? formatoFecha(args.fecha) : formatoFecha(hoyISO()), hora: args.hora || '' },
      });
      if (id) creados++;
    }
  });
  return ok(`${creados} mensajes creados, pendientes de revisión en la bandeja de salida.`, { creados });
}
