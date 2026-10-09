import { describe, it, expect } from 'vitest';
import {
  calcularCuota, calcularEdad, caducidadRecuperacion, clasificarAusencia, decidirInscripcion, estadoCuota,
  fechaHora, fechaVencimientoCuota, pagoProfesores, primeroDeLaLista, recuperacionesPorCancelacion,
  tipoRecordatorio, tramoRecordatorio, validarInscripcionMenor, validarReservaRecuperacion, formatoFecha,
} from '@/lib/rules';

const hoy = fechaHora('2026-10-09', '10:00');

describe('Regla 1 · plazas y lista de espera', () => {
  it('inscribe si hay plaza', () => expect(decidirInscripcion(3, 4)).toBe('inscribir'));
  it('manda a lista de espera si el grupo está lleno', () => {
    expect(decidirInscripcion(4, 4)).toBe('espera');
    expect(decidirInscripcion(6, 4)).toBe('espera');
  });
  it('propone al primero de la lista por fecha', () => {
    const lista = [
      { id: 3, fechaSolicitud: '2026-09-20' },
      { id: 1, fechaSolicitud: '2026-09-02' },
      { id: 2, fechaSolicitud: '2026-09-10' },
    ];
    expect(primeroDeLaLista(lista)?.id).toBe(1);
    expect(primeroDeLaLista([])).toBeNull();
  });
});

describe('Regla 2 · ausencia avisada', () => {
  const clase = fechaHora('2026-10-10', '18:00');
  it('con 12 h o más de antelación es avisada', () => {
    expect(clasificarAusencia(clase, fechaHora('2026-10-10', '06:00'))).toBe('ausenteAvisado');
    expect(clasificarAusencia(clase, fechaHora('2026-10-09', '10:00'))).toBe('ausenteAvisado');
  });
  it('con menos de 12 h es ausencia sin recuperación', () => {
    expect(clasificarAusencia(clase, fechaHora('2026-10-10', '06:01'))).toBe('ausente');
  });
  it('sin aviso es ausencia', () => expect(clasificarAusencia(clase, null)).toBe('ausente'));
  it('respeta el parámetro configurable', () => {
    expect(clasificarAusencia(clase, fechaHora('2026-10-10', '12:00'), 6)).toBe('ausenteAvisado');
    expect(clasificarAusencia(clase, fechaHora('2026-10-10', '12:00'), 12)).toBe('ausente');
  });
});

describe('Regla 3 · recuperaciones', () => {
  const base = {
    recuperacion: { estado: 'pendiente', caducaEn: '2026-11-08', origen: 'ausencia' as const },
    nivelOrigen: 'intermedio',
    destino: { fecha: '2026-10-15', horaInicio: '19:00', nivel: 'intermedio', plazasLibres: 1, estado: 'programada' },
    usadasEnMes: 0,
    ahora: hoy,
  };
  it('caduca a los 30 días', () => expect(caducidadRecuperacion('2026-10-09')).toBe('2026-11-08'));
  it('acepta una sesión futura del mismo nivel con plaza', () => expect(validarReservaRecuperacion(base).ok).toBe(true));
  it('rechaza sesiones pasadas', () => {
    const r = validarReservaRecuperacion({ ...base, destino: { ...base.destino, fecha: '2026-10-08' } });
    expect(r.ok).toBe(false);
  });
  it('rechaza otro nivel', () => {
    expect(validarReservaRecuperacion({ ...base, destino: { ...base.destino, nivel: 'avanzado' } }).ok).toBe(false);
  });
  it('rechaza sin plazas', () => {
    expect(validarReservaRecuperacion({ ...base, destino: { ...base.destino, plazasLibres: 0 } }).ok).toBe(false);
  });
  it('rechaza si ha caducado para esa fecha', () => {
    expect(validarReservaRecuperacion({ ...base, destino: { ...base.destino, fecha: '2026-11-20' } }).ok).toBe(false);
  });
  it('limita a 2 por mes las de ausencia', () => {
    expect(validarReservaRecuperacion({ ...base, usadasEnMes: 2 }).ok).toBe(false);
    expect(validarReservaRecuperacion({ ...base, usadasEnMes: 1 }).ok).toBe(true);
  });
  it('las de cancelación no cuentan para el límite mensual', () => {
    const r = validarReservaRecuperacion({
      ...base, usadasEnMes: 5, recuperacion: { ...base.recuperacion, origen: 'cancelacion' },
    });
    expect(r.ok).toBe(true);
  });
  it('rechaza recuperaciones no pendientes', () => {
    expect(validarReservaRecuperacion({ ...base, recuperacion: { ...base.recuperacion, estado: 'usada' } }).ok).toBe(false);
  });
});

describe('Regla 4 · clase cancelada', () => {
  it('genera recuperación para todos los inscritos, sin límite mensual', () => {
    const r = recuperacionesPorCancelacion([1, 2, 3], '2026-10-12');
    expect(r).toHaveLength(3);
    expect(r.every((x) => x.origen === 'cancelacion' && x.estado === 'pendiente')).toBe(true);
    expect(r[0].caducaEn).toBe('2026-11-11');
  });
});

