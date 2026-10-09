import Link from 'next/link';
import { Download } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { gruposDeProfesor, listarProfesores, mesesDisponibles, resumenMes, sesionesSustituibles } from '@/lib/services/profesores';
import { hoyISO } from '@/lib/db';
import { Badge, Card, Empty, PageHeader, StatCard, TableWrap } from '@/components/ui';
import { Sustitucion } from '@/components/Sustitucion';
import { formatoEuro, formatoFecha } from '@/lib/rules';

export default async function Profesores({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director');
  const sp = await searchParams;
  const meses = mesesDisponibles();
  const mes = sp.mes && meses.includes(sp.mes) ? sp.mes : hoyISO().slice(0, 7);
  const res = resumenMes(mes);
  const total = res.reduce((a, p) => a + p.importe, 0);
  const horas = res.reduce((a, p) => a + p.horas, 0);
  return (
    <>
      <PageHeader titulo="Profesores" subtitulo="Horas impartidas y pago del mes calculados automáticamente (solo sesiones impartidas)"
        acciones={<a href={`/profesores/export?mes=${mes}`} className="btn-secondary"><Download size={16} aria-hidden />Exportar resumen CSV</a>} />
      <form className="mb-4 flex items-end gap-3"><label><span className="label">Mes</span><select name="mes" defaultValue={mes} className="input !w-auto">{meses.map((m) => <option key={m}>{m}</option>)}</select></label><button className="btn-primary">Ver</button></form>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard etiqueta="Pago total del mes" valor={formatoEuro(total)} tono="bueno" />
        <StatCard etiqueta="Horas impartidas" valor={horas.toLocaleString('es-ES')} />
        <StatCard etiqueta="Sustituciones" valor={res.reduce((a, p) => a + p.detalle.filter((d) => d.esSustitucion).length, 0)} />
      </div>
      <div className="grid gap-5">
        {res.map((p) => (
          <Card key={p.id} titulo={<span>{p.nombre} <Badge className="ml-2">{p.tipoContrato === 'autonomo' ? 'Autónomo' : 'Contratado'}</Badge></span>} acciones={<span className="text-sm font-extrabold tabular-nums text-brand-800">{formatoEuro(p.importe)}</span>}>
            <div className="grid gap-4 p-4 sm:grid-cols-4">
              <div><p className="label">Tarifa</p><p className="font-semibold tabular-nums">{formatoEuro(p.tarifaHora)}/h</p></div>
              <div><p className="label">Clases impartidas</p><p className="font-semibold tabular-nums">{p.clases}</p></div>
              <div><p className="label">Horas</p><p className="font-semibold tabular-nums">{p.horas.toLocaleString('es-ES')} h</p></div>
              <div><p className="label">Teléfono</p><p className="font-semibold">{p.telefono}</p></div>
              <div className="sm:col-span-4"><p className="label">Grupos que lleva</p><p className="flex flex-wrap gap-2 text-sm">{gruposDeProfesor(p.id).map((g) => <Link key={g.id} href={`/grupos/${g.id}`} className="rounded-full bg-ink-50 px-3 py-1 font-medium text-brand-800 hover:underline">{g.nombre}</Link>)}</p></div>
            </div>
            <details className="border-t border-ink-100">
              <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold text-brand-700">Desglose por clase ({p.detalle.length})</summary>
              {p.detalle.length === 0 ? <Empty titulo="Sin clases impartidas este mes" /> : (
                <TableWrap>
                  <thead className="bg-ink-50"><tr><th className="th">Fecha</th><th className="th">Grupo</th><th className="th text-right">Horas</th><th className="th text-right">Importe</th><th className="th" /></tr></thead>
                  <tbody className="divide-y divide-ink-100">{p.detalle.map((c) => (
                    <tr key={c.sesionId}><td className="td tabular-nums">{formatoFecha(c.fecha)} {c.horaInicio}</td><td className="td">{c.grupo}</td><td className="td text-right tabular-nums">{c.horas.toLocaleString('es-ES')}</td><td className="td text-right tabular-nums">{formatoEuro(c.importe)}</td><td className="td">{c.esSustitucion && <Badge tone="morado">Sustituye a {c.titular}</Badge>}</td></tr>
                  ))}</tbody>
                </TableWrap>
              )}
            </details>
          </Card>
        ))}
      </div>
      <Card titulo="Sustituciones: marcar una sesión como cubierta por otro profesor" className="mt-5">
        <Sustitucion sesiones={sesionesSustituibles(mes)} profesores={listarProfesores().map((p) => ({ id: p.id, nombre: p.nombre }))} />
        <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">Las horas de una clase impartida se pagan a quien la dio, no al titular del grupo.</p>
      </Card>
    </>
  );
}
