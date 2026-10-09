/**
 * Reglas de negocio de la escuela como funciones PURAS (sin base de datos).
 * Los servicios las llaman; los tests las cubren (ver /tests).
 */

export const NIVELES = ['iniciacion', 'intermedio', 'avanzado', 'competicion'] as const;
export type Nivel = (typeof NIVELES)[number];

export type Config = {
  horasAvisoAusencia: number;
  maxRecuperacionesMes: number;
  diasCaducidadRecuperacion: number;
  descuentoHermano: number; // %
  descuentoMultiGrupo: number; // %
  diaVencimiento: number;
  edadMinimaSinTutor: number;
};

export const CONFIG_POR_DEFECTO: Config = {
  horasAvisoAusencia: 12,
  maxRecuperacionesMes: 2,
  diasCaducidadRecuperacion: 30,
  descuentoHermano: 10,
  descuentoMultiGrupo: 15,
  diaVencimiento: 5,
  edadMinimaSinTutor: 14,
};

const DIA_MS = 86_400_000;
const HORA_MS = 3_600_000;

/** Convierte 'aaaa-mm-dd' (+ 'hh:mm') en Date local. */
export function fechaHora(fecha: string, hora = '00:00'): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  const [hh, mm] = hora.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Comprueba que 'aaaa-mm-dd' existe en el calendario (rechaza 31/02, 30/02…). */
export function fechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
  const d = fechaHora(fecha);
  return !isNaN(d.getTime()) && aISO(d) === fecha;
}

export function aISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const d = fechaHora(fecha);
  d.setDate(d.getDate() + dias);
  return aISO(d);
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((fechaHora(hasta).getTime() - fechaHora(desde).getTime()) / DIA_MS);
}

export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------- Regla 9: menores
export function calcularEdad(fechaNacimiento: string, hoy: Date): number {
  const n = fechaHora(fechaNacimiento);
  let edad = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) edad--;
  return edad;
}

export type TutorMin = { consentimientoFecha: string | null } | null;

export function validarInscripcionMenor(
  fechaNacimiento: string,
  tutor: TutorMin,
  hoy: Date,
  cfg: Pick<Config, 'edadMinimaSinTutor'> = CONFIG_POR_DEFECTO,
): { ok: true } | { ok: false; motivo: string } {
  const edad = calcularEdad(fechaNacimiento, hoy);
  if (edad >= cfg.edadMinimaSinTutor) return { ok: true };
  if (!tutor) return { ok: false, motivo: `Es menor de ${cfg.edadMinimaSinTutor} años y necesita un tutor.` };
  if (!tutor.consentimientoFecha) return { ok: false, motivo: 'El tutor no tiene el consentimiento registrado.' };
  return { ok: true };
}

// ---------------------------------------------------------------- Regla 1: plazas
export function decidirInscripcion(inscritos: number, plazasMax: number): 'inscribir' | 'espera' {
  return inscritos < plazasMax ? 'inscribir' : 'espera';
}

export function primeroDeLaLista<T extends { fechaSolicitud: string; id?: number }>(lista: T[]): T | null {
  if (lista.length === 0) return null;
  return [...lista].sort((a, b) => a.fechaSolicitud.localeCompare(b.fechaSolicitud) || (a.id ?? 0) - (b.id ?? 0))[0];
}

// ---------------------------------------------------------------- Regla 2: ausencia avisada
export function clasificarAusencia(
  inicioClase: Date,
  avisadoEn: Date | null,
  horasAviso = CONFIG_POR_DEFECTO.horasAvisoAusencia,
): 'ausenteAvisado' | 'ausente' {
  if (!avisadoEn) return 'ausente';
  const horas = (inicioClase.getTime() - avisadoEn.getTime()) / HORA_MS;
  return horas >= horasAviso ? 'ausenteAvisado' : 'ausente';
}