describe('Regla 5 · cuota mensual', () => {
  it('suma los precios sin descuento', () => {
    expect(calcularCuota([60], false)).toMatchObject({ importeBase: 60, descuento: 0, importeFinal: 60 });
  });
  it('10 % por hermano', () => {
    expect(calcularCuota([60], true)).toMatchObject({ descuento: 6, importeFinal: 54, motivo: 'hermano' });
  });
  it('15 % por dos o más grupos', () => {
    expect(calcularCuota([60, 40], false)).toMatchObject({ importeBase: 100, descuento: 15, importeFinal: 85, motivo: 'multigrupo' });
  });
  it('aplica el mayor, no se suman', () => {
    expect(calcularCuota([60, 40], true)).toMatchObject({ descuento: 15, importeFinal: 85, porcentaje: 15 });
  });
  it('respeta porcentajes configurados', () => {
    const r = calcularCuota([100], true, { descuentoHermano: 20, descuentoMultiGrupo: 5 });
    expect(r.descuento).toBe(20);
  });
});

describe('Regla 6 · estado de cuota', () => {
  it('vence el día 5', () => expect(fechaVencimientoCuota('2026-10')).toBe('2026-10-05'));
  it('pendiente hasta el vencimiento (incluido)', () => {
    expect(estadoCuota({ fechaVencimiento: '2026-10-05', fechaPago: null }, fechaHora('2026-10-05', '23:00'))).toBe('pendiente');
  });
  it('vencida después', () => {
    expect(estadoCuota({ fechaVencimiento: '2026-10-05', fechaPago: null }, fechaHora('2026-10-06'))).toBe('vencida');
  });
  it('un cobro la marca pagada', () => {
    expect(estadoCuota({ fechaVencimiento: '2026-10-05', fechaPago: '2026-10-20' }, fechaHora('2026-10-25'))).toBe('pagada');
  });
});

describe('Regla 7 · recordatorios', () => {
  const venc = '2026-10-05';
  it('día exacto: -3, +2, +10, +20', () => {
    expect(tipoRecordatorio(venc, fechaHora('2026-10-02'))).toBe('recordatorio');
    expect(tipoRecordatorio(venc, fechaHora('2026-10-07'))).toBe('aviso1');
    expect(tipoRecordatorio(venc, fechaHora('2026-10-15'))).toBe('aviso2');
    expect(tipoRecordatorio(venc, fechaHora('2026-10-25'))).toBe('coordinador');
    expect(tipoRecordatorio(venc, fechaHora('2026-10-20'))).toBeNull();
  });
  it('tramo (demo): el tramo más alto alcanzado', () => {
    expect(tramoRecordatorio(venc, fechaHora('2026-09-20'))).toBeNull();
    expect(tramoRecordatorio(venc, fechaHora('2026-10-03'))).toBe('recordatorio');
    expect(tramoRecordatorio(venc, fechaHora('2026-10-09'))).toBe('aviso1');
    expect(tramoRecordatorio(venc, fechaHora('2026-10-18'))).toBe('aviso2');
    expect(tramoRecordatorio(venc, fechaHora('2026-11-01'))).toBe('coordinador');
  });
});

describe('Regla 8 · pago a profesores', () => {
  it('suma solo sesiones impartidas y atribuye al sustituto', () => {
    const r = pagoProfesores(
      [
        { estado: 'impartida', duracionMin: 90, profesorId: 1, profesorRealId: null },
        { estado: 'impartida', duracionMin: 60, profesorId: 1, profesorRealId: 2 },
        { estado: 'cancelada', duracionMin: 60, profesorId: 1, profesorRealId: null },
        { estado: 'programada', duracionMin: 60, profesorId: 2, profesorRealId: null },
      ],
      { 1: 20, 2: 28 },
    );
    expect(r[1]).toEqual({ horas: 1.5, importe: 30, clases: 1 });
    expect(r[2]).toEqual({ horas: 1, importe: 28, clases: 1 });
  });
});

describe('Regla 9 · menores', () => {
  it('calcula la edad', () => {
    expect(calcularEdad('2012-10-10', hoy)).toBe(13);
    expect(calcularEdad('2012-10-09', hoy)).toBe(14);
  });
  it('menor de 14 sin tutor: no puede inscribirse', () => {
    expect(validarInscripcionMenor('2015-03-01', null, hoy).ok).toBe(false);
  });
  it('menor con tutor sin consentimiento: no puede', () => {
    expect(validarInscripcionMenor('2015-03-01', { consentimientoFecha: null }, hoy).ok).toBe(false);
  });
  it('menor con tutor y consentimiento: puede', () => {
    expect(validarInscripcionMenor('2015-03-01', { consentimientoFecha: '2026-09-01' }, hoy).ok).toBe(true);
  });
  it('mayor de 14 no necesita tutor', () => {
    expect(validarInscripcionMenor('2000-01-01', null, hoy).ok).toBe(true);
  });
});

describe('Utilidades', () => {
  it('formato dd/mm/aaaa', () => expect(formatoFecha('2026-10-09')).toBe('09/10/2026'));
});

describe('Utilidades de fecha', () => {
  it('rechaza fechas que no existen', async () => {
    const { fechaValida } = await import('@/lib/rules');
    expect(fechaValida('2024-02-29')).toBe(true);
    expect(fechaValida('1990-02-31')).toBe(false);
    expect(fechaValida('2026-13-01')).toBe(false);
    expect(fechaValida('hola')).toBe(false);
  });
});
