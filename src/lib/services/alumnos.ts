import { all, one, run, tx, ahora, hoyISO, getConfig } from '../db';
import {
  NIVELES, calcularEdad, decidirInscripcion, fechaHora, fechaValida, primeroDeLaLista, validarInscripcionMenor, aISO,
} from '../rules';
import { GRUPO_SELECT, fail, ok, recalcularFamilia, type GrupoRow, type Result } from './common';

export type AlumnoRow = {
  id: number; nombre: string; apellidos: string; fechaNacimiento: string; telefono: string | null; email: string | null;
  nivel: string; estado: string; fechaAlta: string; notas: string | null; tutorId: number | null;
  tutor: string | null; grupos: string | null; cuotaPendiente: number; edad: number;
};

export function listAlumnos(f: { q?: string; nivel?: string; estado?: string; grupo?: number; cuota?: string; orden?: string }): AlumnoRow[] {
  const where: string[] = []; const p: (string | number)[] = [];
  if (f.q) {
    where.push("(lower(a.nombre || ' ' || a.apellidos) LIKE ? OR a.email LIKE ? OR a.telefono LIKE ?)");
    p.push(`%${f.q.toLowerCase()}%`, `%${f.q.toLowerCase()}%`, `%${f.q}%`);
  }
  if (f.nivel) { where.push('a.nivel = ?'); p.push(f.nivel); }
  if (f.estado) { where.push('a.estado = ?'); p.push(f.estado); }
  if (f.grupo) { where.push('EXISTS (SELECT 1 FROM inscripcion i WHERE i.alumnoId = a.id AND i.grupoId = ? AND i.fechaBaja IS NULL)'); p.push(f.grupo); }
  if (f.cuota === 'pendiente') where.push("EXISTS (SELECT 1 FROM cuota c WHERE c.alumnoId = a.id AND c.estado <> 'pagada')");
  const orden = ({ nombre: 'a.apellidos, a.nombre', nivel: 'a.nivel, a.apellidos', alta: 'a.fechaAlta DESC', estado: 'a.estado, a.apellidos' } as Record<string, string>)[f.orden ?? ''] ?? 'a.apellidos, a.nombre';
  const filas = all<Omit<AlumnoRow, 'edad'>>(
    `SELECT a.*, t.nombre AS tutor,
       (SELECT group_concat(g.nombre, ' | ') FROM inscripcion i JOIN grupo g ON g.id = i.grupoId WHERE i.alumnoId = a.id AND i.fechaBaja IS NULL) AS grupos,
       (SELECT COALESCE(SUM(c.importeFinal), 0) FROM cuota c WHERE c.alumnoId = a.id AND c.estado <> 'pagada') AS cuotaPendiente
     FROM alumno a LEFT JOIN tutor t ON t.id = a.tutorId
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orden}`, ...p,
  );
  const hoy = ahora();
  return filas.map((a) => ({ ...a, edad: calcularEdad(a.fechaNacimiento, hoy) }));
}

