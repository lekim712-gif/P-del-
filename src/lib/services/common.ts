import { all, one, run, ahora, hoyISO, getConfig } from '../db';
import { aISO, calcularCuota, estadoCuota, fechaHora, fechaVencimientoCuota, mesDe, tramoRecordatorio, formatoEuro, formatoFecha, type TipoRecordatorio } from '../rules';
import { ESCUELA, renderPlantilla } from '../plantillas';

export type Result<T = unknown> = { ok: boolean; msg: string; data?: T };
export const ok = <T,>(msg: string, data?: T): Result<T> => ({ ok: true, msg, data });
export const fail = (msg: string): Result => ({ ok: false, msg });

export const GRUPO_SELECT = `
  SELECT g.*, p.nombre AS profesor, pi.nombre AS pista,
    (SELECT COUNT(*) FROM inscripcion i WHERE i.grupoId = g.id AND i.fechaBaja IS NULL) AS inscritos,
    (SELECT COUNT(*) FROM listaEspera l WHERE l.grupoId = g.id) AS espera
  FROM grupo g JOIN profesor p ON p.id = g.profesorId JOIN pista pi ON pi.id = g.pistaId`;

export type GrupoRow = {
  id: number; nombre: string; nivel: string; categoria: 'adultos' | 'infantil'; profesorId: number; pistaId: number;
  diaSemana: number; horaInicio: string; duracionMin: number; plazasMax: number; precioMensual: number;
  profesor: string; pista: string; inscritos: number; espera: number;
};

