/**
 * Datos de ejemplo 100 % ficticios. Todo se genera relativo a la fecha actual
 * para que la demo siempre tenga "hoy", historial reciente y sesiones futuras.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import {
  CONFIG_POR_DEFECTO, aISO, calcularCuota, caducidadRecuperacion, diasEntre, fechaHora, fechaVencimientoCuota,
  formatoEuro, formatoFecha, redondear, sumarDias,
} from './rules';
import { ESCUELA, PLANTILLAS_DEFECTO, TEXTO_CONSENTIMIENTO, renderPlantilla } from './plantillas';

type P = string | number | null;

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES_F = ['Lucía', 'Marta', 'Carmen', 'Elena', 'Paula', 'Sara', 'Laura', 'Irene', 'Nuria', 'Alba', 'Rocío', 'Beatriz', 'Cristina', 'Silvia', 'Patricia', 'Ana', 'Inés', 'Raquel', 'Teresa', 'Mónica', 'Claudia', 'Noelia', 'Eva', 'Lorena'];
const NOMBRES_M = ['Javier', 'Daniel', 'Pablo', 'Sergio', 'Alejandro', 'Miguel', 'Adrián', 'Rubén', 'Álvaro', 'Hugo', 'Iván', 'David', 'Jorge', 'Raúl', 'Óscar', 'Diego', 'Marcos', 'Víctor', 'Andrés', 'Fernando', 'Gonzalo', 'Ismael', 'Mateo', 'Enrique'];
const APELLIDOS = ['García', 'Martínez', 'López', 'Sánchez', 'Pérez', 'Gómez', 'Fernández', 'Ruiz', 'Díaz', 'Moreno', 'Muñoz', 'Álvarez', 'Romero', 'Navarro', 'Torres', 'Domínguez', 'Gil', 'Vázquez', 'Serrano', 'Ramos', 'Blanco', 'Molina', 'Castro', 'Ortiz', 'Rubio', 'Marín', 'Iglesias', 'Medina', 'Garrido', 'Cortés', 'Delgado', 'Castillo', 'Santos', 'Lorenzo', 'Guerrero', 'Prieto', 'Vega', 'Peña', 'Crespo', 'Soler'];

type GrupoDef = {
  nivel: string; cat: 'adultos' | 'infantil'; dia: number; hora: string; prof: number; pista: number;
  plazas: number; precio: number; insc: number; espera: number;
};
const NIVEL_NOMBRE: Record<string, string> = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado', competicion: 'Competición' };
const DIA_CORTO = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const GRUPOS: GrupoDef[] = [
  { nivel: 'iniciacion', cat: 'adultos', dia: 1, hora: '19:00', prof: 1, pista: 1, plazas: 6, precio: 58, insc: 6, espera: 2 },
  { nivel: 'intermedio', cat: 'adultos', dia: 1, hora: '20:30', prof: 2, pista: 1, plazas: 6, precio: 62, insc: 6, espera: 1 },
  { nivel: 'avanzado', cat: 'adultos', dia: 2, hora: '20:30', prof: 3, pista: 2, plazas: 5, precio: 68, insc: 4, espera: 0 },
  { nivel: 'iniciacion', cat: 'adultos', dia: 3, hora: '10:00', prof: 1, pista: 3, plazas: 5, precio: 55, insc: 2, espera: 0 },
  { nivel: 'intermedio', cat: 'adultos', dia: 4, hora: '19:00', prof: 2, pista: 2, plazas: 6, precio: 62, insc: 5, espera: 0 },
  { nivel: 'competicion', cat: 'adultos', dia: 5, hora: '21:30', prof: 3, pista: 1, plazas: 4, precio: 75, insc: 4, espera: 2 },
  { nivel: 'avanzado', cat: 'adultos', dia: 6, hora: '10:30', prof: 4, pista: 4, plazas: 5, precio: 68, insc: 5, espera: 0 },
  { nivel: 'intermedio', cat: 'adultos', dia: 5, hora: '09:00', prof: 4, pista: 3, plazas: 6, precio: 62, insc: 2, espera: 0 },
  { nivel: 'iniciacion', cat: 'infantil', dia: 2, hora: '17:30', prof: 4, pista: 3, plazas: 6, precio: 42, insc: 6, espera: 1 },
  { nivel: 'iniciacion', cat: 'infantil', dia: 4, hora: '17:30', prof: 1, pista: 3, plazas: 6, precio: 42, insc: 6, espera: 1 },
  { nivel: 'intermedio', cat: 'infantil', dia: 3, hora: '18:30', prof: 2, pista: 4, plazas: 6, precio: 46, insc: 5, espera: 0 },
  { nivel: 'avanzado', cat: 'infantil', dia: 6, hora: '12:00', prof: 3, pista: 4, plazas: 5, precio: 50, insc: 4, espera: 0 },
];

export function seedDatabase(d: DatabaseSync, hoy: Date) {
  const rnd = rng(20260901);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const hoyS = aISO(hoy);
  const ahoraIso = (f: string, hhmm = '09:00') => `${f}T${hhmm}`;

  d.exec(fs.readFileSync(path.join(process.cwd(), 'src/lib/schema.sql'), 'utf8'));

  const ins = (tabla: string, obj: Record<string, P>) => {
    const cols = Object.keys(obj);
    const r = d.prepare(`INSERT INTO ${tabla} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`).run(...cols.map((c) => obj[c]));
    return Number(r.lastInsertRowid);
  };
  const q = <T = any,>(sql: string, ...p: P[]) => d.prepare(sql).all(...p).map((r) => ({ ...r })) as T[];

  d.exec('BEGIN');

  // ------------------------------------------------------------ configuración y plantillas
  for (const [k, v] of Object.entries(CONFIG_POR_DEFECTO)) ins('configuracion', { clave: k, valor: String(v) });
  ins('configuracion', { clave: 'fechaDemo', valor: '' });
  ins('configuracion', { clave: 'consentimientoVersion', valor: 'v1.0 (09/2026)' });
  ins('configuracion', { clave: 'textoConsentimiento', valor: TEXTO_CONSENTIMIENTO });
  for (const p of PLANTILLAS_DEFECTO) ins('plantilla', { ...p });

  // ------------------------------------------------------------ temporada, profesores, pistas
  const anioIni = hoy.getMonth() >= 8 ? hoy.getFullYear() : hoy.getFullYear() - 1;
  // La temporada arranca el 1 de septiembre, salvo que falten menos de 8 semanas de historial: entonces
  // se adelanta el inicio para que la demo siempre tenga 8 semanas de datos.
  const sept1 = `${anioIni}-09-01`;
  const iniTemp = sept1 < sumarDias(hoyS, -56) ? sept1 : sumarDias(hoyS, -56);
  const temporadaId = ins('temporada', { nombre: `Temporada ${anioIni}/${anioIni + 1}`, fechaInicio: iniTemp, fechaFin: `${anioIni + 1}-06-30` });

  const profes = [
    ['Carlos Méndez', '600 111 201', 22, 'autonomo'],
    ['Laura Ortega', '600 111 202', 28, 'contratado'],
    ['Sergio Valverde', '600 111 203', 26, 'autonomo'],
    ['Marta Quintero', '600 111 204', 18, 'autonomo'],
  ] as const;
  const profIds = profes.map(([nombre, telefono, tarifaHora, tipoContrato]) => ins('profesor', { nombre, telefono, tarifaHora, tipoContrato }));
  const pistaIds = [1, 2, 3, 4].map((n) => ins('pista', { nombre: `Pista ${n}` }));

  const grupoIds: number[] = [];
  const grupoDur: number[] = [];
  GRUPOS.forEach((g) => {
    const dur = g.cat === 'infantil' ? 60 : 90;
    grupoDur.push(dur);
    grupoIds.push(ins('grupo', {
      nombre: `${NIVEL_NOMBRE[g.nivel]} ${g.cat === 'infantil' ? 'Infantil' : 'Adultos'} · ${DIA_CORTO[g.dia]} ${g.hora}`,
      nivel: g.nivel, categoria: g.cat, profesorId: profIds[g.prof - 1], pistaId: pistaIds[g.pista - 1],
      diaSemana: g.dia, horaInicio: g.hora, duracionMin: dur, plazasMax: g.plazas, precioMensual: g.precio, temporadaId,
    }));
  });

  // ------------------------------------------------------------ personas
  const usados = new Set<string>();
  const nombreUnico = (fem: boolean, apellidos?: string) => {
    for (;;) {
      const n = pick(fem ? NOMBRES_F : NOMBRES_M);
      const ap = apellidos ?? `${pick(APELLIDOS)} ${pick(APELLIDOS)}`;
      const k = `${n} ${ap}`;
      if (!usados.has(k)) { usados.add(k); return { nombre: n, apellidos: ap }; }
    }
  };
  const tel = () => `6${String(Math.floor(rnd() * 90) + 10)} ${String(Math.floor(rnd() * 900) + 100)} ${String(Math.floor(rnd() * 900) + 100)}`;
  const mail = (n: string, a: string) =>
    `${n}.${a.split(' ')[0]}${Math.floor(rnd() * 90) + 10}@ejemplo.com`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nacimiento = (edad: number) => {
    const f = new Date(hoy.getFullYear() - edad, Math.floor(rnd() * 12), Math.floor(rnd() * 28) + 1);
    if (f > hoy) f.setFullYear(f.getFullYear() - 1);
    return aISO(f);
  };
  const diasAtras = (n: number) => sumarDias(hoyS, -n);

  type Al = { id: number; nivel: string; cat: 'adultos' | 'infantil'; tutorId: number | null; estado: string };
  const alumnos: Al[] = [];
  const crearAlumno = (o: { nombre: string; apellidos: string; edad: number; nivel: string; estado: string; tutorId?: number | null; fechaAlta?: string; notas?: string }, cat: 'adultos' | 'infantil') => {
    const id = ins('alumno', {
      nombre: o.nombre, apellidos: o.apellidos, fechaNacimiento: nacimiento(o.edad), telefono: o.tutorId ? null : tel(),
      email: o.tutorId ? null : mail(o.nombre, o.apellidos), nivel: o.nivel, estado: o.estado,
      fechaAlta: o.fechaAlta ?? iniTemp, notas: o.notas ?? null, tutorId: o.tutorId ?? null,
    });
    const a = { id, nivel: o.nivel, cat, tutorId: o.tutorId ?? null, estado: o.estado };
    alumnos.push(a);
    return a;
  };

  // Tutores: 18 familias; 7 con dos hijos y 11 con uno => 25 menores.
  const familias: { tutorId: number; ap: string; hijos: number }[] = [];
  for (let i = 0; i < 18; i++) {
    const fem = rnd() < 0.6;
    const t = nombreUnico(fem);
    const tutorId = ins('tutor', {
      nombre: `${t.nombre} ${t.apellidos}`, telefono: tel(), email: mail(t.nombre, t.apellidos),
      consentimientoFecha: i === 17 ? null : sumarDias(iniTemp, Math.floor(rnd() * 20)), consentimientoVersion: i === 17 ? null : 'v1.0 (09/2026)',
    });
    familias.push({ tutorId, ap: t.apellidos, hijos: i < 7 ? 2 : 1 });
  }
  // El tutor 18 no tiene consentimiento: su hijo quedó en espera (ver regla 9, útil en la demo).
  const kidsNiveles: string[] = [
    ...Array(10).fill('iniciacion'), ...Array(5).fill('intermedio'), ...Array(4).fill('avanzado'),
  ]; // 19 niños activos (2 de ellos en dos grupos de iniciación)
  const kidSlots: { fam: (typeof familias)[number]; estado: string }[] = [];
  familias.slice(0, 7).forEach((f) => { kidSlots.push({ fam: f, estado: 'activo' }, { fam: f, estado: 'activo' }); });
  const singles = familias.slice(7);
  // singles[10] (tutor sin consentimiento) -> espera; otro en espera; 4 bajas; 5 activos
  const estSingles = ['activo', 'activo', 'activo', 'activo', 'activo', 'baja', 'baja', 'baja', 'baja', 'espera', 'espera'];
  singles.forEach((f, i) => kidSlots.push({ fam: f, estado: i === 10 ? 'espera' : estSingles[i] }));
  let kNiv = 0;
  const kids: Al[] = kidSlots.map((s) => {
    const fem = rnd() < 0.5;
    const n = nombreUnico(fem, s.fam.ap);
    const activo = s.estado === 'activo';
    const nivel = activo ? kidsNiveles[kNiv++] : pick(['iniciacion', 'iniciacion', 'intermedio']);
    const edad = nivel === 'iniciacion' ? 6 + Math.floor(rnd() * 4) : nivel === 'intermedio' ? 9 + Math.floor(rnd() * 3) : 11 + Math.floor(rnd() * 3);
    return crearAlumno({ ...n, edad, nivel, estado: s.estado, tutorId: s.fam.tutorId }, 'infantil');
  });

  // Adultos: 31 activos, 5 en espera, 9 baja.
  const adNiveles: string[] = [
    ...Array(7).fill('iniciacion'), ...Array(12).fill('intermedio'), ...Array(8).fill('avanzado'), ...Array(4).fill('competicion'),
  ];
  const adultos: Al[] = [];
  for (let i = 0; i < 31; i++) {
    const n = nombreUnico(rnd() < 0.5);
    adultos.push(crearAlumno({ ...n, edad: 20 + Math.floor(rnd() * 40), nivel: adNiveles[i], estado: 'activo' }, 'adultos'));
  }
  // Alumno con datos fijos para que el CSV de ejemplo (ejemplo_alumnos.csv) detecte un duplicado real.
  d.prepare("UPDATE alumno SET nombre='Raúl', apellidos='Benítez Cardona', fechaNacimiento='1988-03-14', telefono='612 345 678', email='raul.benitez@ejemplo.com' WHERE id=?").run(adultos[7].id);
  const esperaNiv = ['iniciacion', 'iniciacion', 'intermedio', 'competicion', 'competicion'];
  const adultosEspera = esperaNiv.map((nivel) => {
    const n = nombreUnico(rnd() < 0.5);
    return crearAlumno({ ...n, edad: 22 + Math.floor(rnd() * 35), nivel, estado: 'espera', fechaAlta: diasAtras(10 + Math.floor(rnd() * 30)) }, 'adultos');
  });
  const adultosBaja: Al[] = [];
  for (let i = 0; i < 9; i++) {
    const n = nombreUnico(rnd() < 0.5);
    adultosBaja.push(crearAlumno({ ...n, edad: 25 + Math.floor(rnd() * 35), nivel: pick(['iniciacion', 'intermedio', 'avanzado']), estado: 'baja', fechaAlta: `${anioIni - 1}-09-15` }, 'adultos'));
  }
  const kidsBaja = kids.filter((k) => k.estado === 'baja');
  const kidsEspera = kids.filter((k) => k.estado === 'espera');

  // ------------------------------------------------------------ inscripciones
  const inscritosPorGrupo: Record<number, number[]> = {};
  const addInsc = (alumnoId: number, gi: number, fechaBaja: string | null = null, fechaAlta = iniTemp) => {
    ins('inscripcion', { alumnoId, grupoId: grupoIds[gi], fechaAlta, fechaBaja });
    if (!fechaBaja) (inscritosPorGrupo[gi] ??= []).push(alumnoId);
  };
  // Dobles: [grupo destino, índice del grupo origen del que se toma el alumno]
  const dobles: Record<number, number> = { 3: 0, 4: 1, 6: 2 }; // 1 plaza doble en G4, G5 y G7
  const pools: Record<string, Al[]> = { iniciacion: [], intermedio: [], avanzado: [], competicion: [] };
  adultos.forEach((a) => pools[a.nivel].push(a));
  GRUPOS.forEach((g, gi) => {
    if (g.cat !== 'adultos') return;
    const plazasDobles = dobles[gi] !== undefined ? 1 : 0;
    for (let k = 0; k < g.insc - plazasDobles; k++) addInsc(pools[g.nivel].shift()!.id, gi);
  });
  Object.entries(dobles).forEach(([gi, origen]) => {
    const candidato = inscritosPorGrupo[origen][0];
    addInsc(candidato, Number(gi));
  });
  // Niños: 21 plazas con 19 niños (2 dobles en iniciación)
  const kidsAct = kids.filter((k) => k.estado === 'activo');
  const kp: Record<string, Al[]> = { iniciacion: [], intermedio: [], avanzado: [] };
  kidsAct.forEach((k) => kp[k.nivel].push(k));
  const ini = kp.iniciacion;
  for (let i = 0; i < 6; i++) addInsc(ini[i].id, 8);
  for (let i = 4; i < 10; i++) addInsc(ini[i].id, 9); // ini[4], ini[5] están en los dos grupos
  kp.intermedio.forEach((k) => addInsc(k.id, 10));
  kp.avanzado.forEach((k) => addInsc(k.id, 11));
  // Bajas recientes de este mes (siguen contando como baja del mes)
  const diaMes = hoy.getDate();
  const bajaReciente = () => `${hoyS.slice(0, 8)}${String(Math.max(1, 1 + Math.floor(rnd() * Math.max(1, diaMes - 1)))).padStart(2, '0')}`;
  const fbA = bajaReciente(); const fbB = bajaReciente();
  addInsc(adultosBaja[0].id, 3, fbA);
  addInsc(kidsBaja[0].id, 10, fbB);
  adultosBaja[0] && d.prepare('UPDATE alumno SET notas = ? WHERE id = ?').run('Baja por cambio de trabajo.', adultosBaja[0].id);
  // Lista de espera
  const espIns = (al: Al, gi: number, dias: number) => ins('listaEspera', { alumnoId: al.id, grupoId: grupoIds[gi], fechaSolicitud: diasAtras(dias) });
  espIns(adultosEspera[0], 0, 20); espIns(adultosEspera[1], 0, 9); espIns(adultosEspera[2], 1, 14);
  espIns(adultosEspera[3], 5, 25); espIns(adultosEspera[4], 5, 6);
  espIns(kidsEspera[0], 8, 12); espIns(kidsEspera[1], 9, 5);

  // ------------------------------------------------------------ sesiones y asistencia
  type Ses = { id: number; gi: number; fecha: string; estado: string };
  const sesiones: Ses[] = [];
  GRUPOS.forEach((g, gi) => {
    for (let off = -56; off <= 28; off++) {
      const f = sumarDias(hoyS, off);
      if (fechaHora(f).getDay() !== g.dia) continue;
      const estado = f < hoyS ? 'impartida' : 'programada';
      const id = ins('sesion', { grupoId: grupoIds[gi], fecha: f, estado, motivoCancelacion: null, profesorRealId: null });
      sesiones.push({ id, gi, fecha: f, estado });
    }
  });
  const pasadas = sesiones.filter((s) => s.fecha < hoyS);
  const inscActivo = (alumnoId: number, gi: number, fecha: string) => {
    const r = q<{ fechaAlta: string; fechaBaja: string | null }>('SELECT fechaAlta, fechaBaja FROM inscripcion WHERE alumnoId=? AND grupoId=?', alumnoId, grupoIds[gi]);
    return r.some((x) => x.fechaAlta <= fecha && (!x.fechaBaja || x.fechaBaja > fecha));
  };
  const todasInsc = q<{ alumnoId: number; grupoId: number; fechaAlta: string; fechaBaja: string | null }>('SELECT alumnoId, grupoId, fechaAlta, fechaBaja FROM inscripcion');
  const porGrupo = new Map<number, typeof todasInsc>();
  todasInsc.forEach((i) => porGrupo.set(i.grupoId, [...(porGrupo.get(i.grupoId) ?? []), i]));

  // Cancelaciones por lluvia (hace ~38 y ~52 días) y una sustitución.
  const cancelar = (gi: number, minDias: number) => {
    const s = [...pasadas].filter((x) => x.gi === gi && diasEntre(x.fecha, hoyS) >= minDias).sort((a, b) => a.fecha.localeCompare(b.fecha)).pop();
    if (!s) return null;
    d.prepare("UPDATE sesion SET estado='cancelada', motivoCancelacion='Lluvia' WHERE id=?").run(s.id);
    s.estado = 'cancelada';
    return s;
  };
  const cancel1 = cancelar(0, 38);
  const cancel2 = cancelar(8, 45);
  const sust = [...pasadas].filter((x) => x.gi === 4 && x.estado === 'impartida' && diasEntre(x.fecha, hoyS) >= 8).sort((a, b) => a.fecha.localeCompare(b.fecha)).pop();
  if (sust) d.prepare('UPDATE sesion SET profesorRealId=? WHERE id=?').run(profIds[0], sust.id);

  const recientes: { ses: Ses; alumnoId: number }[] = [];
  const recups: { alumnoId: number; sesionOrigenId: number; fecha: string; origen: string; gi: number }[] = [];
  for (const s of pasadas) {
    if (s.estado === 'cancelada') {
      for (const i of porGrupo.get(grupoIds[s.gi]) ?? []) {
        if (i.fechaAlta <= s.fecha && (!i.fechaBaja || i.fechaBaja > s.fecha)) recups.push({ alumnoId: i.alumnoId, sesionOrigenId: s.id, fecha: s.fecha, origen: 'cancelacion', gi: s.gi });
      }
      continue;
    }
    for (const i of porGrupo.get(grupoIds[s.gi]) ?? []) {
      if (!(i.fechaAlta <= s.fecha && (!i.fechaBaja || i.fechaBaja > s.fecha))) continue;
      const reciente = diasEntre(s.fecha, hoyS) <= 29;
      const r = rnd();
      let estado: string; let avisadoEn: string | null = null;
      if (r < (reciente ? 0.88 : 0.8)) estado = 'presente';
      else if (!reciente && r < 0.9) { estado = 'ausenteAvisado'; avisadoEn = ahoraIso(sumarDias(s.fecha, -1), '10:00'); }
      else estado = 'ausente';
      ins('asistencia', { sesionId: s.id, alumnoId: i.alumnoId, estado, avisadoEn });
      if (estado === 'ausenteAvisado') recups.push({ alumnoId: i.alumnoId, sesionOrigenId: s.id, fecha: s.fecha, origen: 'ausencia', gi: s.gi });
      if (estado === 'presente' && reciente) recientes.push({ ses: s, alumnoId: i.alumnoId });
    }
  }
  // 8 ausencias avisadas recientes (aún con derecho vigente): 5 pendientes y 3 reservadas.
  const usadosAl = new Set<number>(); const gruposUsados = new Set<number>();
  const elegidos: typeof recientes = [];
  const barajados = [...recientes].sort(() => rnd() - 0.5);
  for (const c of barajados) {
    if (elegidos.length >= 8) break;
    if (usadosAl.has(c.alumnoId) || gruposUsados.has(c.ses.gi) && elegidos.length < 6) continue;
    usadosAl.add(c.alumnoId); gruposUsados.add(c.ses.gi); elegidos.push(c);
  }
  const futuras = sesiones.filter((s) => s.fecha > hoyS);
  const reservarEn = (alumnoId: number, gi: number, limite: string) => {
    const nivel = GRUPOS[gi].nivel;
    return futuras.find((f) => {
      if (f.gi === gi || GRUPOS[f.gi].nivel !== nivel || f.fecha > limite) return false;
      if ((porGrupo.get(grupoIds[f.gi]) ?? []).some((i) => i.alumnoId === alumnoId && !i.fechaBaja)) return false;
      const ocupadas = (inscritosPorGrupo[f.gi] ?? []).length + q<{ n: number }>('SELECT COUNT(*) n FROM recuperacion WHERE sesionDestinoId=? AND estado IN (\'reservada\',\'usada\')', f.id)[0].n;
      return ocupadas < GRUPOS[f.gi].plazas;
    });
  };
  let reservadasN = 0;
  elegidos.forEach((c) => {
    d.prepare("UPDATE asistencia SET estado='ausenteAvisado', avisadoEn=? WHERE sesionId=? AND alumnoId=?").run(ahoraIso(sumarDias(c.ses.fecha, -1), '09:00'), c.ses.id, c.alumnoId);
    const caduca = caducidadRecuperacion(c.ses.fecha);
    const dest = reservadasN < 3 ? reservarEn(c.alumnoId, c.ses.gi, caduca) : undefined;
    if (dest) reservadasN++;
    ins('recuperacion', { alumnoId: c.alumnoId, sesionOrigenId: c.ses.id, sesionDestinoId: dest?.id ?? null, estado: dest ? 'reservada' : 'pendiente', caducaEn: caduca, origen: 'ausencia' });
  });
  // Recuperaciones antiguas: caducadas, y alguna usada en otra sesión pasada del mismo nivel.
  recups.forEach((r, idx) => {
    const caduca = caducidadRecuperacion(r.fecha);
    let estado = 'caducada'; let dest: number | null = null;
    if (idx % 3 === 0) {
      const nivel = GRUPOS[r.gi].nivel;
      const cand = pasadas.find((p) => p.gi !== r.gi && p.estado === 'impartida' && GRUPOS[p.gi].nivel === nivel && p.fecha > r.fecha && p.fecha <= caduca
        && !(porGrupo.get(grupoIds[p.gi]) ?? []).some((i) => i.alumnoId === r.alumnoId)
        && q('SELECT 1 FROM asistencia WHERE sesionId=? AND alumnoId=?', p.id, r.alumnoId).length === 0);
      if (cand) { estado = 'usada'; dest = cand.id; ins('asistencia', { sesionId: cand.id, alumnoId: r.alumnoId, estado: 'recuperacion', avisadoEn: null }); }
    }
    ins('recuperacion', { alumnoId: r.alumnoId, sesionOrigenId: r.sesionOrigenId, sesionDestinoId: dest, estado, caducaEn: caduca, origen: r.origen });
  });

  // ------------------------------------------------------------ cuotas (mes actual y 2 anteriores)
  const mesDeFecha = (offsetMeses: number) => {
    const f = new Date(hoy.getFullYear(), hoy.getMonth() + offsetMeses, 1);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}`;
  };
  const activos = alumnos.filter((a) => a.estado === 'activo');
  const precios = (id: number) => q<{ precioMensual: number }>('SELECT g.precioMensual FROM inscripcion i JOIN grupo g ON g.id=i.grupoId WHERE i.alumnoId=? AND i.fechaBaja IS NULL', id).map((x) => x.precioMensual);
  const impagadas: Record<string, number> = { [mesDeFecha(-2)]: 0, [mesDeFecha(-1)]: 2, [mesDeFecha(0)]: 10 };
  const metodos = ['efectivo', 'transferencia', 'tarjeta', 'tarjeta', 'transferencia'] as const;
  const cuotasActuales: { id: number; alumnoId: number; importe: number }[] = [];
  for (const off of [-2, -1, 0]) {
    const mes = mesDeFecha(off);
    const orden = [...activos].sort(() => rnd() - 0.5);
    const noPagan = new Set(orden.slice(0, impagadas[mes]).map((a) => a.id));
    for (const a of activos) {
      const hermano = a.tutorId !== null && activos.some((b) => b.id !== a.id && b.tutorId === a.tutorId);
      const c = calcularCuota(precios(a.id), hermano);
      const venc = fechaVencimientoCuota(mes);
      let fechaPago: string | null = null; let metodo: string | null = null; let estado = 'pagada';
      if (noPagan.has(a.id)) estado = hoyS > venc ? 'vencida' : 'pendiente';
      else {
        const f = sumarDias(`${mes}-01`, Math.floor(rnd() * 9));
        fechaPago = f > hoyS ? hoyS : f; metodo = pick([...metodos]);
      }
      const id = ins('cuota', { alumnoId: a.id, mes, importeBase: c.importeBase, descuento: c.descuento, importeFinal: c.importeFinal, estado, fechaVencimiento: venc, fechaPago, metodo });
      if (off === 0 && estado !== 'pagada') cuotasActuales.push({ id, alumnoId: a.id, importe: c.importeFinal });
    }
  }

  // ------------------------------------------------------------ mensajes
  const tpl = Object.fromEntries(PLANTILLAS_DEFECTO.map((p) => [p.clave, p.texto]));
  const destinatario = (al: Al) => {
    if (al.tutorId) { const t = q<{ nombre: string }>('SELECT nombre FROM tutor WHERE id=?', al.tutorId)[0]; return { tipo: 'tutor', id: al.tutorId, nombre: t.nombre.split(' ')[0] }; }
    const a = q<{ nombre: string }>('SELECT nombre FROM alumno WHERE id=?', al.id)[0];
    return { tipo: 'alumno', id: al.id, nombre: a.nombre };
  };
  const msg = (plantilla: string, al: Al, texto: string, estado: string, creadoEn: string, referencia: string | null = null) => {
    const dst = destinatario(al);
    ins('mensaje', { destinatarioTipo: dst.tipo, destinatarioId: dst.id, plantilla, texto, canal: rnd() < 0.8 ? 'whatsapp' : 'email', estado, creadoEn, referencia });
  };
  const alMap = new Map(alumnos.map((a) => [a.id, a]));
  const nombreAl = (id: number) => { const r = q<{ nombre: string }>('SELECT nombre FROM alumno WHERE id=?', id)[0]; return r.nombre; };
  const mesAct = mesDeFecha(0);
  cuotasActuales.slice(0, 5).forEach((c) => {
    const al = alMap.get(c.alumnoId)!; const dst = destinatario(al);
    msg('aviso1', al, renderPlantilla(tpl.aviso1, { destinatario: dst.nombre, alumno: nombreAl(c.alumnoId), mes: mesAct, importe: formatoEuro(c.importe), vencimiento: formatoFecha(fechaVencimientoCuota(mesAct)), escuela: ESCUELA }), 'pendienteRevision', `${hoyS}T08:30`, `cuota:${c.id}:aviso1`);
  });
  // 3 pendientes más: cambio de horario a un grupo y confirmaciones de recuperación
  const g5 = inscritosPorGrupo[5] ?? [];
  g5.slice(0, 1).forEach((id) => {
    const al = alMap.get(id)!; const dst = destinatario(al);
    msg('horario', al, renderPlantilla(tpl.horario, { destinatario: dst.nombre, grupo: 'Competición Adultos · Vie 21:30', fecha: formatoFecha(sumarDias(hoyS, 7)), hora: '20:30', escuela: ESCUELA }), 'pendienteRevision', `${hoyS}T08:40`);
  });
  const reservadas = q<{ alumnoId: number; sesionDestinoId: number }>("SELECT alumnoId, sesionDestinoId FROM recuperacion WHERE estado='reservada'");
  reservadas.slice(0, 2).forEach((r) => {
    const al = alMap.get(r.alumnoId)!; const dst = destinatario(al);
    const s = q<{ fecha: string; horaInicio: string; nombre: string }>('SELECT s.fecha, g.horaInicio, g.nombre FROM sesion s JOIN grupo g ON g.id=s.grupoId WHERE s.id=?', r.sesionDestinoId)[0];
    msg('recuperacion', al, renderPlantilla(tpl.recuperacion, { destinatario: dst.nombre, alumno: nombreAl(r.alumnoId), grupo: s.nombre, fecha: formatoFecha(s.fecha), hora: s.horaInicio, escuela: ESCUELA }), 'pendienteRevision', `${hoyS}T08:50`);
  });
  // Historial enviado
  for (const [k, cancel] of [[0, cancel1], [1, cancel2]] as const) {
    if (!cancel) continue;
    const insc = porGrupo.get(grupoIds[cancel.gi]) ?? [];
    const familiasAvisadas = new Set<string>();
    insc.slice(0, 4).forEach((i) => {
      const al = alMap.get(i.alumnoId)!; const dst = destinatario(al);
      if (familiasAvisadas.has(`${dst.tipo}${dst.id}`)) return; // una familia con dos hijos recibe un solo aviso
      familiasAvisadas.add(`${dst.tipo}${dst.id}`);
      const nombreGrupo = q<{ nombre: string }>('SELECT nombre FROM grupo WHERE id=?', grupoIds[cancel.gi])[0].nombre;
      msg('lluvia', al, renderPlantilla(tpl.lluvia, { destinatario: dst.nombre, grupo: nombreGrupo, fecha: formatoFecha(cancel.fecha), hora: GRUPOS[cancel.gi].hora, escuela: ESCUELA }), 'enviadoSimulado', `${cancel.fecha}T${k ? '08:10' : '09:05'}`);
    });
  }
  cuotasActuales.slice(5, 8).forEach((c) => {
    const al = alMap.get(c.alumnoId)!; const dst = destinatario(al);
    msg('recordatorio', al, renderPlantilla(tpl.recordatorio, { destinatario: dst.nombre, alumno: nombreAl(c.alumnoId), mes: mesAct, importe: formatoEuro(c.importe), vencimiento: formatoFecha(fechaVencimientoCuota(mesAct)), escuela: ESCUELA }), 'enviadoSimulado', `${sumarDias(fechaVencimientoCuota(mesAct), -3)}T09:00`);
  });

  // Disponibilidad y solicitudes de ejemplo (panel del alumno)
  const dispEj: [Al, [number, string][]][] = [
    [adultosEspera[0], [[3, 'manana'], [3, 'tarde'], [1, 'noche']]],
    [adultosEspera[2], [[4, 'noche'], [2, 'noche'], [6, 'manana']]],
    [adultos[0], [[1, 'noche'], [4, 'noche']]],
  ];
  for (const [al, celdas] of dispEj) for (const [dia, fr] of celdas) ins('disponibilidad', { alumnoId: al.id, diaSemana: dia, franja: fr });
  ins('solicitud', { alumnoId: adultosEspera[0].id, grupoId: grupoIds[3], estado: 'pendiente', creadoEn: diasAtras(1) });
  ins('solicitud', { alumnoId: adultosEspera[2].id, grupoId: grupoIds[4], estado: 'pendiente', creadoEn: hoyS });

  d.exec('COMMIT');

  const n = (t: string, w = '') => Number(q<{ n: number }>(`SELECT COUNT(*) n FROM ${t} ${w}`)[0].n);
  return {
    alumnos: n('alumno'), tutores: n('tutor'), grupos: n('grupo'), sesiones: n('sesion'), asistencias: n('asistencia'),
    cuotas: n('cuota'), vencidas: n('cuota', "WHERE estado='vencida'"), pendientes: n('cuota', "WHERE estado='pendiente'"),
    recuperacionesPendientes: n('recuperacion', "WHERE estado='pendiente' AND caducaEn >= '" + hoyS + "'"),
    recuperacionesReservadas: n('recuperacion', "WHERE estado='reservada'"),
    mensajesPendientes: n('mensaje', "WHERE estado='pendienteRevision'"), listaEspera: n('listaEspera'),
  };
}
