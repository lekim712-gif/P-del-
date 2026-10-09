'use client';

import { useState } from 'react';
import { BellRing } from 'lucide-react';
import { avisarAusenciaAction } from '@/app/actions';
import { useRun } from './Toast';
import { Aviso } from './ui';

export function AvisarAusencia({ alumnoId, nombre, sesiones }: { alumnoId: number; nombre: string; sesiones: { sesionId: number; etiqueta: string; yaAvisada: boolean }[] }) {
  const [s, setS] = useState(sesiones.find((x) => !x.yaAvisada)?.sesionId ?? sesiones[0]?.sesionId ?? 0);
  const [respuesta, setRespuesta] = useState<{ ok: boolean; msg: string } | null>(null);
  const { run, pending } = useRun();
  if (!sesiones.length) return null;
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <label className="block"><span className="label">¿{nombre} no puede venir?</span>
        <select className="input" value={s} onChange={(e) => { setS(Number(e.target.value)); setRespuesta(null); }}>
          {sesiones.map((x) => <option key={x.sesionId} value={x.sesionId}>{x.etiqueta}{x.yaAvisada ? ' · ya avisada' : ''}</option>)}
        </select></label>
      <button className="btn-primary mt-2 min-h-[48px] w-full text-base" disabled={pending} onClick={() => run(() => avisarAusenciaAction(s, alumnoId).then((r) => { setRespuesta(r); return r; }))}>
        <BellRing size={18} aria-hidden />Avisar de ausencia
      </button>
      {respuesta && <div className="mt-2"><Aviso tono={respuesta.ok ? 'azul' : 'rojo'}>{respuesta.msg}</Aviso></div>}
    </div>
  );
}
