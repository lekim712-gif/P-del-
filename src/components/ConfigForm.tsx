'use client';

import { useState } from 'react';
import { Save } from 'lucide-react';
import { configAction } from '@/app/actions';
import { useRun } from './Toast';

const CAMPOS: { k: string; etiqueta: string; ayuda: string; sufijo?: string }[] = [
  { k: 'horasAvisoAusencia', etiqueta: 'Horas de aviso de ausencia', ayuda: 'Avisando con al menos estas horas, la ausencia genera recuperación.', sufijo: 'h' },
  { k: 'maxRecuperacionesMes', etiqueta: 'Recuperaciones máximas al mes', ayuda: 'Por alumno. Las de clase cancelada no cuentan.' },
  { k: 'diasCaducidadRecuperacion', etiqueta: 'Días de caducidad de una recuperación', ayuda: 'Contados desde la clase perdida.', sufijo: 'días' },
  { k: 'descuentoHermano', etiqueta: 'Descuento por hermano', ayuda: 'Mismo tutor y otro hermano inscrito.', sufijo: '%' },
  { k: 'descuentoMultiGrupo', etiqueta: 'Descuento por dos o más grupos', ayuda: 'Se aplica el mayor de los dos descuentos, no se suman.', sufijo: '%' },
  { k: 'diaVencimiento', etiqueta: 'Día de vencimiento de la cuota', ayuda: 'De cada mes (1–28). Pasado ese día, la cuota es «vencida».' },
  { k: 'edadMinimaSinTutor', etiqueta: 'Edad mínima sin tutor', ayuda: 'Por debajo, hace falta tutor con consentimiento.', sufijo: 'años' },
];

export function ConfigForm({ valores, fechaDemo, fechaReal }: { valores: Record<string, number>; fechaDemo: string; fechaReal: string }) {
  const [v, setV] = useState<Record<string, string>>({ ...Object.fromEntries(Object.entries(valores).map(([k, x]) => [k, String(x)])), fechaDemo });
  const { run, pending } = useRun();
  return (
    <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); run(() => configAction(v)); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        {CAMPOS.map((c) => (
          <label key={c.k} className="card block p-4">
            <span className="label">{c.etiqueta}</span>
            <span className="flex items-center gap-2"><input type="number" min={0} className="input !w-28" value={v[c.k]} onChange={(e) => setV({ ...v, [c.k]: e.target.value })} />{c.sufijo && <span className="text-sm text-ink-500">{c.sufijo}</span>}</span>
            <span className="mt-1 block text-xs text-ink-500">{c.ayuda}</span>
          </label>
        ))}
        <label className="card block border-accent-500 p-4 sm:col-span-2">
          <span className="label">Fecha de la demo (reloj simulado)</span>
          <span className="flex flex-wrap items-center gap-2"><input type="date" className="input !w-44" value={v.fechaDemo} onChange={(e) => setV({ ...v, fechaDemo: e.target.value })} />
            <button type="button" className="btn-secondary btn-sm" onClick={() => setV({ ...v, fechaDemo: '' })}>Usar la fecha real ({fechaReal})</button></span>
          <span className="mt-1 block text-xs text-ink-500">Solo para presentar la demo: por ejemplo, fija el día 3 del mes para ver cuotas «pendientes» y recordatorios previos al vencimiento. Déjalo vacío para usar la fecha real.</span>
        </label>
      </div>
      <div><button className="btn-primary" disabled={pending}><Save size={16} aria-hidden />Guardar configuración</button></div>
    </form>
  );
}