export function getAlumno(id: number) {
  const a = one<AlumnoRow>('SELECT a.*, t.nombre AS tutor FROM alumno a LEFT JOIN tutor t ON t.id = a.tutorId WHERE a.id = ?', id);
  if (!a) return null;
  const hoy = ahora();
  const tutor = a.tutorId ? one<{ id: number; nombre: string; telefono: string | null; email: string | null; consentimientoFecha: string | null; consentimientoVersion: string | null }>('SELECT * FROM tutor WHERE id = ?', a.tutorId) : null;
  const grupos = all<GrupoRow & { inscripcionId: number }>(`${GRUPO_SELECT} JOIN inscripcion i ON i.grupoId = g.id WHERE i.alumnoId = ? AND i.fechaBaja IS NULL`.replace('SELECT g.*,', 'SELECT i.id AS inscripcionId, g.*,'), id);
  const espera = all<{ id: number; grupoId: number; nombre: string; fechaSolicitud: string }>('SELECT l.id, l.grupoId, g.nombre, l.fechaSolicitud FROM listaEspera l JOIN grupo g ON g.id = l.grupoId WHERE l.alumnoId = ?', id);
  const asistencia = all<{ fecha: string; estado: string; grupo: string }>(
    `SELECT s.fecha, a.estado, g.nombre AS grupo FROM asistencia a JOIN sesion s ON s.id = a.sesionId JOIN grupo g ON g.id = s.grupoId
     WHERE a.alumnoId = ? ORDER BY s.fecha DESC LIMIT 8`, id);
  const recuperaciones = all<{ id: number; estado: string; caducaEn: string; origen: string; fechaOrigen: string }>(
    `SELECT r.id, r.estado, r.caducaEn, r.origen, s.fecha AS fechaOrigen FROM recuperacion r JOIN sesion s ON s.id = r.sesionOrigenId WHERE r.alumnoId = ? ORDER BY s.fecha DESC LIMIT 8`, id);
  const cuotas = all<{ id: number; mes: string; importeFinal: number; descuento: number; estado: string; fechaVencimiento: string }>('SELECT id, mes, importeFinal, descuento, estado, fechaVencimiento FROM cuota WHERE alumnoId = ? ORDER BY mes DESC', id);
  const hermanos = a.tutorId ? all<{ id: number; nombre: string; apellidos: string }>('SELECT id, nombre, apellidos FROM alumno WHERE tutorId = ? AND id <> ?', a.tutorId, id) : [];
  return { ...a, edad: calcularEdad(a.fechaNacimiento, hoy), tutorInfo: tutor, grupos, espera, asistencia, recuperaciones, cuotas, hermanos };
}

export type AlumnoInput = {
  id?: number; nombre: string; apellidos: string; fechaNacimiento: string; telefono?: string; email?: string; nivel: string; notas?: string;
  tutorId?: number | null; tutorNuevo?: { nombre: string; telefono?: string; email?: string; consentimiento: boolean };
};

export function validarAlumno(i: AlumnoInput): string[] {
  const e: string[] = [];
  if (!i.nombre?.trim()) e.push('El nombre es obligatorio.');
  if (!i.apellidos?.trim()) e.push('Los apellidos son obligatorios.');
  if (!fechaValida(i.fechaNacimiento ?? '')) e.push('La fecha de nacimiento no es válida.');
  else if (fechaHora(i.fechaNacimiento) > ahora()) e.push('La fecha de nacimiento no puede ser futura.');
  if (!(NIVELES as readonly string[]).includes(i.nivel)) e.push('El nivel no es válido.');
  if (i.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(i.email)) e.push('El email no es válido.');
  return e;
}

