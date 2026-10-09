'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Check, X, BellOff, RefreshCw, Lock, Unlock, UserCheck } from 'lucide-react';
import { cerrarClaseAction, marcarAction, reabrirClaseAction } from '@/app/actions';
import type { EstadoAsistencia, FilaClase } from '@/lib/services/sesiones';
import { useRun, useToast } from './Toast';
import { NivelBadge } from './ui';

type Est = EstadoAsistencia | null;
const norm = (e: string | null): Est => (e === 'recuperacion' ? 'presente' : (e as Est));

export function ListaAsistencia({ sesionId, filas, estadoSesion }: { sesionId: number; filas: FilaClase[]; estadoSesion: string }) {
  const router = useRouter();
  const toast = useToast();
  const [estados, setEstados] = useState<Record<number, Est>>(Object.fromEntries(filas.map((f) => [f.alumnoId, norm(f.estado)])));
  const [guardado, setGuardado] = useState(false);
  const [, start] = useTransition();
  const { run, pending } = useRun();
  const cerrada = estadoSesion === 'impartida';

  function marcar(alumnoId: number, nuevo: EstadoAsistencia) {
    if (cerrada) return;
    const anterior = estados[alumnoId] ?? null;
    const destino: Est = anterior === nuevo ? null : nuevo; // volver a tocar quita la marca
    setEstados((e) => ({ ...e, [alumnoId]: destino }));
    setGuardado(false);
    start(async () => {
      const r = await marcarAction(sesionId, alumnoId, destino);
      if (!r.ok) { setEstados((e) => ({ ...e, [alumnoId]: anterior })); toast(r.msg, 'error'); } else setGuardado(true);
    });
  }

  const marcados = Object.values(estados).filter(Boolean).length;
  const presentes = Object.values(estados).filter((e) => e === 'presente').length;
  const BTN = (activo: boolean, tono: 'verde' | 'rojo' | 'ambar') => clsx(
    'flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-1 text-xs font-bold transition active:scale-95 disabled:opacity-60',
    activo
      ? { verde: 'border-brand-600 bg-brand-600 text-white', rojo: 'border-red-600 bg-red-600 text-white', ambar: 'border-amber-500 bg-amber-500 text-white' }[tono]
      : { verde: 'border-brand-200 bg-white text-brand-800', rojo: 'border-red-200 bg-white text-red-700', ambar: 'border-amber-200 bg-white text-amber-800' }[tono],
  );

  return (
    <div className="pb-28">
      <ul className="grid gap-3">
        {filas.map((f) => {
          const e = estados[f.alumnoId] ?? null;
          return (
            <li key={f.alumnoId} className={clsx('card p-3', e === 'presente' && 'border-brand-300', e === 'ausente' && 'border-red-300', e === 'ausenteAvisado' && 'border-amber-300')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-bold">{f.nombre} {f.apellidos}</p>
                  {f.notas && <p className="truncate text-xs text-ink-500">{f.notas}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {f.esRecuperacion && <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-bold text-violet-800"><RefreshCw size={12} aria-hidden />Recuperación</span>}
                  <NivelBadge nivel={f.nivel} />
                </div>
              </div>
              <div className="flex gap-2" role="group" aria-label={`Asistencia de ${f.nombre}`}>
                <button type="button" disabled={cerrada} aria-pressed={e === 'presente'} className={BTN(e === 'presente', 'verde')} onClick={() => marcar(f.alumnoId, 'presente')}><Check size={20} aria-hidden />Presente</button>
                <button type="button" disabled={cerrada} aria-pressed={e === 'ausente'} className={BTN(e === 'ausente', 'rojo')} onClick={() => marcar(f.alumnoId, 'ausente')}><X size={20} aria-hidden />Ausente</button>
                <button type="button" disabled={cerrada} aria-pressed={e === 'ausenteAvisado'} className={BTN(e === 'ausenteAvisado', 'ambar')} onClick={() => marcar(f.alumnoId, 'ausenteAvisado')}><BellOff size={20} aria-hidden />Avisado</button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <p className="flex-1 text-sm" aria-live="polite">
            <span className="flex items-center gap-1 font-bold"><UserCheck size={16} aria-hidden />{presentes} presentes · {marcados}/{filas.length} marcados</span>
            <span className="text-xs text-ink-500">{cerrada ? 'Clase cerrada' : guardado ? 'Guardado automáticamente ✓' : 'Un toque por alumno; se guarda solo'}</span>
          </p>
          {cerrada ? (
            <button className="btn-secondary min-h-[48px]" disabled={pending} onClick={() => run(() => reabrirClaseAction(sesionId))}><Unlock size={18} aria-hidden />Reabrir</button>
          ) : (
            <button className="btn-primary min-h-[48px] px-5 text-base" disabled={pending}
              onClick={() => {
                const sin = filas.length - marcados;
                if (sin > 0 && !window.confirm(`Quedan ${sin} sin marcar: se guardarán como ausentes. ¿Cerrar la clase?`)) return;
                run(() => cerrarClaseAction(sesionId), { onOk: () => router.push('/asistencia') });
              }}><Lock size={18} aria-hidden />Cerrar clase</button>
          )}
        </div>
      </div>
    </div>
  );
}
