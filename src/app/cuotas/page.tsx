import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { listarCuotas, mesesConCuotas, totalesCuotas } from '@/lib/services/cuotas';
import { hoyISO } from '@/lib/db';
import { Badge, Card, Empty, EstadoCuota, PageHeader, StatCard, TableWrap } from '@/components/ui';
import { Cobrar, GenerarRecordatorios } from '@/components/CuotaAcciones';
import { diasEntre, formatoEuro, formatoFecha, mesDe } from '@/lib/rules';

export default async function Cuotas({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director', 'recepcion');
  const sp = await searchParams;
  const hoy = hoyISO();
  const meses = mesesConCuotas();
  const mes = sp.mes && meses.includes(sp.mes) ? sp.mes : mesDe(hoy);
  const filas = listarCuotas({ mes, estado: sp.estado, q: sp.q });
  const t = totalesCuotas(mes);
  const pill = (estado: string | undefined, texto: string) => <Link href={`/cuotas?mes=${mes}${estado ? `&estado=${estado}` : ''}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${sp.estado === estado ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-brand-50'}`}>{texto}</Link>;
  return (
    <>
      <PageHeader titulo="Cuotas" subtitulo="Cuotas mensuales por alumno · vencen el día configurado de cada mes"
        acciones={<>
          <GenerarRecordatorios />
          <a href={`/cuotas/export?mes=${mes}`} className="btn-secondary"><Download size={16} aria-hidden />Exportar CSV</a>
        </>} />
      <form className="mb-4 flex flex-wrap items-end gap-3">
        <label><span className="label">Mes</span><select name="mes" defaultValue={mes} className="input !w-auto">{meses.map((m) => <option key={m}>{m}</option>)}</select></label>
        {sp.estado && <input type="hidden" name="estado" value={sp.estado} />}
        <label className="min-w-[200px] flex-1"><span className="label">Buscar alumno</span><input name="q" defaultValue={sp.q} className="input" placeholder="Nombre…" /></label>
        <button className="btn-primary">Filtrar</button>
      </form>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard etiqueta="Cobrado" valor={formatoEuro(t.cobrado)} detalle={`${t.nCobradas} cuotas`} tono="bueno" />
        <StatCard etiqueta="Pendiente" valor={formatoEuro(t.pendiente)} detalle={`${t.nPendientes} cuotas dentro de plazo`} />
        <StatCard etiqueta="Vencido" valor={formatoEuro(t.vencido)} detalle={`${t.nVencidas} cuotas fuera de plazo`} tono={t.vencido > 0 ? 'alerta' : 'normal'} />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">{pill(undefined, 'Todas')}{pill('pendiente', 'Pendientes')}{pill('vencida', 'Vencidas')}{pill('pagada', 'Pagadas')}</div>
      <Card>
        {filas.length === 0 ? <Empty titulo="No hay cuotas con estos filtros" /> : (
          <TableWrap>
            <thead className="border-b border-ink-100 bg-ink-50"><tr><th className="th">Alumno</th><th className="th">Mes</th><th className="th text-right">Base</th><th className="th text-right">Dto.</th><th className="th text-right">Importe</th><th className="th">Vence</th><th className="th">Estado</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {filas.map((c) => {
                const retraso = c.estado === 'vencida' ? diasEntre(c.fechaVencimiento, hoy) : 0;
                return (
                  <tr key={c.id} className="hover:bg-ink-50">
                    <td className="td"><Link href={`/alumnos/${c.alumnoId}`} className="font-semibold text-brand-800 hover:underline">{c.alumno}</Link>{c.tutor && <div className="text-xs text-ink-500">Tutor: {c.tutor}</div>}</td>
                    <td className="td tabular-nums">{c.mes}</td>
                    <td className="td text-right tabular-nums">{formatoEuro(c.importeBase)}</td>
                    <td className="td text-right tabular-nums">{c.descuento > 0 ? <span className="text-brand-700">−{formatoEuro(c.descuento)}</span> : '—'}</td>
                    <td className="td text-right font-bold tabular-nums">{formatoEuro(c.importeFinal)}</td>
                    <td className="td text-xs">{formatoFecha(c.fechaVencimiento)}{retraso > 0 && <div className={retraso > 20 ? 'font-bold text-red-600' : 'text-red-600'}>{retraso} días de retraso</div>}</td>
                    <td className="td"><EstadoCuota estado={c.estado} />{c.fechaPago && <div className="mt-1 text-xs text-ink-500">{formatoFecha(c.fechaPago)} · {c.metodo}</div>}</td>
                    <td className="td min-w-[210px] text-right">{c.estado !== 'pagada' && <Cobrar cuotaId={c.id} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-500"><Badge>Nota</Badge> Los cobros son simulados: no hay pasarela de pago real en la demo.</p>
    </>
  );
}