// ---------------------------------------------------------------- Regla 3: recuperaciones
export function caducidadRecuperacion(fechaOrigen: string, dias = CONFIG_POR_DEFECTO.diasCaducidadRecuperacion): string {
  return sumarDias(fechaOrigen, dias);
}

export type RecuperacionMin = { estado: string; caducaEn: string };
export type SesionDestino = {
  fecha: string;
  horaInicio: string;
  nivel: string;
  plazasLibres: number;
  estado: string;
};

export function validarReservaRecuperacion(args: {
  recuperacion: RecuperacionMin & { origen: 'ausencia' | 'cancelacion' };
  nivelOrigen: string;
  destino: SesionDestino;
  /** Recuperaciones de origen "ausencia" ya reservadas/usadas por el alumno en el mes de la sesión destino. */
  usadasEnMes: number;
  ahora: Date;
  cfg?: Pick<Config, 'maxRecuperacionesMes'>;
}): { ok: true } | { ok: false; motivo: string } {
  const { recuperacion, nivelOrigen, destino, usadasEnMes, ahora } = args;
  const cfg = args.cfg ?? CONFIG_POR_DEFECTO;
  if (recuperacion.estado !== 'pendiente') return { ok: false, motivo: 'Esta recuperación ya no está pendiente.' };
  if (destino.estado !== 'programada') return { ok: false, motivo: 'La sesión elegida no está programada.' };
  if (fechaHora(destino.fecha, destino.horaInicio) <= ahora) return { ok: false, motivo: 'Solo se pueden reservar sesiones futuras.' };
  if (destino.fecha > recuperacion.caducaEn) return { ok: false, motivo: `La recuperación caduca el ${formatoFecha(recuperacion.caducaEn)}.` };
  if (destino.nivel !== nivelOrigen) return { ok: false, motivo: 'La sesión debe ser de un grupo del mismo nivel.' };
  if (destino.plazasLibres <= 0) return { ok: false, motivo: 'No quedan plazas libres en esa sesión.' };
  if (recuperacion.origen === 'ausencia' && usadasEnMes >= cfg.maxRecuperacionesMes) {
    return { ok: false, motivo: `Máximo ${cfg.maxRecuperacionesMes} recuperaciones al mes por ausencia.` };
  }
  return { ok: true };
}

export function haCaducado(caducaEn: string, hoy: Date): boolean {
  return aISO(hoy) > caducaEn;
}

// ---------------------------------------------------------------- Regla 4: clase cancelada
export function recuperacionesPorCancelacion(
  inscritosIds: number[],
  fechaSesion: string,
  dias = CONFIG_POR_DEFECTO.diasCaducidadRecuperacion,
) {
  return inscritosIds.map((alumnoId) => ({
    alumnoId,
    estado: 'pendiente' as const,
    origen: 'cancelacion' as const,
    caducaEn: caducidadRecuperacion(fechaSesion, dias),
  }));
}

// ---------------------------------------------------------------- Regla 5: cuota mensual
export function calcularCuota(
  preciosGrupos: number[],
  tieneHermano: boolean,
  cfg: Pick<Config, 'descuentoHermano' | 'descuentoMultiGrupo'> = CONFIG_POR_DEFECTO,
) {
  const importeBase = redondear(preciosGrupos.reduce((a, b) => a + b, 0));
  const pctHermano = tieneHermano ? cfg.descuentoHermano : 0;
  const pctMulti = preciosGrupos.length >= 2 ? cfg.descuentoMultiGrupo : 0;
  const porcentaje = Math.max(pctHermano, pctMulti); // se aplica el mayor, no se suman
  const motivo = porcentaje === 0 ? null : porcentaje === pctMulti ? 'multigrupo' : 'hermano';
  const descuento = redondear((importeBase * porcentaje) / 100);
  return { importeBase, descuento, importeFinal: redondear(importeBase - descuento), porcentaje, motivo };
}

// ---------------------------------------------------------------- Regla 6: estado de cuota
export function fechaVencimientoCuota(mes: string, diaVencimiento = CONFIG_POR_DEFECTO.diaVencimiento): string {
  return `${mes}-${String(diaVencimiento).padStart(2, '0')}`;
}

