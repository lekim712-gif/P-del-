import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { requireRol } from '@/lib/session';
import { all, hoyISO } from '@/lib/db';
import { sesionesRango } from '@/lib/services/sesiones';
import { NIVEL_BLOQUE, NIVEL_NOMBRE, PageHeader } from '@/components/ui';
import { fechaHora, formatoFecha, sumarDias } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function lunesDe(f: string) {
  const d = fechaHora(f);
  const dow = (d.getDay() + 6) % 7;
  return sumarDias(f, -dow);
}

export default async function Calendario({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director', 'recepcion', 'profesor');
  const sp = await searchParams;
  const hoy = hoyISO();
  const lunes = lunesDe(sp.semana && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? sp.semana : hoy);
  const vista = sp.vista === 'profesor' ? 'profesor' : 'pista';
  const fechas = DIAS.map((_, i) => sumarDias(lunes, i));
  const ses = sesionesRango(fechas[0], fechas[5]);
  const filas = vista === 'pista' ? all<{ id: number; nombre: string }>('SELECT id, nombre FROM pista ORDER BY id') : all<{ id: number; nombre: string }>('SELECT id, nombre FROM profesor ORDER BY id');
  const mia = (s: (typeof ses)[number], fila: { id: number; nombre: string }) => vista === 'pista' ? s.pista === fila.nombre : (s.profesorRealId ?? s.profesorId) === fila.id;
  const link = (o: Record<string, string>) => `/calendario?${new URLSearchParams({ semana: lunes, vista, ...o }).toString()}`;

  return (
    <>
      <PageHeader titulo="Calendario semanal" subtitulo={`Semana del ${formatoFecha(fechas[0])} al ${formatoFecha(fechas[5])}`}
        acciones={<>
          <div className="inline-flex rounded-xl bg-white p-1 ring-1 ring-ink-100" role="group" aria-label="Vista">
            {(['pista', 'profesor'] as const).map((v) => <Link key={v} href={link({ vista: v })} className={clsx('rounded-lg px-3 py-1.5 text-sm font-semibold', vista === v ? 'bg-brand-700 text-white' : 'text-ink-700')}>Por {v}</Link>)}
          </div>
          <div className="inline-flex items-center gap-1">
            <Link href={link({ semana: sumarDias(lunes, -7) })} className="btn-secondary !px-2" aria-label="Semana anterior"><ChevronLeft size={18} /></Link>
            <Link href={link({ semana: hoy })} className="btn-secondary">Hoy</Link>
            <Link href={link({ semana: sumarDias(lunes, 7) })} className="btn-secondary !px-2" aria-label="Semana siguiente"><ChevronRight size={18} /></Link>
          </div>
        </>} />
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(NIVEL_NOMBRE).map(([k, n]) => <span key={k} className={clsx('rounded-full border px-2.5 py-0.5 font-semibold', NIVEL_BLOQUE[k])}>{n}</span>)}
        <span className="rounded-full border border-red-300 bg-red-50 px-2.5 py-0.5 font-semibold text-red-800 line-through">Cancelada</span>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[920px] table-fixed border-collapse text-xs">
          <thead>
            <tr className="bg-ink-50">
              <th className="w-28 border-b border-ink-100 px-3 py-2 text-left font-semibold uppercase tracking-wide text-ink-500">{vista === 'pista' ? 'Pista' : 'Profesor'}</th>
              {fechas.map((f, i) => <th key={f} className={clsx('border-b border-l border-ink-100 px-2 py-2 text-left font-semibold', f === hoy ? 'bg-accent-400/40 text-ink-900' : 'text-ink-500')}>{DIAS[i]} {f.slice(8)}/{f.slice(5, 7)}</th>)}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila) => (
              <tr key={fila.id} className="align-top">
                <th scope="row" className="border-b border-ink-100 px-3 py-2 text-left text-sm font-bold text-ink-700">{fila.nombre}</th>
                {fechas.map((f) => (
                  <td key={f} className={clsx('border-b border-l border-ink-100 p-1.5', f === hoy && 'bg-accent-400/10')}>
                    <div className="grid gap-1.5">
                      {ses.filter((s) => s.fecha === f && mia(s, fila)).map((s) => (
                        <Link key={s.id} href={`/grupos/${s.grupoId}`} className={clsx('block rounded-lg border-l-4 px-2 py-1.5 leading-tight hover:shadow', NIVEL_BLOQUE[s.nivel], s.estado === 'cancelada' && '!border-red-400 !bg-red-50 opacity-70')}>
                          <span className={clsx('block font-bold tabular-nums', s.estado === 'cancelada' && 'line-through')}>{s.horaInicio}–{horaFin(s.horaInicio, s.duracionMin)}</span>
                          <span className="block truncate">{NIVEL_NOMBRE[s.nivel]} {s.categoria === 'infantil' ? 'infantil' : ''}</span>
                          <span className="block truncate text-[11px] opacity-80">{vista === 'pista' ? (s.profesorReal ? `${s.profesorReal} (sust.)` : s.profesor) : s.pista} · {s.inscritos}/{s.plazasMax}</span>
                        </Link>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
