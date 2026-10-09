import Link from 'next/link';
import { requireRol } from '@/lib/session';
import { getAlumno } from '@/lib/services/alumnos';
import { getDisponibilidad, propuestasPara, solicitudesDeAlumno } from '@/lib/services/disponibilidad';
import { listarRecuperaciones } from '@/lib/services/recuperaciones';
import { proximasSesionesAlumno } from '@/lib/services/familia';
import { Aviso, Badge, Card, Empty, EstadoCuota, NivelBadge, PageHeader } from '@/components/ui';
import { CancelarSolicitud, DisponibilidadForm, NoVoy, SolicitarBoton } from '@/components/AlumnoPanelUI';
import { Liberar, Reservar } from '@/components/Reservar';
import { formatoEuro, formatoFecha, nombreDia, fechaHora } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

export default async function PanelAlumno() {
  const { actorId } = await requireRol('alumno');
  const a = getAlumno(actorId);
  if (!a) return <Empty titulo="No se encuentra la cuenta" />;
  const disp = getDisponibilidad(actorId);
  const propuestas = propuestasPara(actorId);
  const encajan = propuestas.filter((p) => p.encaja);
  const otros = propuestas.filter((p) => !p.encaja);
  const rec = listarRecuperaciones({ alumnoId: actorId }).filter((r) => r.estado === 'pendiente' || r.estado === 'reservada');
  const sesiones = proximasSesionesAlumno(actorId);
  const solicitudes = solicitudesDeAlumno(actorId);
  const pendiente = a.cuotas.filter((c) => c.estado !== 'pagada').reduce((x, c) => x + c.importeFinal, 0);
  const fila = (p: (typeof propuestas)[number]) => (
    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div className="min-w-0"><p className="font-semibold">{nombreDia(p.diaSemana)} {p.horaInicio}–{horaFin(p.horaInicio, p.duracionMin)}</p>
        <p className="text-xs text-ink-500">{p.profesor} · {p.pista} · {formatoEuro(p.precioMensual)}/mes · {p.plazasLibres > 0 ? `${p.plazasLibres} plaza${p.plazasLibres === 1 ? '' : 's'} libre${p.plazasLibres === 1 ? '' : 's'}` : <b className="text-amber-700">completo ({p.espera} en espera)</b>}</p></div>
      {p.solicitud ? <Badge tone="azul">Solicitado</Badge> : <SolicitarBoton alumnoId={actorId} grupoId={p.id} lleno={p.plazasLibres <= 0} />}
    </li>
  );
  return (
    <div className="mx-auto max-w-2xl lg:mx-0">
      <PageHeader titulo={`Hola, ${a.nombre}`} subtitulo={<span className="inline-flex items-center gap-2">Tu nivel: <NivelBadge nivel={a.nivel} /></span>} />
      {pendiente > 0 && <div className="mb-4"><Aviso>Tienes {formatoEuro(pendiente)} pendientes de pago. Puedes abonarlos en recepción.</Aviso></div>}
      <div className="grid gap-4">
        <Card titulo="Mis próximas clases">
          {a.grupos.length === 0 ? <Empty titulo="Todavía no tienes grupo" texto="Indica tu disponibilidad abajo y solicita uno de los grupos propuestos." /> : <NoVoy alumnoId={actorId} sesiones={sesiones.map((s) => ({ sesionId: s.sesionId, estado: s.estado, asistencia: s.asistencia, etiqueta: `${nombreDia(fechaHora(s.fecha).getDay())} ${formatoFecha(s.fecha)} · ${s.horaInicio}` }))} />}
        </Card>

        {rec.length > 0 && (
          <Card titulo="Mis recuperaciones">
            <ul className="divide-y divide-ink-100">{rec.map((r) => (
              <li key={r.id} className="grid gap-2 p-3 text-sm">
                {r.estado === 'reservada'
                  ? <div className="flex items-center justify-between gap-2"><span>Reservada: <b>{formatoFecha(r.destinoFecha!)} {r.destinoHora}</b> · {r.destinoGrupo}</span><Liberar recuperacionId={r.id} /></div>
                  : <><span>Pendiente · caduca el <b>{formatoFecha(r.caducaEn)}</b> <span className="text-xs text-ink-500">({r.origen === 'cancelacion' ? 'clase cancelada' : 'ausencia avisada'})</span></span><Reservar recuperacionId={r.id} /></>}
              </li>))}</ul>
          </Card>
        )}

        <Card titulo="Cuándo puedo ir"><DisponibilidadForm alumnoId={actorId} inicial={disp} /></Card>

        <Card titulo={`Grupos de nivel ${a.nivel} para ti`}>
          {disp.length === 0 ? <div className="p-4"><Aviso tono="azul">Marca tu disponibilidad y aquí verás los grupos de tu nivel que encajan.</Aviso></div> : (
            <>
              {encajan.length === 0 ? <p className="px-4 py-3 text-sm text-ink-500">Ningún grupo de tu nivel encaja con esa disponibilidad. Amplía algún día u hora.</p>
                : <ul className="divide-y divide-ink-100">{encajan.map(fila)}</ul>}
              {otros.length > 0 && <details className="border-t border-ink-100"><summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-brand-700">Otros grupos de tu nivel, fuera de tu disponibilidad ({otros.length})</summary><ul className="divide-y divide-ink-100">{otros.map(fila)}</ul></details>}
            </>
          )}
        </Card>

        {solicitudes.length > 0 && (
          <Card titulo="Mis solicitudes">
            <ul className="divide-y divide-ink-100">{solicitudes.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-3 text-sm"><span>{s.grupo}<span className="block text-xs text-ink-500">{formatoFecha(s.creadoEn)}</span></span>
                <span className="flex items-center gap-2"><Badge tone={s.estado === 'confirmada' ? 'verde' : s.estado === 'rechazada' ? 'rojo' : s.estado === 'espera' ? 'morado' : 'azul'}>{s.estado === 'pendiente' ? 'Pendiente de confirmar' : s.estado === 'espera' ? 'En lista de espera' : s.estado}</Badge>{s.estado === 'pendiente' && <CancelarSolicitud id={s.id} />}</span></li>))}</ul>
          </Card>
        )}

        <Card titulo="Mis cuotas">
          {a.cuotas.length === 0 ? <Empty titulo="Sin cuotas" /> : <ul className="divide-y divide-ink-100">{a.cuotas.slice(0, 6).map((c) => <li key={c.id} className="flex items-center justify-between px-4 py-2.5 text-sm"><span className="tabular-nums">{c.mes}</span><span className="flex items-center gap-3"><b className="tabular-nums">{formatoEuro(c.importeFinal)}</b><EstadoCuota estado={c.estado} /></span></li>)}</ul>}
        </Card>
        <p className="text-xs text-ink-500">¿Tu nivel no es el correcto? Díselo a recepción. <Link href="/alumno/registro" className="font-semibold text-brand-700 underline">Crear otra cuenta</Link></p>
      </div>
    </div>
  );
}
