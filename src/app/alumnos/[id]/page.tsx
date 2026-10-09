import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil, ShieldCheck, ShieldAlert } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { getAlumno } from '@/lib/services/alumnos';
import { listarGrupos } from '@/lib/services/grupos';
import { listarPlantillas } from '@/lib/services/mensajes';
import { Badge, Card, EstadoCuota, NivelBadge, PageHeader, Empty, Aviso } from '@/components/ui';
import { FilaGrupoAlumno, InscribirEn, MensajeRapido, QuitarEspera } from '@/components/AlumnoAcciones';
import { formatoEuro, formatoFecha, nombreDia } from '@/lib/rules';

const ASIST: Record<string, [string, 'verde' | 'rojo' | 'ambar' | 'azul']> = {
  presente: ['Presente', 'verde'], ausente: ['Ausente', 'rojo'], ausenteAvisado: ['Ausente avisado', 'ambar'], recuperacion: ['Recuperación', 'azul'],
};

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('director', 'recepcion');
  const a = getAlumno(Number((await params).id));
  if (!a) notFound();
  const todos = listarGrupos();
  const ids = new Set([...a.grupos.map((g) => g.id), ...a.espera.map((e) => e.grupoId)]);
  const cat = a.edad < 14 ? 'infantil' : 'adultos';
  const disponibles = todos.filter((g) => !ids.has(g.id) && g.categoria === cat);
  return (
    <>
      <PageHeader titulo={`${a.nombre} ${a.apellidos}`}
        subtitulo={<span className="inline-flex flex-wrap items-center gap-2"><NivelBadge nivel={a.nivel} /><Badge tone={a.estado === 'activo' ? 'verde' : a.estado === 'baja' ? 'gris' : 'ambar'}>{a.estado}</Badge>{a.edad} años · alta {formatoFecha(a.fechaAlta)}</span>}
        acciones={<Link href={`/alumnos/${a.id}/editar`} className="btn-secondary"><Pencil size={16} aria-hidden />Editar</Link>} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="grid content-start gap-5 lg:col-span-2">
          <Card titulo="Grupos">
            {a.grupos.length === 0 && a.espera.length === 0 && <Empty titulo="Sin grupo" texto="Inscríbelo abajo para que empiece a pagar cuota y a aparecer en las listas." />}
            <ul className="divide-y divide-ink-100">
              {a.grupos.map((g) => (
                <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div><Link href={`/grupos/${g.id}`} className="font-semibold text-brand-800 hover:underline">{g.nombre}</Link>
                    <p className="text-xs text-ink-500">{nombreDia(g.diaSemana)} {g.horaInicio} · {g.profesor} · {g.pista} · {formatoEuro(g.precioMensual)}/mes</p></div>
                  <FilaGrupoAlumno alumnoId={a.id} grupoId={g.id} otros={todos.filter((x) => x.id !== g.id && x.categoria === g.categoria && !ids.has(x.id)).map((x) => ({ id: x.id, nombre: x.nombre, inscritos: x.inscritos, plazasMax: x.plazasMax }))} />
                </li>
              ))}
              {a.espera.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-2 bg-amber-50 px-4 py-3 text-sm">
                  <span><Badge tone="ambar">Lista de espera</Badge> <Link href={`/grupos/${e.grupoId}`} className="font-semibold hover:underline">{e.nombre}</Link> <span className="text-xs text-ink-500">desde {formatoFecha(e.fechaSolicitud)}</span></span>
                  <QuitarEspera id={e.id} />
                </li>
              ))}
            </ul>
            <div className="border-t border-ink-100 p-4"><InscribirEn alumnoId={a.id} grupos={disponibles.map((g) => ({ id: g.id, nombre: g.nombre, inscritos: g.inscritos, plazasMax: g.plazasMax }))} /></div>
          </Card>

          <Card titulo="Asistencia reciente">
            {a.asistencia.length === 0 ? <Empty titulo="Aún no hay asistencia" /> : (
              <ul className="divide-y divide-ink-100">{a.asistencia.map((s, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2 text-sm"><span>{formatoFecha(s.fecha)} · <span className="text-ink-500">{s.grupo}</span></span><Badge tone={ASIST[s.estado][1]}>{ASIST[s.estado][0]}</Badge></li>
              ))}</ul>
            )}
          </Card>

          <Card titulo="Cuotas">
            {a.cuotas.length === 0 ? <Empty titulo="Sin cuotas" /> : (
              <ul className="divide-y divide-ink-100">{a.cuotas.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="tabular-nums">{c.mes}{c.descuento > 0 && <span className="ml-2 text-xs text-brand-700">dto. {formatoEuro(c.descuento)}</span>}</span>
                  <span className="flex items-center gap-3"><span className="tabular-nums font-semibold">{formatoEuro(c.importeFinal)}</span><EstadoCuota estado={c.estado} /></span>
                </li>
              ))}</ul>
            )}
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card titulo="Datos de contacto">
            <dl className="space-y-2 p-4 text-sm">
              <div><dt className="label">Teléfono</dt><dd>{a.telefono ?? '—'}</dd></div>
              <div><dt className="label">Email</dt><dd className="break-all">{a.email ?? '—'}</dd></div>
              <div><dt className="label">Nacimiento</dt><dd>{formatoFecha(a.fechaNacimiento)}</dd></div>
              {a.notas && <div><dt className="label">Notas</dt><dd>{a.notas}</dd></div>}
            </dl>
          </Card>
          {a.tutorInfo && (
            <Card titulo="Tutor">
              <div className="space-y-2 p-4 text-sm">
                <p className="font-semibold">{a.tutorInfo.nombre}</p>
                <p>{a.tutorInfo.telefono} · <span className="break-all">{a.tutorInfo.email}</span></p>
                {a.tutorInfo.consentimientoFecha
                  ? <p className="flex items-center gap-1.5 text-brand-700"><ShieldCheck size={16} aria-hidden />Consentimiento {a.tutorInfo.consentimientoVersion} · {formatoFecha(a.tutorInfo.consentimientoFecha)}</p>
                  : <Aviso tono="rojo"><span><ShieldAlert size={14} className="mr-1 inline" aria-hidden />Sin consentimiento registrado: no se puede inscribir al menor.</span></Aviso>}
                {a.hermanos.length > 0 && <p className="text-xs text-ink-500">Hermanos: {a.hermanos.map((h) => <Link key={h.id} className="mr-1 font-semibold text-brand-800 hover:underline" href={`/alumnos/${h.id}`}>{h.nombre}</Link>)}</p>}
              </div>
            </Card>
          )}
          <Card titulo="Recuperaciones">
            {a.recuperaciones.length === 0 ? <Empty titulo="Sin recuperaciones" /> : (
              <ul className="divide-y divide-ink-100">{a.recuperaciones.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-4 py-2 text-sm"><span>{formatoFecha(r.fechaOrigen)} <span className="text-xs text-ink-500">{r.origen === 'cancelacion' ? 'clase cancelada' : 'ausencia'}</span></span><Badge tone={r.estado === 'pendiente' ? 'ambar' : r.estado === 'reservada' ? 'azul' : r.estado === 'usada' ? 'verde' : 'gris'}>{r.estado}</Badge></li>
              ))}</ul>
            )}
          </Card>
          <Card titulo="Comunicación"><div className="p-4"><MensajeRapido alumnoId={a.id} plantillas={listarPlantillas().filter((p) => p.clave !== 'coordinador').map((p) => ({ clave: p.clave, nombre: p.nombre }))} /></div></Card>
        </div>
      </div>
    </>
  );
}
