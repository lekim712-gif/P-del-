'use client';

import { useState } from 'react';
import { bajaAction, inscribirAction, masivoAction, moverAction, quitarEsperaAction } from '@/app/actions';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';

type G = { id: number; nombre: string; inscritos: number; plazasMax: number };

export function InscribirEn({ alumnoId, grupos }: { alumnoId: number; grupos: G[] }) {
  const [g, setG] = useState(grupos[0]?.id ?? 0);
  const { run, pending } = useRun();
  if (!grupos.length) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[220px] flex-1"><span className="label">Inscribir en un grupo</span>
        <select className="input" value={g} onChange={(e) => setG(Number(e.target.value))}>
          {grupos.map((x) => <option key={x.id} value={x.id}>{x.nombre} ({x.inscritos}/{x.plazasMax}{x.inscritos >= x.plazasMax ? ' · lleno' : ''})</option>)}
        </select></label>
      <button className="btn-primary" disabled={pending} onClick={() => run(() => inscribirAction(alumnoId, g))}>Inscribir</button>
    </div>
  );
}

export function FilaGrupoAlumno({ alumnoId, grupoId, otros }: { alumnoId: number; grupoId: number; otros: G[] }) {
  const [dest, setDest] = useState(otros[0]?.id ?? 0);
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {otros.length > 0 && (
        <>
          <label className="sr-only" htmlFor={`mv-${grupoId}`}>Mover a otro grupo</label>
          <select id={`mv-${grupoId}`} className="input !min-h-[32px] !w-auto max-w-[210px] !py-0 text-xs" value={dest} onChange={(e) => setDest(Number(e.target.value))}>
            {otros.map((x) => <option key={x.id} value={x.id} disabled={x.inscritos >= x.plazasMax}>{x.nombre} ({x.inscritos}/{x.plazasMax})</option>)}
          </select>
          <button className="btn-secondary btn-sm" disabled={pending} onClick={() => run(() => moverAction(alumnoId, grupoId, dest))}>Mover</button>
        </>
      )}
      <ActionButton action={() => bajaAction(alumnoId, grupoId)} className="btn-secondary btn-sm !text-red-700" confirmar="¿Dar de baja a este alumno del grupo?">Baja</ActionButton>
    </div>
  );
}

export function QuitarEspera({ id }: { id: number }) {
  return <ActionButton action={() => quitarEsperaAction(id)}>Quitar</ActionButton>;
}

export function MensajeRapido({ alumnoId, plantillas }: { alumnoId: number; plantillas: { clave: string; nombre: string }[] }) {
  const [p, setP] = useState(plantillas[0]?.clave ?? '');
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[220px] flex-1"><span className="label">Enviar mensaje (simulado)</span>
        <select className="input" value={p} onChange={(e) => setP(e.target.value)}>{plantillas.map((x) => <option key={x.clave} value={x.clave}>{x.nombre}</option>)}</select></label>
      <button className="btn-secondary" disabled={pending} onClick={() => run(() => masivoAction({ plantilla: p, alumnoId }))}>Preparar mensaje</button>
    </div>
  );
}
