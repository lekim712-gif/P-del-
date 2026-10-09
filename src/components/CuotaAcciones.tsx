'use client';

import { useState } from 'react';
import { MailPlus } from 'lucide-react';
import { cobroAction, deshacerCobroAction, recordatoriosAction } from '@/app/actions';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';

export function Cobrar({ cuotaId }: { cuotaId: number }) {
  const [abierto, setAbierto] = useState(false);
  const { run, pending } = useRun();
  if (!abierto) return <button className="btn-primary btn-sm" onClick={() => setAbierto(true)}>Registrar cobro</button>;
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {(['efectivo', 'transferencia', 'tarjeta'] as const).map((m) => (
        <button key={m} className="btn-secondary btn-sm capitalize" disabled={pending} onClick={() => run(() => cobroAction(cuotaId, m), { onOk: () => setAbierto(false), deshacer: () => deshacerCobroAction(cuotaId) })}>{m}</button>
      ))}
      <button className="text-xs underline" onClick={() => setAbierto(false)}>Cancelar</button>
    </span>
  );
}

export function GenerarRecordatorios() {
  return <ActionButton action={recordatoriosAction} className="btn-secondary"><MailPlus size={16} aria-hidden />Generar recordatorios</ActionButton>;
}