export function estadoCuota(
  cuota: { fechaVencimiento: string; fechaPago: string | null },
  hoy: Date,
): 'pagada' | 'pendiente' | 'vencida' {
  if (cuota.fechaPago) return 'pagada';
  return aISO(hoy) > cuota.fechaVencimiento ? 'vencida' : 'pendiente';
}

// ---------------------------------------------------------------- Regla 7: recordatorios
export type TipoRecordatorio = 'recordatorio' | 'aviso1' | 'aviso2' | 'coordinador';

export function tipoRecordatorio(fechaVencimiento: string, hoy: Date): TipoRecordatorio | null {
  const dias = diasEntre(aISO(hoy), fechaVencimiento); // >0: faltan días; <0: vencida
  if (dias === 3) return 'recordatorio';
  if (dias === -2) return 'aviso1';
  if (dias === -10) return 'aviso2';
  if (dias === -20) return 'coordinador';
  return null;
}

/**
 * Para la demo se acepta "ventana": se genera el aviso del tramo más alto alcanzado,
 * de modo que el botón sirva cualquier día y no solo el día exacto.
 */
export function tramoRecordatorio(fechaVencimiento: string, hoy: Date): TipoRecordatorio | null {
  const dias = diasEntre(aISO(hoy), fechaVencimiento);
  if (dias <= -20) return 'coordinador';
  if (dias <= -10) return 'aviso2';
  if (dias <= -2) return 'aviso1';
  if (dias >= 0 && dias <= 3) return 'recordatorio';
  return null;
}

// ---------------------------------------------------------------- Regla 8: pago a profesores
export function pagoProfesores(
  sesiones: { estado: string; duracionMin: number; profesorId: number; profesorRealId: number | null }[],
  tarifas: Record<number, number>,
) {
  const res: Record<number, { horas: number; importe: number; clases: number }> = {};
  for (const s of sesiones) {
    if (s.estado !== 'impartida') continue;
    const quien = s.profesorRealId ?? s.profesorId;
    const r = (res[quien] ??= { horas: 0, importe: 0, clases: 0 });
    const horas = s.duracionMin / 60;
    r.horas = redondear(r.horas + horas);
    r.clases += 1;
    r.importe = redondear(r.importe + horas * (tarifas[quien] ?? 0));
  }
  return res;
}

// ---------------------------------------------------------------- Utilidades de formato
export function formatoFecha(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function formatoEuro(n: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(n);
}

export const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
/** diaSemana: 1 = lunes … 6 = sábado (0 = domingo, igual que Date.getDay()). */
export function nombreDia(n: number): string {
  return DIAS_SEMANA[n] ?? '';
}

// ---------------------------------------------------------------- Disponibilidad del alumno
export const FRANJAS = [
  { id: 'manana', nombre: 'Mañana', rango: 'hasta las 13:00', desde: 0, hasta: 13 * 60 },
  { id: 'tarde', nombre: 'Tarde', rango: '13:00–19:00', desde: 13 * 60, hasta: 19 * 60 },
  { id: 'noche', nombre: 'Noche', rango: 'desde las 19:00', desde: 19 * 60, hasta: 24 * 60 },
] as const;

export function franjaDeHora(hhmm: string): 'manana' | 'tarde' | 'noche' {
  const [h, m] = hhmm.split(':').map(Number);
  const min = h * 60 + m;
  return (FRANJAS.find((f) => min >= f.desde && min < f.hasta) ?? FRANJAS[2]).id;
}

export type Disponibilidad = { diaSemana: number; franja: string };

/** Un grupo encaja si su día y la franja de su hora de inicio están marcados como disponibles. */
export function encajaDisponibilidad(diaSemana: number, horaInicio: string, disp: Disponibilidad[]): boolean {
  const f = franjaDeHora(horaInicio);
  return disp.some((d) => d.diaSemana === diaSemana && d.franja === f);
}
