import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { getSesion, listaDeClase } from '@/lib/services/sesiones';
import { ListaAsistencia } from '@/components/ListaAsistencia';
import { Aviso, NivelBadge } from '@/components/ui';
import { formatoFecha } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

export default async function Clase({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('director', 'recepcion', 'profesor');
  const s = getSesion(Number((await params).id));
  if (!s) notFound();
  const filas = listaDeClase(s.id);
  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <Link href={`/asistencia?fecha=${s.fecha}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft size={16} aria-hidden />Mis clases</Link>
      <div className="mb-4">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-extrabold">{s.grupo}</h1><NivelBadge nivel={s.nivel} /></div>
        <p className="text-sm text-ink-500">{formatoFecha(s.fecha)} · {s.horaInicio}–{horaFin(s.horaInicio, s.duracionMin)} · {s.pista} · {s.profesorReal ? `${s.profesorReal} (sustituye a ${s.profesor})` : s.profesor}</p>
      </div>
      {s.estado === 'cancelada' ? <Aviso tono="rojo">Clase cancelada ({s.motivoCancelacion}). Los alumnos tienen una recuperación.</Aviso>
        : filas.length === 0 ? <Aviso tono="ambar">Este grupo no tiene alumnos inscritos.</Aviso>
        : <ListaAsistencia sesionId={s.id} filas={filas} estadoSesion={s.estado} />}
    </div>
  );
}