export function guardarAlumno(i: AlumnoInput): Result<{ id: number }> {
  const errores = validarAlumno(i);
  let tutorId = i.tutorId ?? null;
  if (errores.length === 0 && /^\d{4}-\d{2}-\d{2}$/.test(i.fechaNacimiento)) {
    const edad = calcularEdad(i.fechaNacimiento, ahora());
    if (edad < getConfig().edadMinimaSinTutor) {
      const tutorExistente = tutorId ? one<{ consentimientoFecha: string | null }>('SELECT consentimientoFecha FROM tutor WHERE id = ?', tutorId) : undefined;
      const nuevoOk = i.tutorNuevo?.nombre?.trim() && i.tutorNuevo.consentimiento;
      if (!tutorExistente && !i.tutorNuevo?.nombre?.trim()) errores.push(`Es menor de ${getConfig().edadMinimaSinTutor} años: indica un tutor.`);
      else if (tutorExistente && !tutorExistente.consentimientoFecha) errores.push('El tutor seleccionado no tiene consentimiento registrado.');
      else if (!tutorExistente && !nuevoOk) errores.push('Marca el consentimiento del tutor para poder guardar al menor.');
    }
  }
  if (errores.length) return fail(errores.join(' ')) as Result<any>;
  return tx(() => {
    if (!tutorId && i.tutorNuevo?.nombre?.trim()) {
      const cfg = getConfig();
      tutorId = run('INSERT INTO tutor (nombre, telefono, email, consentimientoFecha, consentimientoVersion) VALUES (?,?,?,?,?)',
        i.tutorNuevo.nombre.trim(), i.tutorNuevo.telefono || null, i.tutorNuevo.email || null,
        i.tutorNuevo.consentimiento ? hoyISO() : null, i.tutorNuevo.consentimiento ? cfg.consentimientoVersion : null).id;
    }
    if (i.id) {
      run('UPDATE alumno SET nombre=?, apellidos=?, fechaNacimiento=?, telefono=?, email=?, nivel=?, notas=?, tutorId=? WHERE id=?',
        i.nombre.trim(), i.apellidos.trim(), i.fechaNacimiento, i.telefono || null, i.email || null, i.nivel, i.notas || null, tutorId, i.id);
      return ok('Alumno actualizado.', { id: i.id });
    }
    const id = run("INSERT INTO alumno (nombre, apellidos, fechaNacimiento, telefono, email, nivel, estado, fechaAlta, notas, tutorId) VALUES (?,?,?,?,?,?,'espera',?,?,?)",
      i.nombre.trim(), i.apellidos.trim(), i.fechaNacimiento, i.telefono || null, i.email || null, i.nivel, hoyISO(), i.notas || null, tutorId).id;
    return ok('Alumno creado. Ya puedes inscribirlo en un grupo.', { id });
  });
}

function refrescarEstadoAlumno(alumnoId: number) {
  const tiene = one('SELECT 1 FROM inscripcion WHERE alumnoId=? AND fechaBaja IS NULL', alumnoId);
  const enEspera = one('SELECT 1 FROM listaEspera WHERE alumnoId=?', alumnoId);
  const actual = one<{ estado: string }>('SELECT estado FROM alumno WHERE id=?', alumnoId)!.estado;
  if (tiene) run("UPDATE alumno SET estado='activo' WHERE id=?", alumnoId);
  else if (enEspera) run("UPDATE alumno SET estado='espera' WHERE id=?", alumnoId);
  else if (actual === 'activo') run("UPDATE alumno SET estado='baja' WHERE id=?", alumnoId);
}

// -------------------------------------------------------------- inscripciones (reglas 1 y 9)
export function inscribir(alumnoId: number, grupoId: number, opts: { forzarInscripcion?: boolean } = {}): Result<{ resultado: 'inscrito' | 'espera' }> {
  const al = one<{ nombre: string; apellidos: string; fechaNacimiento: string; tutorId: number | null }>('SELECT * FROM alumno WHERE id=?', alumnoId);
  const g = one<GrupoRow>(`${GRUPO_SELECT} WHERE g.id=?`, grupoId);
  if (!al || !g) return fail('No se encuentra el alumno o el grupo.') as Result<any>;
  const tutor = al.tutorId ? one<{ consentimientoFecha: string | null }>('SELECT consentimientoFecha FROM tutor WHERE id=?', al.tutorId) ?? null : null;
  const val = validarInscripcionMenor(al.fechaNacimiento, tutor, ahora(), getConfig());
  if (!val.ok) return fail(`No se puede inscribir a ${al.nombre}: ${val.motivo}`) as Result<any>;
  if (one('SELECT 1 FROM inscripcion WHERE alumnoId=? AND grupoId=? AND fechaBaja IS NULL', alumnoId, grupoId)) return fail(`${al.nombre} ya está inscrito en este grupo.`) as Result<any>;
  if (g.categoria === 'infantil' && calcularEdad(al.fechaNacimiento, ahora()) >= 14) return fail('Los grupos infantiles son para menores de 14 años.') as Result<any>;

  const decision = opts.forzarInscripcion ? 'inscribir' : decidirInscripcion(g.inscritos, g.plazasMax);
  return tx(() => {
    if (decision === 'espera') {
      if (!one('SELECT 1 FROM listaEspera WHERE alumnoId=? AND grupoId=?', alumnoId, grupoId)) {
        run('INSERT INTO listaEspera (alumnoId, grupoId, fechaSolicitud) VALUES (?,?,?)', alumnoId, grupoId, hoyISO());
      }
      refrescarEstadoAlumno(alumnoId);
      const pos = one<{ n: number }>('SELECT COUNT(*) n FROM listaEspera WHERE grupoId=?', grupoId)!.n;
      return ok(`El grupo está completo (${g.inscritos}/${g.plazasMax}). ${al.nombre} pasa a la lista de espera (puesto ${pos}).`, { resultado: 'espera' as const });
    }
    run('INSERT INTO inscripcion (alumnoId, grupoId, fechaAlta) VALUES (?,?,?)', alumnoId, grupoId, hoyISO());
    run('DELETE FROM listaEspera WHERE alumnoId=? AND grupoId=?', alumnoId, grupoId);
    refrescarEstadoAlumno(alumnoId);
    recalcularFamilia(alumnoId);
    return ok(`${al.nombre} queda inscrito en ${g.nombre}.`, { resultado: 'inscrito' as const });
  });
}

