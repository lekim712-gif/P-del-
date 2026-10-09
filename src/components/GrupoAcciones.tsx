'use client';

import { useState } from 'react';
import { CloudRain } from 'lucide-react';
import { bajaAction, cancelarSesionAction, inscribirAction, promoverAction, quitarEsperaAction } from '@/app/actions';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';

export function InscribirAlumno({ grupoId, alumnos, completo }: { grupoId: number; alumnos: { id: number; nombre: string; apellidos: string; nivel: string; estado: string }[]; completo: boolean }) {
  const [a, setA] = useState(0);
  const { run, pending } = useRun();
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="min-w-[240px] flex-1"><span className="label">{completo ? 'Intentar inscribir (el grupo está lleno)' : 'Inscribir alumno'}</span>
        <select className="input" value={a} onChange={(e) => setA(Number(e.target.value))}>
          <option value={0}>Selecciona un alumno…</option>
          {alumnos.map((x) => <option key={x.id} value={x.id}>{x.apellidos}, {x.nombre} · {x.nivel}{x.estado !== 'activo' ? ` (${x.estado})` : ''}</option>)}
        </select></label>
      <button className="btn-primary" disabled={!a || pending} onClick={() => run(() => inscribirAction(a, grupoId), { onOk: () => setA(0) })}>{completo ? 'Inscribir / lista de espera' : 'Inscribir'}</button>
    </div>
  );
}

export function BajaAlumno({ alumnoId, grupoId }: { alumnoId: number; grupoId: number }) {
  return <ActionButton action={() => bajaAction(alumnoId, grupoId)} confirmar="¿Dar de baja del grupo?" className="btn-secondary btn-sm !text-red-700">Baja</ActionButton>;
}

export function PromoverPrimero({ grupoId, hayPlaza, hayLista }: { grupoId: number; hayPlaza: boolean; hayLista: boolean }) {
  return <ActionButton action={() => promoverAction(grupoId)} className="btn-primary btn-sm" disabled={!hayPlaza || !hayLista}>Inscribir al primero de la lista</ActionButton>;
}

export function QuitarDeLista({ id }: { id: number }) {
  return <ActionButton action={() => quitarEsperaAction(id)}>Quitar</ActionButton>;
}

export function CancelarPorLluvia({ sesiones }: { sesiones: { id: number; etiqueta: string }[] }) {
  const [s, setS] = useState(sesiones[0]?.id ?? 0);
  const [motivo, setMotivo] = useState('Lluvia');
  const { run, pending } = useRun();
  if (!sesiones.length) return <p className="p-4 text-sm text-ink-500">No hay sesiones programadas.</p>;
  return (
    <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
      <label><span className="label">Sesión a cancelar</span>
        <select className="input" value={s} onChange={(e) => setS(Number(e.target.value))}>{sesiones.map((x) => <option key={x.id} value={x.id}>{x.etiqueta}</option>)}</select></label>
      <label><span className="label">Motivo</span>
        <select className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)}><option>Lluvia</option><option>Profesor no disponible</option><option>Pista no disponible</option></select></label>
      <button className="btn-danger" disabled={pending} onClick={() => { if (window.confirm('Se cancelará la clase, se crearán recuperaciones para todos los inscritos y avisos pendientes de revisión. ¿Continuar?')) run(() => cancelarSesionAction(s, motivo)); }}>
        <CloudRain size={16} aria-hidden />Cancelar clase
      </button>
    </div>
  );
}
