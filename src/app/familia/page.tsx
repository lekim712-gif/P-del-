import { requireRol } from '@/lib/session';
import { getFamilia } from '@/lib/services/familia';
import { Badge, Card, Empty, EstadoCuota, NivelBadge, PageHeader } from '@/components/ui';
import { AvisarAusencia } from '@/components/FamiliaAcciones';
import { Burbuja } from '@/components/MensajesUI';
import { formatoEuro, formatoFecha, nombreDia, fechaHora } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

export default async function Familia() {
  const { actorId } = await requireRol('familia');
  const f = getFamilia(actorId);
  if (!f) return <Empty titulo="No se encuentra la familia" />;
  const pendiente = f.cuotas.filter((c) => c.estado !== 'pagada').reduce((a, c) => a + c.importeFinal, 0);
  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <PageHeader titulo={`Hola, ${f.tutor.nombre.split(' ')[0]}`} subtitulo={`Familia de ${f.hijos.map((h) => h.nombre).join(' y ')}`} />
      {pendiente > 0 && <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">Tienes <b>{formatoEuro(pendiente)}</b> pendientes de pago. Puedes abonarlos en recepción o por transferencia.</div>}

      {f.proximas.map(({ hijo, grupos, sesiones, recuperaciones }) => (
        <Card key={hijo.id} className="mb-4" titulo={<span className="flex items-center gap-2">{hijo.nombre} {hijo.apellidos} <NivelBadge nivel={hijo.nivel} /></span>}>
          <div className="space-y-4 p-4">
            <div>
              <p className="label">Horario</p>
              {grupos.length === 0 ? <p className="text-sm text-ink-500">Sin grupo asignado.</p> : (
                <ul className="grid gap-1.5">{grupos.map((g) => <li key={g.id} className="rounded-lg bg-ink-50 px-3 py-2 text-sm"><b>{nombreDia(g.diaSemana)} {g.horaInicio}–{horaFin(g.horaInicio, g.duracionMin)}</b><span className="block text-xs text-ink-500">{g.pista} · {g.profesor}</span></li>)}</ul>
              )}
            </div>
            <div>
              <p className="label">Próximas clases</p>
              {sesiones.length === 0 ? <p className="text-sm text-ink-500">No hay clases próximas.</p> : (
                <ul className="grid gap-1.5">{sesiones.map((s) => (
                  <li key={s.sesionId} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
                    <span>{nombreDia(fechaHora(s.fecha).getDay())} {formatoFecha(s.fecha)} · {s.horaInicio}</span>
                    {s.estado === 'cancelada' ? <Badge tone="rojo">Cancelada</Badge> : s.asistencia === 'ausenteAvisado' ? <Badge tone="ambar">Ausencia avisada</Badge> : s.asistencia === 'ausente' ? <Badge tone="gris">Ausencia (sin recup.)</Badge> : <Badge tone="verde">Confirmada</Badge>}
                  </li>))}</ul>
              )}
            </div>
            <AvisarAusencia alumnoId={hijo.id} nombre={hijo.nombre} sesiones={sesiones.filter((s) => s.estado === 'programada').map((s) => ({ sesionId: s.sesionId, etiqueta: `${nombreDia(fechaHora(s.fecha).getDay())} ${formatoFecha(s.fecha)} · ${s.horaInicio}`, yaAvisada: s.asistencia === 'ausenteAvisado' || s.asistencia === 'ausente' }))} />
            {recuperaciones.length > 0 && (
              <div>
                <p className="label">Recuperaciones</p>
                <ul className="grid gap-1.5">{recuperaciones.map((r) => (
                  <li key={r.id} className="rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900">
                    {r.estado === 'reservada' ? <>Reservada: <b>{formatoFecha(r.destinoFecha!)} {r.destinoHora}</b> · {r.destinoGrupo}</> : <>Pendiente de reservar · caduca el <b>{formatoFecha(r.caducaEn)}</b> <span className="text-xs">(pídela en recepción)</span></>}
                  </li>))}</ul>
              </div>
            )}
          </div>
        </Card>
      ))}

      <Card titulo="Cuotas" className="mb-4">
        {f.cuotas.length === 0 ? <Empty titulo="Sin cuotas" /> : (
          <ul className="divide-y divide-ink-100">{f.cuotas.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span><b className="tabular-nums">{c.mes}</b> · {c.alumno.split(' ')[0]}{c.descuento > 0 && <span className="ml-1 text-xs text-brand-700">(dto. {formatoEuro(c.descuento)})</span>}</span>
              <span className="flex items-center gap-2"><b className="tabular-nums">{formatoEuro(c.importeFinal)}</b><EstadoCuota estado={c.estado} /></span>
            </li>))}</ul>
        )}
      </Card>

      <Card titulo="Mensajes recibidos">
        {f.mensajes.length === 0 ? <Empty titulo="Todavía no has recibido mensajes" /> : (
          <ul className="grid gap-3 p-4">{f.mensajes.map((m) => <li key={m.id}><p className="mb-1 text-xs text-ink-500">{formatoFecha(m.creadoEn)}</p><Burbuja texto={m.texto} hora={m.creadoEn.slice(11)} enviado /></li>)}</ul>
        )}
      </Card>
    </div>
  );
}
