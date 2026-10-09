import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Users, CircleCheck, Ban } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { hoyISO } from '@/lib/db';
import { sesionesDelDia } from '@/lib/services/sesiones';
import { Badge, Empty, NivelBadge, PageHeader } from '@/components/ui';
import { formatoFecha, nombreDia, sumarDias, fechaHora } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

export default async function Asistencia({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { rol, actorId } = await requireRol('director', 'recepcion', 'profesor');
  const sp = await searchParams;
  const hoy = hoyISO();
  const fecha = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) ? sp.fecha : hoy;
  const ses = sesionesDelDia(fecha, rol === 'profesor' ? actorId : undefined);
  const dia = nombreDia(fechaHora(fecha).getDay());
  return (
    <>
      <PageHeader titulo={fecha === hoy ? 'Clases de hoy' : 'Clases del día'} subtitulo={`${dia} ${formatoFecha(fecha)}${rol === 'profesor' ? ' · solo tus clases' : ''}`}
        acciones={<div className="inline-flex items-center gap-1">
          <Link href={`/asistencia?fecha=${sumarDias(fecha, -1)}`} className="btn-secondary !px-2" aria-label="Día anterior"><ChevronLeft size={18} /></Link>
          <Link href="/asistencia" className="btn-secondary">Hoy</Link>
          <Link href={`/asistencia?fecha=${sumarDias(fecha, 1)}`} className="btn-secondary !px-2" aria-label="Día siguiente"><ChevronRight size={18} /></Link>
        </div>} />
      {ses.length === 0 ? (
        <div className="card"><Empty titulo="No hay clases este día" texto="Prueba con otro día usando las flechas." /></div>
      ) : (
        <ul className="mx-auto grid max-w-2xl gap-3 lg:mx-0">
          {ses.map((s) => (
            <li key={s.id}>
              <Link href={`/asistencia/${s.id}`} className="card block p-4 transition active:scale-[.99] hover:border-brand-400">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-lg font-extrabold tabular-nums">{s.horaInicio}–{horaFin(s.horaInicio, s.duracionMin)}</p>
                    <p className="text-sm font-semibold text-ink-700">{s.grupo}</p>
                  </div>
                  <NivelBadge nivel={s.nivel} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-500">
                  <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden />{s.pista}</span>
                  <span className="inline-flex items-center gap-1"><Users size={13} aria-hidden />{s.inscritos} inscritos</span>
                  <span>{s.profesorReal ? `${s.profesorReal} (sustituye a ${s.profesor})` : s.profesor}</span>
                  {s.estado === 'impartida' && <Badge tone="verde"><CircleCheck size={13} aria-hidden />Impartida</Badge>}
                  {s.estado === 'cancelada' && <Badge tone="rojo"><Ban size={13} aria-hidden />Cancelada</Badge>}
                  {s.estado === 'programada' && <Badge tone="azul">Pasar lista</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
