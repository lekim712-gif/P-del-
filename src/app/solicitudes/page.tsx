import Link from 'next/link';
import { requireRol } from '@/lib/session';
import { listarSolicitudes } from '@/lib/services/disponibilidad';
import { Badge, Card, Empty, NivelBadge, PageHeader, TableWrap } from '@/components/ui';
import { ResolverSolicitud } from '@/components/AlumnoPanelUI';
import { formatoFecha } from '@/lib/rules';

export default async function Solicitudes() {
  await requireRol('director', 'recepcion');
  const filas = listarSolicitudes(true);
  return (
    <>
      <PageHeader titulo="Solicitudes de plaza" subtitulo="Grupos pedidos por los alumnos desde su cuenta. Al confirmar se aplican las reglas de plazas y de menores." />
      <Card>
        {filas.length === 0 ? <Empty titulo="No hay solicitudes pendientes" texto="Aparecerán cuando un alumno pida plaza desde su panel." /> : (
          <TableWrap>
            <thead className="border-b border-ink-100 bg-ink-50"><tr><th className="th">Alumno</th><th className="th">Grupo pedido</th><th className="th">Plazas</th><th className="th">Encaja</th><th className="th">Fecha</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-ink-100">{filas.map((s) => (
              <tr key={s.id}>
                <td className="td"><Link href={`/alumnos/${s.alumnoId}`} className="font-semibold text-brand-800 hover:underline">{s.alumno}</Link><div className="mt-1"><NivelBadge nivel={s.nivel} /></div></td>
                <td className="td">{s.grupo}</td>
                <td className="td">{s.inscritos >= s.plazasMax ? <Badge tone="ambar">Completo → lista de espera</Badge> : <span className="tabular-nums">{s.inscritos}/{s.plazasMax}</span>}</td>
                <td className="td">{s.encaja ? <Badge tone="verde">Su disponibilidad</Badge> : <Badge>Fuera de su disponibilidad</Badge>}</td>
                <td className="td text-xs">{formatoFecha(s.creadoEn)}</td>
                <td className="td min-w-[200px]"><ResolverSolicitud id={s.id} /></td>
              </tr>))}</tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