export function proponerDeLaLista(grupoId: number) {
  const lista = all<{ id: number; alumnoId: number; fechaSolicitud: string }>('SELECT * FROM listaEspera WHERE grupoId=?', grupoId);
  return primeroDeLaLista(lista);
}

export function promoverDeEspera(grupoId: number): Result {
  const g = one<GrupoRow>(`${GRUPO_SELECT} WHERE g.id=?`, grupoId);
  if (!g) return fail('Grupo no encontrado.');
  if (g.inscritos >= g.plazasMax) return fail('El grupo sigue completo: no hay plaza libre.');
  const primero = proponerDeLaLista(grupoId);
  if (!primero) return fail('No hay nadie en la lista de espera.');
  return inscribir(primero.alumnoId, grupoId);
}

export function darDeBaja(alumnoId: number, grupoId: number): Result {
  const insc = one<{ id: number }>('SELECT id FROM inscripcion WHERE alumnoId=? AND grupoId=? AND fechaBaja IS NULL', alumnoId, grupoId);
  if (!insc) return fail('El alumno no está inscrito en ese grupo.');
  return tx(() => {
    run('UPDATE inscripcion SET fechaBaja=? WHERE id=?', hoyISO(), insc.id);
    refrescarEstadoAlumno(alumnoId);
    recalcularFamilia(alumnoId);
    const primero = proponerDeLaLista(grupoId);
    const extra = primero ? ` Hay plaza libre: se propone a ${nombreAlumno(primero.alumnoId)} (primero de la lista de espera).` : '';
    return ok(`Baja registrada.${extra}`);
  });
}

export function nombreAlumno(id: number) {
  const a = one<{ nombre: string; apellidos: string }>('SELECT nombre, apellidos FROM alumno WHERE id=?', id);
  return a ? `${a.nombre} ${a.apellidos}` : '—';
}

export function moverDeGrupo(alumnoId: number, origenId: number, destinoId: number): Result {
  const destino = one<GrupoRow>(`${GRUPO_SELECT} WHERE g.id=?`, destinoId);
  if (!destino) return fail('Grupo destino no encontrado.');
  if (origenId === destinoId) return fail('El grupo destino es el mismo.');
  if (destino.inscritos >= destino.plazasMax) return fail(`${destino.nombre} está completo (${destino.inscritos}/${destino.plazasMax}).`);
  const antes = one<{ importeFinal: number }>('SELECT importeFinal FROM cuota WHERE alumnoId=? AND mes=?', alumnoId, hoyISO().slice(0, 7));
  const r = tx(() => {
    const b = darDeBaja(alumnoId, origenId);
    if (!b.ok) return b;
    return inscribir(alumnoId, destinoId);
  });
  if (!r.ok) return r;
  const despues = one<{ importeFinal: number }>('SELECT importeFinal FROM cuota WHERE alumnoId=? AND mes=?', alumnoId, hoyISO().slice(0, 7));
  const delta = antes && despues && antes.importeFinal !== despues.importeFinal ? ` Cuota recalculada: ${antes.importeFinal.toFixed(2)} € → ${despues.importeFinal.toFixed(2)} €.` : '';
  return ok(`Alumno movido a ${destino.nombre}.${delta}`);
}

