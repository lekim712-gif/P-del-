import { all, one, hoyISO } from '../db';
import { diasEntre, mesDe, sumarDias } from '../rules';
import { GRUPO_SELECT, actualizarEstadosCuotas, type GrupoRow } from './common';
import { expirarRecuperaciones } from './recuperaciones';

function mesesAtras(mes: string, n: number) {
  const [y, m] = mes.split('-').map(Number);
  const d = new Date(y, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const FRANJAS = [
  { id: 'manana', nombre: 'Mañana (9–13 h)', desde: 0, hasta: 13 * 60 },
  { id: 'tarde1', nombre: 'Tarde (13–18 h)', desde: 13 * 60, hasta: 18 * 60 },
  { id: 'tarde2', nombre: 'Tarde-noche (18–20 h)', desde: 18 * 60, hasta: 20 * 60 },
  { id: 'noche', nombre: 'Noche (20–23 h)', desde: 20 * 60, hasta: 24 * 60 },
];

export function getPanel() {
  actualizarEstadosCuotas();
  expirarRecuperaciones();
  const hoy = hoyISO();
  const mes = mesDe(hoy);
  const grupos = all<GrupoRow>(`${GRUPO_SELECT} ORDER BY g.diaSemana, g.horaInicio`);
  const plazas = grupos.reduce((a, g) => a + g.plazasMax, 0);
  const insc = grupos.reduce((a, g) => a + g.inscritos, 0);

  const tot = (m: string) => {
    const r = all<{ estado: string; total: number; n: number }>('SELECT estado, COALESCE(SUM(importeFinal),0) total, COUNT(*) n FROM cuota WHERE mes=? GROUP BY estado', m);
    const g = (e: string) => r.find((x) => x.estado === e) ?? { total: 0, n: 0 };
    const n = r.reduce((a, x) => a + x.n, 0);
    return { cobrado: g('pagada').total, pendiente: g('pendiente').total, vencido: g('vencida').total, nImpagadas: g('pendiente').n + g('vencida').n, n };
  };
  const t = tot(mes);

  const bajasMes = one<{ n: number }>("SELECT COUNT(DISTINCT alumnoId) n FROM inscripcion i WHERE fechaBaja IS NOT NULL AND substr(fechaBaja,1,7)=? AND NOT EXISTS (SELECT 1 FROM inscripcion j WHERE j.alumnoId=i.alumnoId AND j.fechaBaja IS NULL)", mes)!.n;
  const activos = one<{ n: number }>("SELECT COUNT(*) n FROM alumno WHERE estado='activo'")!.n;

  const vencidas = all<{ id: number; alumno: string; importeFinal: number; fechaVencimiento: string }>(
    "SELECT c.id, a.nombre || ' ' || a.apellidos AS alumno, c.importeFinal, c.fechaVencimiento FROM cuota c JOIN alumno a ON a.id=c.alumnoId WHERE c.estado='vencida' ORDER BY c.fechaVencimiento");
  const graves = vencidas.filter((c) => diasEntre(c.fechaVencimiento, hoy) > 20);
  const llenos = grupos.filter((g) => g.inscritos >= g.plazasMax && g.espera > 0);
  const vacios = grupos.filter((g) => g.inscritos / g.plazasMax < 0.5);
  const caducan = all<{ n: number }>("SELECT COUNT(*) n FROM recuperacion WHERE estado='pendiente' AND caducaEn BETWEEN ? AND ?", hoy, sumarDias(hoy, 7))[0].n;
  const pendientesRev = one<{ n: number }>("SELECT COUNT(*) n FROM mensaje WHERE estado='pendienteRevision'")!.n;

  const ocupacionFranja = FRANJAS.map((f) => {
    const gs = grupos.filter((g) => {
      const [h, m] = g.horaInicio.split(':').map(Number);
      const min = h * 60 + m;
      return min >= f.desde && min < f.hasta;
    });
    const p = gs.reduce((a, g) => a + g.plazasMax, 0);
    const i = gs.reduce((a, g) => a + g.inscritos, 0);
    return { ...f, grupos: gs.length, plazas: p, inscritos: i, pct: p ? Math.round((i / p) * 100) : 0 };
  }).filter((f) => f.grupos > 0);

  const ingresos = [2, 1, 0].map((n) => {
    const m = mesesAtras(mes, n);
    const x = tot(m);
    return { mes: m, cobrado: x.cobrado, pendiente: x.pendiente + x.vencido };
  });

  return {
    mes, ocupacionMedia: plazas ? Math.round((insc / plazas) * 100) : 0, plazas, insc,
    cobrado: t.cobrado, pendiente: t.pendiente + t.vencido, tasaImpago: t.n ? Math.round((t.nImpagadas / t.n) * 100) : 0,
    activos, bajasMes, vencidas, graves, llenos, vacios, caducan, pendientesRev, ocupacionFranja, ingresos,
  };
}
