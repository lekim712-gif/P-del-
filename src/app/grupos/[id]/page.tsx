import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRol } from '@/lib/session';
import { alumnosInscribibles, getGrupo } from '@/lib/services/grupos';
import { sesionesDeGrupo, sesionesRango } from '@/lib/services/sesiones';
import { hoyISO } from '@/lib/db';
import { Aviso, Badge, Card, Empty, NivelBadge, PageHeader, Progress } from '@/components/ui';
import { BajaAlumno, CancelarPorLluvia, InscribirAlumno, PromoverPrimero, QuitarDeLista } from '@/components/GrupoAcciones';
import { formatoEuro, formatoFecha, nombreDia, sumarDias } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

const EST: Record<string, ['verde' | 'rojo' | 'gris', string]> = { impartida: ['verde', 'Impartida'], cancelada: ['rojo', 'Cancelada'], programada: ['gris', 'Programada'] };

export default async function Detalle({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('director', 'recepcion');
  const g = getGrupo(Number((await params).id));
  if (!g) notFound();
  const hoy = hoyISO();
  const historial = sesionesDeGrupo(g.id, 10);
  const proximas = sesionesRango(hoy, sumarDias(hoy, 35)).filter((s) => s.grupoId === g.id && s.estado === 'programada');
  const hayPlaza = g.inscritos < g.plazasMax;
  return (
    <>
      <PageHeader titulo={g.nombre} subtitulo={<span className="inline-flex flex-wrap items-center gap-2"><NivelBadge nivel={g.nivel} />{nombreDia(g.diaSemana)} {g.horaInicio}–{horaFin(g.horaInicio, g.duracionMin)} · {g.profesor} · {g.pista}</span>}
        acciones={<Link href="/grupos" className="btn-secondary">Volver a grupos</Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid content-start gap-5 lg:col-span-2">
          <Card titulo={`Inscritos (${g.inscritos}/${g.plazasMax})`}>
            <div className="px-4 pt-3"><Progress valor={g.inscritos} max={g.plazasMax} className="h-3" /></div>
            {g.listaInscritos.length === 0 ? <Empty titulo="Grupo vacío" /> : (
              <ul className="divide-y divide-ink-100">{g.listaInscritos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <div><Link href={`/alumnos/${a.id}`} className="font-semibold text-brand-800 hover:underline">{a.apellidos}, {a.nombre}</Link><span className="ml-2 text-xs text-ink-500">desde {formatoFecha(a.fechaAlta)}</span></div>
                  <BajaAlumno alumnoId={a.id} grupoId={g.id} />
                </li>))}</ul>
            )}
            <div className="border-t border-ink-100 p-4"><InscribirAlumno grupoId={g.id} completo={!hayPlaza} alumnos={alumnosInscribibles(g.id)} /></div>
          </Card>

          <Card titulo={`Lista de espera (${g.listaEspera.length})`} acciones={<PromoverPrimero grupoId={g.id} hayPlaza={hayPlaza} hayLista={g.listaEspera.length > 0} />}>
            {g.listaEspera.length === 0 ? <Empty titulo="Nadie en espera" /> : (
              <>
                {hayPlaza && <div className="p-4 pb-0"><Aviso tono="azul">Hay plaza libre: se propone al primero de la lista ({g.listaEspera[0].nombre}).</Aviso></div>}
                <ol className="divide-y divide-ink-100">{g.listaEspera.map((e, i) => (
                  <li key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span><b className="mr-2 tabular-nums">{i + 1}.</b><Link href={`/alumnos/${e.alumnoId}`} className="font-semibold hover:underline">{e.apellidos}, {e.nombre}</Link><span className="ml-2 text-xs text-ink-500">solicitó {formatoFecha(e.fechaSolicitud)}</span></span>
                    <QuitarDeLista id={e.id} />
                  </li>))}</ol>
              </>
            )}
          </Card>

          <Card titulo="Cancelar una sesión (lluvia, profesor…)"><CancelarPorLluvia sesiones={proximas.map((s) => ({ id: s.id, etiqueta: `${nombreDia(new Date(s.fecha + 'T12:00').getDay())} ${formatoFecha(s.fecha)} · ${s.horaInicio}` }))} /></Card>
        </div>

        <div className="grid content-start gap-5">
          <Card titulo="Rentabilidad estimada">
            <dl className="space-y-2 p-4 text-sm">
              <div className="flex justify-between"><dt>Ingresos ({g.inscritos} × {formatoEuro(g.precioMensual)})</dt><dd className="tabular-nums font-semibold">{formatoEuro(g.ingresos)}</dd></div>
              <div className="flex justify-between"><dt>Coste profesor (≈ 4 clases/mes)</dt><dd className="tabular-nums">−{formatoEuro(g.coste)}</dd></div>
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base"><dt className="font-bold">Margen mensual</dt><dd className={`tabular-nums font-extrabold ${g.margen < 0 ? 'text-red-600' : 'text-brand-700'}`}>{formatoEuro(g.margen)}</dd></div>
            </dl>
            <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">Sin contar descuentos ni el uso de la pista.</p>
          </Card>
          <Card titulo="Historial de sesiones">
            {historial.length === 0 ? <Empty titulo="Sin sesiones" /> : (
              <ul className="divide-y divide-ink-100">{historial.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm"><span>{formatoFecha(s.fecha)}{s.motivoCancelacion ? <span className="ml-1 text-xs text-ink-500">({s.motivoCancelacion})</span> : null}{s.profesorReal && <span className="ml-1 text-xs text-violet-700">· sustituye {s.profesorReal}</span>}</span><Badge tone={EST[s.estado][0]}>{EST[s.estado][1]}</Badge></li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
