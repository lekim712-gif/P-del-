import Link from 'next/link';
import { Plus, Upload, Search } from 'lucide-react';
import { requireRol } from '@/lib/session';
import { listAlumnos } from '@/lib/services/alumnos';
import { listarGrupos } from '@/lib/services/grupos';
import { Badge, Card, Empty, NivelBadge, PageHeader, TableWrap } from '@/components/ui';
import { formatoEuro } from '@/lib/rules';

type SP = Promise<Record<string, string | undefined>>;

const ESTADO_TONO = { activo: 'verde', baja: 'gris', espera: 'ambar' } as const;

export default async function Alumnos({ searchParams }: { searchParams: SP }) {
  await requireRol('director', 'recepcion');
  const sp = await searchParams;
  const grupos = listarGrupos();
  const filas = listAlumnos({ q: sp.q, nivel: sp.nivel, estado: sp.estado, grupo: sp.grupo ? Number(sp.grupo) : undefined, cuota: sp.cuota, orden: sp.orden });
  const qs = (o: Record<string, string>) => new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) as Record<string, string>), ...o }).toString();
  return (
    <>
      <PageHeader titulo="Alumnos" subtitulo={`${filas.length} resultados`}
        acciones={<>
          <Link href="/alumnos/importar" className="btn-secondary"><Upload size={16} aria-hidden />Importar CSV</Link>
          <Link href="/alumnos/nuevo" className="btn-primary"><Plus size={16} aria-hidden />Nuevo alumno</Link>
        </>} />
      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <label className="sm:col-span-2">
          <span className="label">Buscar</span>
          <span className="relative block"><Search size={16} className="pointer-events-none absolute left-3 top-3 text-ink-500" aria-hidden /><input name="q" defaultValue={sp.q} placeholder="Nombre, email o teléfono" className="input pl-9" /></span>
        </label>
        <label><span className="label">Nivel</span>
          <select name="nivel" defaultValue={sp.nivel ?? ''} className="input"><option value="">Todos</option><option value="iniciacion">Iniciación</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option><option value="competicion">Competición</option></select></label>
        <label><span className="label">Estado</span>
          <select name="estado" defaultValue={sp.estado ?? ''} className="input"><option value="">Todos</option><option value="activo">Activo</option><option value="espera">En espera</option><option value="baja">Baja</option></select></label>
        <label><span className="label">Grupo</span>
          <select name="grupo" defaultValue={sp.grupo ?? ''} className="input"><option value="">Todos</option>{grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}</select></label>
        <label><span className="label">Cuota</span>
          <select name="cuota" defaultValue={sp.cuota ?? ''} className="input"><option value="">Todas</option><option value="pendiente">Con cuota pendiente</option></select></label>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <button className="btn-primary" type="submit">Aplicar filtros</button>
          <Link href="/alumnos" className="btn-secondary">Limpiar</Link>
        </div>
      </form>
      <Card>
        {filas.length === 0 ? <Empty titulo="Sin resultados" texto="Prueba a quitar algún filtro." /> : (
          <TableWrap>
            <thead className="border-b border-ink-100 bg-ink-50">
              <tr>
                <th className="th"><Link href={`?${qs({ orden: 'nombre' })}`}>Alumno</Link></th>
                <th className="th"><Link href={`?${qs({ orden: 'nivel' })}`}>Nivel</Link></th>
                <th className="th"><Link href={`?${qs({ orden: 'estado' })}`}>Estado</Link></th>
                <th className="th">Grupos</th><th className="th">Contacto</th><th className="th text-right">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filas.map((a) => (
                <tr key={a.id} className="hover:bg-ink-50">
                  <td className="td">
                    <Link href={`/alumnos/${a.id}`} className="font-semibold text-brand-800 hover:underline">{a.apellidos}, {a.nombre}</Link>
                    <div className="text-xs text-ink-500">{a.edad} años{a.tutor ? ` · tutor: ${a.tutor}` : ''}</div>
                  </td>
                  <td className="td"><NivelBadge nivel={a.nivel} /></td>
                  <td className="td"><Badge tone={ESTADO_TONO[a.estado as keyof typeof ESTADO_TONO]}>{a.estado === 'espera' ? 'En espera' : a.estado === 'baja' ? 'Baja' : 'Activo'}</Badge></td>
                  <td className="td max-w-[260px] text-xs text-ink-700">{a.grupos?.split(' | ').map((g) => <div key={g}>{g}</div>) ?? <span className="text-ink-300">—</span>}</td>
                  <td className="td text-xs text-ink-700">{a.telefono ?? a.email ?? <span className="text-ink-300">vía tutor</span>}</td>
                  <td className="td text-right tabular-nums">{a.cuotaPendiente > 0 ? <span className="font-semibold text-red-600">{formatoEuro(a.cuotaPendiente)}</span> : <span className="text-ink-300">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