export function quitarDeEspera(esperaId: number): Result {
  const e = one<{ alumnoId: number }>('SELECT alumnoId FROM listaEspera WHERE id=?', esperaId);
  if (!e) return fail('No existe esa solicitud.');
  run('DELETE FROM listaEspera WHERE id=?', esperaId);
  refrescarEstadoAlumno(e.alumnoId);
  return ok('Quitado de la lista de espera.');
}

// -------------------------------------------------------------- importación CSV
export type FilaCSV = {
  linea: number; datos: Record<string, string>; estado: 'ok' | 'duplicado' | 'error'; mensajes: string[];
  parsed?: AlumnoInput;
};

function normaliza(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export function parseCSV(texto: string): string[][] {
  const sep = (texto.split('\n')[0].match(/;/g)?.length ?? 0) > (texto.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const filas: string[][] = []; let fila: string[] = []; let cur = ''; let q = false;
  const t = texto.replace(/^﻿/, '');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) { fila.push(cur); cur = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      fila.push(cur); cur = '';
      if (fila.some((x) => x.trim() !== '')) filas.push(fila);
      fila = [];
    } else cur += c;
  }
  fila.push(cur);
  if (fila.some((x) => x.trim() !== '')) filas.push(fila);
  return filas;
}

function parseFecha(s: string): string | null {
  const t = s.trim();
  let m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return t;
  return null;
}

