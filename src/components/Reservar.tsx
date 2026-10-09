'use client';

import { useState } from 'react';
import { compatiblesAction, liberarAction, reservarAction } from '@/app/actions';
import type { SesionCompatible } from '@/lib/services/recuperaciones';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';
import { formatoFecha } from '@/lib/rules';

export function Reservar({ recuperacionId, compacto }: { recuperacionId: number; compacto?: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [ops, setOps] = useState<SesionCompatible[] | null>(null);
  const { run, pending } = useRun();

  async function abrir() {
    setAbierto(true);
    setOps(await compatiblesAction(recuperacionId));
  }
  if (!abierto) return <button className={compacto ? 'btn-primary btn-sm' : 'btn-primary'} onClick={abrir}>Reservar</button>;
  return (
    <div className="w-full rounded-xl border border-brand-200 bg-brand-50 p-3 text-left">
      <div className="mb-2 flex items-center justify-between"><p className="text-sm font-bold">Sesiones compatibles (mismo nivel, futuras, con plaza)</p><button className="text-xs font-semibold underline" onClick={() => setAbierto(false)}>Cerrar</button></div>
      {!ops ? <p className="text-sm">Buscando…</p> : ops.length === 0 ? <p className="text-sm">No hay sesiones compatibles.</p> : (
        <ul className="grid max-h-72 gap-1.5 overflow-y-auto">
          {ops.map((o) => (
            <li key={o.sesionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm">
              <span><b className="tabular-nums">{formatoFecha(o.fecha)} {o.horaInicio}</b> · {o.grupo}<span className="block text-xs text-ink-500">{o.pista} · {o.profesor} · {o.plazasLibres} plaza{o.plazasLibres === 1 ? '' : 's'} libre{o.plazasLibres === 1 ? '' : 's'}{o.encaja && <b className="ml-2 text-brand-700">✓ encaja con tu disponibilidad</b>}</span></span>
              {o.valida
                ? <button className="btn-primary btn-sm" disabled={pending} onClick={() => run(() => reservarAction(recuperacionId, o.sesionId), { onOk: () => setAbierto(false) })}>Reservar aquí</button>
                : <span className="max-w-[220px] text-right text-xs font-semibold text-red-700">{o.motivo}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Liberar({ recuperacionId }: { recuperacionId: number }) {
  return <ActionButton action={() => liberarAction(recuperacionId)} confirmar="¿Liberar la reserva? El derecho vuelve a estar pendiente.">Liberar reserva</ActionButton>;
}
