import Link from 'next/link';
import { requireRol } from '@/lib/session';
import { listarGrupos } from '@/lib/services/grupos';
import { Badge, Card, NivelBadge, PageHeader, Progress } from '@/components/ui';
import { formatoEuro, nombreDia } from '@/lib/rules';
import { horaFin } from '@/lib/services/common';

export default async function Grupos({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireRol('director', 'recepcion');
  const sp = await searchParams;
  const grupos = listarGrupos({ categoria: sp.categoria, nivel: sp.nivel });
  const pill = (href: string, texto: string, activo: boolean) => <Link href={href} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${activo ? 'bg-brand-700 text-white' : 'bg-white text-ink-700 ring-1 ring-ink-100 hover:bg-brand-50'}`}>{texto}</Link>;
  return (
    <>
      <PageHeader titulo="Grupos" subtitulo={`${grupos.length} grupos · temporada en curso`}
        acciones={<Link href="/calendario" className="btn-secondary">Ver calendario</Link>} />
      <div className="mb-4 flex flex-wrap gap-2">
        {pill('/grupos', 'Todos', !sp.categoria)}{pill('/grupos?categoria=adultos', 'Adultos', sp.categoria === 'adultos')}{pill('/grupos?categoria=infantil', 'Infantil', sp.categoria === 'infantil')}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {grupos.map((g) => {
          const lleno = g.inscritos >= g.plazasMax;
          return (
            <Link key={g.id} href={`/grupos/${g.id}`} className="card block p-4 transition hover:border-brand-400 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-bold text-ink-900">{nombreDia(g.diaSemana)} · {g.horaInicio}–{horaFin(g.horaInicio, g.duracionMin)}</p>
                  <p className="text-xs text-ink-500">{g.profesor} · {g.pista}</p></div>
                <NivelBadge nivel={g.nivel} />
              </div>
              <p className="mt-2 text-sm text-ink-700">{g.categoria === 'infantil' ? 'Infantil' : 'Adultos'} · {formatoEuro(g.precioMensual)}/mes</p>
              <div className="mt-3 flex items-center gap-3"><Progress valor={g.inscritos} max={g.plazasMax} /><span className="text-xs font-semibold tabular-nums">{g.inscritos}/{g.plazasMax}</span></div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {lleno && <Badge tone="ambar">Completo</Badge>}
                {g.espera > 0 && <Badge tone="morado">Lista de espera: {g.espera}</Badge>}
                {g.inscritos / g.plazasMax < 0.5 && <Badge tone="azul">Pocas inscripciones</Badge>}
              </div>
            </Link>
          );
        })}
      </div>
      <Card className="mt-5 hidden"><span /></Card>
    </>
  );
}
