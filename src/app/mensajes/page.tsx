import Link from 'next/link';
import { requireRol } from '@/lib/session';
import { listarMensajes, listarPlantillas } from '@/lib/services/mensajes';
import { listarGrupos } from '@/lib/services/grupos';
import { AprobarTodos, EditorPlantilla, EnvioMasivo, TarjetaMensaje } from '@/components/MensajesUI';
import { Card, Empty, PageHeader } from '@/components/ui';

export default async function Mensajes({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director', 'recepcion');
  const tab = (await searchParams).tab ?? 'bandeja';
  const pendientes = listarMensajes('pendienteRevision');
  const tabs = [['bandeja', `Bandeja de salida (${pendientes.length})`], ['enviados', 'Enviados'], ['plantillas', 'Plantillas'], ['masivo', 'Envío masivo']];
  return (
    <>
      <PageHeader titulo="Comunicación" subtitulo="Todo se revisa antes de salir · el envío es simulado en la demo" />
      <div className="mb-4 flex flex-wrap gap-2">{tabs.map(([k, t]) => <Link key={k} href={`/mensajes?tab=${k}`} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${tab === k ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-brand-50'}`}>{t}</Link>)}</div>
      {tab === 'bandeja' && (
        <>
          <div className="mb-3 flex justify-end"><AprobarTodos ids={pendientes.map((m) => m.id)} /></div>
          {pendientes.length === 0 ? <Card><Empty titulo="La bandeja está vacía" texto="Genera recordatorios desde Cuotas, cancela una clase o crea un envío masivo." /></Card>
            : <ul className="grid gap-3 lg:grid-cols-2">{pendientes.map((m) => <TarjetaMensaje key={m.id} m={m} />)}</ul>}
        </>
      )}
      {tab === 'enviados' && (() => { const env = listarMensajes('enviadoSimulado'); return env.length === 0 ? <Card><Empty titulo="Todavía no se ha enviado nada" /></Card> : <ul className="grid gap-3 lg:grid-cols-2">{env.map((m) => <TarjetaMensaje key={m.id} m={m} />)}</ul>; })()}
      {tab === 'plantillas' && <div className="grid gap-4 lg:grid-cols-2">{listarPlantillas().map((p) => <EditorPlantilla key={p.clave} {...p} />)}</div>}
      {tab === 'masivo' && <EnvioMasivo plantillas={listarPlantillas().map((p) => ({ clave: p.clave, nombre: p.nombre }))} grupos={listarGrupos().map((g) => ({ id: g.id, nombre: g.nombre }))} />}
    </>
  );
}
