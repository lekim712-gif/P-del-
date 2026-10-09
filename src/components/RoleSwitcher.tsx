'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cambiarRol } from '@/app/actions';
import { ROLES, type Rol } from '@/lib/roles';

export function RoleSwitcher({ rol, actorId, profesores, tutores }: {
  rol: Rol; actorId: number; profesores: { id: number; nombre: string }[]; tutores: { id: number; nombre: string; hijos: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const cambiar = (r: Rol, a: number) => start(async () => { const destino = await cambiarRol(r, a); router.push(destino); router.refresh(); });
  const actores = rol === 'profesor' ? profesores.map((p) => ({ id: p.id, nombre: p.nombre })) : rol === 'familia' ? tutores.map((t) => ({ id: t.id, nombre: `${t.nombre} (${t.hijos})` })) : null;
  return (
    <div className="flex items-center gap-2" aria-busy={pending}>
      <label className="sr-only" htmlFor="rol">Rol</label>
      <select id="rol" value={rol} onChange={(e) => cambiar(e.target.value as Rol, 0)} className="min-h-[36px] rounded-lg border border-white/30 bg-brand-800 px-2 text-sm font-semibold text-white">
        {ROLES.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
      </select>
      {actores && (
        <>
          <label className="sr-only" htmlFor="actor">{rol === 'profesor' ? 'Profesor' : 'Familia'}</label>
          <select id="actor" value={actorId} onChange={(e) => cambiar(rol, Number(e.target.value))} className="min-h-[36px] max-w-[9.5rem] rounded-lg border border-white/30 bg-brand-800 px-2 text-sm text-white sm:max-w-[16rem]">
            {actores.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        </>
      )}
    </div>
  );
}
