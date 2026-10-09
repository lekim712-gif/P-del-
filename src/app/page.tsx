import Link from 'next/link';
import { AlertTriangle, ChevronRight, Clock, Hourglass, MessageSquare, Users, TrendingDown } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { getPanel } from '@/lib/services/panel';
import { Card, PageHeader, StatCard, Progress, Empty } from '@/components/ui';
import { formatoEuro, formatoFecha, diasEntre } from '@/lib/rules';
import { hoyISO } from '@/lib/db';

const MES = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5)) - 1, 1).toLocaleDateString('es-ES', { month: 'long' });

export default async function Panel() {
  await requireRol('director');
  const p = getPanel();
  const hoy = hoyISO();
  const maxIng = Math.max(1, ...p.ingresos.map((i) => i.cobrado + i.pendiente));

  const atencion: { icono: React.ReactNode; texto: React.ReactNode; href: string; tono: 'rojo' | 'ambar' | 'azul' }[] = [];
  if (p.vencidas.length) atencion.push({ icono: <AlertTriangle size={18} />, tono: 'rojo', href: '/cuotas?estado=vencida', texto: <><b>{p.vencidas.length} cuotas vencidas</b> ({formatoEuro(p.vencidas.reduce((a, c) => a + c.importeFinal, 0))}){p.graves.length > 0 && <>, {p.graves.length} con más de 20 días</>}</> });
  p.llenos.forEach((g) => atencion.push({ icono: <Users size={18} />, tono: 'ambar', href: `/grupos/${g.id}`, texto: <><b>{g.nombre}</b> está lleno y tiene {g.espera} en lista de espera: ¿abrir otro grupo?</> }));
  p.vacios.forEach((g) => atencion.push({ icono: <TrendingDown size={18} />, tono: 'azul', href: `/grupos/${g.id}`, texto: <><b>{g.nombre}</b> solo al {Math.round((g.inscritos / g.plazasMax) * 100)} % ({g.inscritos}/{g.plazasMax})</> }));
  if (p.caducan) atencion.push({ icono: <Hourglass size={18} />, tono: 'ambar', href: '/recuperaciones', texto: <><b>{p.caducan} recuperaciones</b> caducan en los próximos 7 días</> });
  if (p.pendientesRev) atencion.push({ icono: <MessageSquare size={18} />, tono: 'azul', href: '/mensajes', texto: <><b>{p.pendientesRev} mensajes</b> esperan tu revisión</> });
  const color = { rojo: 'bg-red-50 text-red-700', ambar: 'bg-amber-50 text-amber-800', azul: 'bg-sky-50 text-sky-800' };

  return (
    <>
      <PageHeader titulo="Panel del director" subtitulo={`Resumen de la escuela · hoy es ${formatoFecha(hoy)}`} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard etiqueta="Ocupación media" valor={`${p.ocupacionMedia} %`} detalle={`${p.insc} de ${p.plazas} plazas`} href="/grupos" />
        <StatCard etiqueta="Cobrado del mes" valor={formatoEuro(p.cobrado)} tono="bueno" href={`/cuotas?mes=${p.mes}&estado=pagada`} />
        <StatCard etiqueta="Pendiente de cobro" valor={formatoEuro(p.pendiente)} tono={p.pendiente > 0 ? 'alerta' : 'normal'} href={`/cuotas?mes=${p.mes}`} />
        <StatCard etiqueta="Tasa de impago" valor={`${p.tasaImpago} %`} detalle="cuotas sin pagar este mes" tono={p.tasaImpago > 15 ? 'alerta' : 'normal'} href="/cuotas?estado=vencida" />
        <StatCard etiqueta="Alumnos activos" valor={p.activos} href="/alumnos?estado=activo" />
        <StatCard etiqueta="Bajas del mes" valor={p.bajasMes} href="/alumnos?estado=baja" />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Card titulo="Requiere atención" className="xl:col-span-3" >
          {atencion.length === 0 ? <Empty titulo="Todo en orden" texto="No hay nada urgente ahora mismo." /> : (
            <ul className="divide-y divide-ink-100">
              {atencion.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-ink-50">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${color[a.tono]}`} aria-hidden>{a.icono}</span>
                    <span className="flex-1">{a.texto}</span>
                    <ChevronRight size={16} className="text-ink-300" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="grid gap-5 xl:col-span-2">
          <Card titulo="Ocupación por franja horaria">
            <ul className="space-y-3 p-4">
              {p.ocupacionFranja.map((f) => (
                <li key={f.id}>
                  <div className="mb-1 flex justify-between text-xs"><span className="font-semibold text-ink-700"><Clock size={12} className="mr-1 inline" aria-hidden />{f.nombre}</span><span className="tabular-nums text-ink-500">{f.pct} % · {f.inscritos}/{f.plazas}</span></div>
                  <Progress valor={f.inscritos} max={f.plazas} className="h-3" />
                </li>
              ))}
            </ul>
          </Card>
          <Card titulo="Ingresos de los últimos 3 meses">
            <div className="flex h-44 items-end justify-around gap-4 px-6 pb-3 pt-6" role="img" aria-label={p.ingresos.map((i) => `${MES(i.mes)}: cobrado ${formatoEuro(i.cobrado)}, pendiente ${formatoEuro(i.pendiente)}`).join('. ')}>
              {p.ingresos.map((i) => (
                <div key={i.mes} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-[11px] font-semibold tabular-nums text-ink-700">{formatoEuro(i.cobrado)}</span>
                  <div className="flex w-full max-w-[64px] flex-1 flex-col justify-end overflow-hidden rounded-t-lg">
                    <div className="w-full bg-red-300" style={{ height: `${(i.pendiente / maxIng) * 100}%` }} title={`Pendiente ${formatoEuro(i.pendiente)}`} />
                    <div className="w-full bg-brand-500" style={{ height: `${(i.cobrado / maxIng) * 100}%` }} title={`Cobrado ${formatoEuro(i.cobrado)}`} />
                  </div>
                  <span className="text-xs font-semibold capitalize text-ink-700">{MES(i.mes)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-4 border-t border-ink-100 px-4 py-2 text-xs text-ink-500">
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-brand-500" />Cobrado</span>
              <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-red-300" />Pendiente / vencido</span>
            </div>
          </Card>
        </div>
      </div>
      {p.graves.length > 0 && (
        <p className="mt-4 text-xs text-ink-500">Impago más antiguo: {formatoFecha(p.graves[0].fechaVencimiento)} ({diasEntre(p.graves[0].fechaVencimiento, hoy)} días).</p>
      )}
    </>
  );
}
