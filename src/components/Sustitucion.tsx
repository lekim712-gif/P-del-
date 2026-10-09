'use client';

import { useState } from 'react';
import { sustitutoAction } from '@/app/actions';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';
import { formatoFecha } from '@/lib/rules';

type S = { id: number; fecha: string; grupo: string; horaInicio: string; estado: string; profesorId: number; profesorRealId: number | null; titular: string };

export function Sustitucion({ sesiones, profesores }: { sesiones: S[]; profesores: { id: number; nombre: string }[] }) {
  const [s, setS] = useState(sesiones[0]?.id ?? 0);
  const sel = sesiones.find((x) => x.id === s);
  const [p, setP] = useState(0);
  const { run, pending } = useRun();
  const candidatos = profesores.filter((x) => x.id !== sel?.profesorId);
  const prof = p && candidatos.some((c) => c.id === p) ? p : candidatos[0]?.id ?? 0;
  if (!sesiones.length) return <p className="p-4 text-sm text-ink-500">No hay sesiones este mes.</p>;
  return (
    <div className="grid gap-3 p-4 md:grid-cols-[2fr_1fr_auto] md:items-end">
      <label><span className="label">Sesión</span>
        <select className="input" value={s} onChange={(e) => setS(Number(e.target.value))}>
          {sesiones.map((x) => <option key={x.id} value={x.id}>{formatoFecha(x.fecha)} {x.horaInicio} · {x.grupo} ({x.titular}{x.profesorRealId ? ' → sustituido' : ''})</option>)}
        </select></label>
      <label><span className="label">Cubre</span>
        <select className="input" value={prof} onChange={(e) => setP(Number(e.target.value))}>{candidatos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}</select></label>
      <div className="flex gap-2">
        <button className="btn-primary" disabled={pending || !prof} onClick={() => run(() => sustitutoAction(s, prof))}>Marcar sustitución</button>
        {sel?.profesorRealId && <ActionButton action={() => sustitutoAction(s, null)} className="btn-secondary">Quitar</ActionButton>}
      </div>
    </div>
  );
}