export function horaFin(inicio: string, min: number): string {
  const [h, m] = inicio.split(':').map(Number);
  const t = h * 60 + m + min;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// ------------------------------------------------------------------ cuotas
export function recalcularCuotaAlumno(alumnoId: number, mes = mesDe(hoyISO())) {
  const cfg = getConfig();
  const al = one<{ id: number; tutorId: number | null; estado: string }>('SELECT id, tutorId, estado FROM alumno WHERE id = ?', alumnoId);
  if (!al) return;
  const precios = all<{ precioMensual: number }>(
    'SELECT g.precioMensual FROM inscripcion i JOIN grupo g ON g.id = i.grupoId WHERE i.alumnoId = ? AND i.fechaBaja IS NULL', alumnoId,
  ).map((r) => r.precioMensual);
  const existente = one<{ id: number; estado: string }>('SELECT id, estado FROM cuota WHERE alumnoId = ? AND mes = ?', alumnoId, mes);
  if (existente?.estado === 'pagada') return;
  if (precios.length === 0) {
    if (existente) run('DELETE FROM cuota WHERE id = ?', existente.id);
    return;
  }
  const hermano = !!al.tutorId && !!one(
    `SELECT 1 FROM alumno a WHERE a.tutorId = ? AND a.id <> ? AND EXISTS
       (SELECT 1 FROM inscripcion i WHERE i.alumnoId = a.id AND i.fechaBaja IS NULL)`, al.tutorId, alumnoId,
  );
  const c = calcularCuota(precios, hermano, cfg);
  const venc = fechaVencimientoCuota(mes, cfg.diaVencimiento);
  const estado = estadoCuota({ fechaVencimiento: venc, fechaPago: null }, ahora());
  if (existente) {
    run('UPDATE cuota SET importeBase=?, descuento=?, importeFinal=?, estado=?, fechaVencimiento=? WHERE id=?', c.importeBase, c.descuento, c.importeFinal, estado, venc, existente.id);
  } else {
    run('INSERT INTO cuota (alumnoId, mes, importeBase, descuento, importeFinal, estado, fechaVencimiento) VALUES (?,?,?,?,?,?,?)', alumnoId, mes, c.importeBase, c.descuento, c.importeFinal, estado, venc);
  }
}

/** Recalcula al alumno y a sus hermanos (el descuento por hermano depende de ellos). */
export function recalcularFamilia(alumnoId: number) {
  recalcularCuotaAlumno(alumnoId);
  const al = one<{ tutorId: number | null }>('SELECT tutorId FROM alumno WHERE id = ?', alumnoId);
  if (al?.tutorId) {
    for (const h of all<{ id: number }>('SELECT id FROM alumno WHERE tutorId = ? AND id <> ?', al.tutorId, alumnoId)) recalcularCuotaAlumno(h.id);
  }
}

/** Mantiene coherente pendiente/vencida con la fecha de hoy (la regla 6 se evalúa al consultar). */
export function actualizarEstadosCuotas() {
  const hoy = hoyISO();
  run("UPDATE cuota SET estado='vencida' WHERE fechaPago IS NULL AND fechaVencimiento < ? AND estado <> 'vencida'", hoy);
  run("UPDATE cuota SET estado='pendiente' WHERE fechaPago IS NULL AND fechaVencimiento >= ? AND estado <> 'pendiente'", hoy);
}

// ------------------------------------------------------------------ mensajes
export function destinatarioDe(alumnoId: number) {
  const a = one<{ nombre: string; telefono: string | null; email: string | null; tutorId: number | null }>('SELECT nombre, telefono, email, tutorId FROM alumno WHERE id = ?', alumnoId)!;
  if (a.tutorId) {
    const t = one<{ id: number; nombre: string; telefono: string | null; email: string | null }>('SELECT id, nombre, telefono, email FROM tutor WHERE id = ?', a.tutorId)!;
    return { tipo: 'tutor', id: t.id, nombre: t.nombre.split(' ')[0], canal: t.telefono ? 'whatsapp' : 'email' } as const;
  }
  return { tipo: 'alumno', id: alumnoId, nombre: a.nombre, canal: a.telefono ? 'whatsapp' : 'email' } as const;
}

export function crearMensaje(args: {
  plantilla: string; alumnoId?: number; destinatarioTipo?: string; destinatarioId?: number;
  vars: Record<string, string | number | undefined>; estado?: 'pendienteRevision' | 'enviadoSimulado'; referencia?: string | null;
}): number | null {
  if (args.referencia && one('SELECT 1 FROM mensaje WHERE referencia = ?', args.referencia)) return null;
  const tpl = one<{ texto: string }>('SELECT texto FROM plantilla WHERE clave = ?', args.plantilla);
  if (!tpl) return null;
  let tipo = args.destinatarioTipo ?? 'alumno'; let id = args.destinatarioId ?? 0; let nombre = '';
  let canal: 'whatsapp' | 'email' = 'whatsapp';
  if (args.alumnoId) {
    const d = destinatarioDe(args.alumnoId);
    tipo = d.tipo; id = d.id; nombre = d.nombre; canal = d.canal;
  }
  const texto = renderPlantilla(tpl.texto, { destinatario: nombre, escuela: ESCUELA, ...args.vars });
  const ahoraD = ahora();
  const creadoEn = `${aISO(ahoraD)}T${String(ahoraD.getHours()).padStart(2, '0')}:${String(ahoraD.getMinutes()).padStart(2, '0')}`;
  return run(
    'INSERT INTO mensaje (destinatarioTipo, destinatarioId, plantilla, texto, canal, estado, creadoEn, referencia) VALUES (?,?,?,?,?,?,?,?)',
    tipo, id, args.plantilla, texto, canal, args.estado ?? 'pendienteRevision', creadoEn, args.referencia ?? null,
  ).id;
}

export const NOMBRE_TIPO_RECORDATORIO: Record<TipoRecordatorio, string> = {
  recordatorio: 'Recordatorio (3 días antes)', aviso1: 'Primer aviso (2 días de retraso)',
  aviso2: 'Segundo aviso (10 días)', coordinador: 'Aviso al coordinador (20 días)',
};

export function generarRecordatoriosCuotas(): { creados: number; porTipo: Record<string, number> } {
  actualizarEstadosCuotas();
  const hoy = ahora();
  const cuotas = all<{ id: number; alumnoId: number; mes: string; importeFinal: number; fechaVencimiento: string; alumno: string }>(
    `SELECT c.id, c.alumnoId, c.mes, c.importeFinal, c.fechaVencimiento, a.nombre AS alumno
     FROM cuota c JOIN alumno a ON a.id = c.alumnoId WHERE c.fechaPago IS NULL ORDER BY c.fechaVencimiento`,
  );
  const porTipo: Record<string, number> = {};
  let creados = 0;
  for (const c of cuotas) {
    const tipo = tramoRecordatorio(c.fechaVencimiento, hoy);
    if (!tipo) continue;
    const vars = { alumno: c.alumno, mes: c.mes, importe: formatoEuro(c.importeFinal), vencimiento: formatoFecha(c.fechaVencimiento) };
    const id = tipo === 'coordinador'
      ? crearMensaje({ plantilla: 'coordinador', destinatarioTipo: 'coordinador', destinatarioId: 0, vars, referencia: `cuota:${c.id}:coordinador` })
      : crearMensaje({ plantilla: tipo, alumnoId: c.alumnoId, vars, referencia: `cuota:${c.id}:${tipo}` });
    if (id) { creados++; porTipo[tipo] = (porTipo[tipo] ?? 0) + 1; }
  }
  return { creados, porTipo };
}

export { fechaHora };
