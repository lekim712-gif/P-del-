import Link from 'next/link';
import { requireRol } from '@/lib/session';
import { listarRecuperaciones } from '@/lib/services/recuperaciones';
import { getConfig } from '@/lib/db';
import { Aviso, Badge, Card, Empty, NivelBadge, PageHeader, TableWrap } from '@/components/ui';
import { Liberar, Reservar } from '@/components/Reservar';
import { formatoFecha } from '@/lib/rules';

const TONO = { pendiente: 'ambar', reservada: 'azul', usada: 'verde', caducada: 'gris' } as const;

export default async function Recuperaciones({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director', 'recepcion');
  const sp = await searchParams;
  const estado = sp.estado ?? 'abiertas';
  const todas = listarRecuperaciones();
  const filas = estado === 'abiertas' ? todas.filter((r) => r.estado === 'pendiente' || r.estado === 'reservada') : estado === 'todas' ? todas : todas.filter((r) => r.estado === estado);
  const cfg = getConfig();
  const pill = (e: string, t: string) => <Link href={`/recuperaciones?estado=${e}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${estado === e ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-brand-50'}`}>{t}</Link>;
  return (
    <>
      <PageHeader titulo="Recuperaciones" subtitulo="Derechos generados por ausencias avisadas y por clases canceladas" />
      <div className="mb-4"><Aviso tono="azul">Reglas vigentes: ausencia avisada con ≥ {cfg.horasAvisoAusencia} h · máximo {cfg.maxRecuperacionesMes} recuperaciones al mes (las de clase cancelada no cuentan) · caducan a los {cfg.diasCaducidadRecuperacion} días · solo en sesiones futuras del mismo nivel con plaza.</Aviso></div>
      <div className="mb-4 flex flex-wrap gap-2">{pill('abiertas', 'Abiertas')}{pill('pendiente', 'Pendientes')}{pill('reservada', 'Reservadas')}{pill('usada', 'Usadas')}{pill('caducada', 'Caducadas')}{pill('todas', 'Todas')}</div>
      <Card>
        {filas.length === 0 ? <Empty titulo="No hay recuperaciones en esta vista" /> : (
          <TableWrap>
            <thead className="border-b border-ink-100 bg-ink-50"><tr><th className="th">Alumno</th><th className="th">Origen</th><th className="th">Estado</th><th className="th">Caduca</th><th className="th">Reserva</th><th className="th" /></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {filas.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="td"><Link href={`/alumnos/${r.alumnoId}`} className="font-semibold text-brand-800 hover:underline">{r.alumno}</Link><div className="mt-1"><NivelBadge nivel={r.nivel} /></div></td>
                  <td className="td text-xs"><b>{r.origen === 'cancelacion' ? 'Clase cancelada' : 'Ausencia avisada'}</b><br />{formatoFecha(r.fechaOrigen)} · {r.grupoOrigen}</td>
                  <td className="td"><Badge tone={TONO[r.estado as keyof typeof TONO]}>{r.estado}</Badge></td>
                  <td className="td text-xs">{formatoFecha(r.caducaEn)}{r.estado === 'pendiente' && <span className={r.diasRestantes <= 7 ? 'ml-1 font-bold text-red-600' : 'ml-1 text-ink-500'}>({r.diasRestantes} días)</span>}</td>
                  <td className="td text-xs">{r.destinoFecha ? <>{formatoFecha(r.destinoFecha)} {r.destinoHora}<br />{r.destinoGrupo}</> : <span className="text-ink-300">—</span>}</td>
                  <td className="td min-w-[200px]">{r.estado === 'pendiente' ? <Reservar recuperacionId={r.id} compacto /> : r.estado === 'reservada' ? <Liberar recuperacionId={r.id} /> : null}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