export function previsualizarCSV(texto: string): { filas: FilaCSV[]; error?: string } {
  const filas = parseCSV(texto);
  if (filas.length < 2) return { filas: [], error: 'El archivo está vacío o solo tiene la cabecera.' };
  const cab = filas[0].map((c) => normaliza(c).replace(/\s+/g, ''));
  const col = (n: string) => cab.indexOf(n);
  for (const req of ['nombre', 'apellidos', 'fechanacimiento']) {
    if (col(req) < 0) return { filas: [], error: `Falta la columna obligatoria «${req}». Usa el archivo de ejemplo como plantilla.` };
  }
  const existentes = all<{ nombre: string; apellidos: string; fechaNacimiento: string; email: string | null; telefono: string | null }>('SELECT nombre, apellidos, fechaNacimiento, email, telefono FROM alumno');
  const claveExistente = new Set(existentes.map((e) => `${normaliza(e.nombre)}|${normaliza(e.apellidos)}|${e.fechaNacimiento}`));
  const emailsExistentes = new Set(existentes.filter((e) => e.email).map((e) => normaliza(e.email!)));
  const vistos = new Map<string, number>();
  const hoy = ahora();
  const cfg = getConfig();

  const out: FilaCSV[] = filas.slice(1).map((f, idx) => {
    const get = (n: string) => (col(n) >= 0 ? (f[col(n)] ?? '').trim() : '');
    const datos = Object.fromEntries(cab.map((c, i) => [c, (f[i] ?? '').trim()]));
    const mensajes: string[] = [];
    const fecha = parseFecha(get('fechanacimiento'));
    if (!get('nombre')) mensajes.push('Falta el nombre.');
    if (!get('apellidos')) mensajes.push('Faltan los apellidos.');
    if (!fecha || !fechaValida(fecha)) mensajes.push(`Fecha de nacimiento no válida («${get('fechanacimiento')}»). Usa dd/mm/aaaa.`);
    else if (fechaHora(fecha) > hoy) mensajes.push('La fecha de nacimiento es futura.');
    const nivelRaw = normaliza(get('nivel')) || 'iniciacion';
    const nivel = (NIVELES as readonly string[]).find((n) => n === nivelRaw);
    if (!nivel) mensajes.push(`Nivel desconocido «${get('nivel')}» (usa iniciación, intermedio, avanzado o competición).`);
    if (get('email') && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(get('email'))) mensajes.push(`Email no válido «${get('email')}».`);
    const consiente = ['si', 'sí', 's', '1', 'true', 'x'].includes(normaliza(get('consentimiento')));
    let esMenor = false;
    if (fecha && mensajes.length === 0) {
      esMenor = calcularEdad(fecha, hoy) < cfg.edadMinimaSinTutor;
      if (esMenor && !get('tutornombre')) mensajes.push(`Menor de ${cfg.edadMinimaSinTutor} años sin tutor.`);
      if (esMenor && get('tutornombre') && !consiente) mensajes.push('El tutor no tiene el consentimiento marcado (columna «consentimiento»).');
    }
    let estado: FilaCSV['estado'] = mensajes.length ? 'error' : 'ok';
    if (estado === 'ok' && fecha) {
      const clave = `${normaliza(get('nombre'))}|${normaliza(get('apellidos'))}|${fecha}`;
      if (claveExistente.has(clave) || (get('email') && emailsExistentes.has(normaliza(get('email'))))) {
        estado = 'duplicado'; mensajes.push('Ya existe un alumno con esos datos en la base.');
      } else if (vistos.has(clave)) {
        estado = 'duplicado'; mensajes.push(`Repetido en el archivo (igual que la línea ${vistos.get(clave)}).`);
      } else vistos.set(clave, idx + 2);
    }
    const parsed: AlumnoInput | undefined = estado === 'ok' ? {
      nombre: get('nombre'), apellidos: get('apellidos'), fechaNacimiento: fecha!, telefono: get('telefono'), email: get('email'), nivel: nivel!,
      notas: get('notas'),
      tutorNuevo: get('tutornombre') ? { nombre: get('tutornombre'), telefono: get('tutortelefono'), email: get('tutoremail'), consentimiento: consiente } : undefined,
    } : undefined;
    return { linea: idx + 2, datos, estado, mensajes, parsed };
  });
  return { filas: out };
}

export function importarCSV(texto: string): Result<{ importados: number; omitidos: number }> {
  const prev = previsualizarCSV(texto);
  if (prev.error) return fail(prev.error) as Result<any>;
  let importados = 0; let omitidos = 0;
  tx(() => {
    const tutoresCreados = new Map<string, number>();
    for (const f of prev.filas) {
      if (f.estado !== 'ok' || !f.parsed) { omitidos++; continue; }
      const p = f.parsed;
      if (p.tutorNuevo) {
        // Hermanos en el mismo CSV comparten tutor si coincide el nombre.
        const k = normaliza(p.tutorNuevo.nombre);
        const existente = tutoresCreados.get(k) ?? one<{ id: number }>('SELECT id FROM tutor WHERE lower(nombre) = ?', p.tutorNuevo.nombre.toLowerCase())?.id;
        if (existente) { p.tutorId = existente; p.tutorNuevo = undefined; }
      }
      const r = guardarAlumno(p);
      if (r.ok) {
        importados++;
        const nuevo = one<{ tutorId: number | null }>('SELECT tutorId FROM alumno WHERE id=?', r.data!.id);
        if (nuevo?.tutorId && f.parsed?.tutorNuevo === undefined) { /* tutor reutilizado */ }
        const t = f.datos['tutornombre'];
        if (t && nuevo?.tutorId) tutoresCreados.set(normaliza(t), nuevo.tutorId);
      } else omitidos++;
    }
  });
  return ok(`Importados ${importados} alumnos. Omitidos: ${omitidos} (duplicados o con errores).`, { importados, omitidos });
}

export const _aISO = aISO;
