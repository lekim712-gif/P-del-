'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BellOff, Check, Clock, UserPlus } from 'lucide-react';
import clsx from 'clsx';
import { avisarAusenciaAction, cancelarSolicitudAction, crearCuentaAction, disponibilidadAction, resolverSolicitudAction, solicitarAction } from '@/app/actions';
import { FRANJAS } from '@/lib/rules';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';
import { Aviso } from './ui';

const DIAS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb']] as const;

export function NoVoy({ alumnoId, sesiones }: { alumnoId: number; sesiones: { sesionId: number; etiqueta: string; estado: string; asistencia: string | null }[] }) {
  const { run, pending } = useRun();
  const [resp, setResp] = useState<Record<number, { ok: boolean; msg: string }>>({});
  if (!sesiones.length) return <p className="p-4 text-sm text-ink-500">No tienes clases próximas.</p>;
  return (
    <ul className="divide-y divide-ink-100">
      {sesiones.map((s) => {
        const avisada = s.asistencia === 'ausenteAvisado' || s.asistencia === 'ausente';
        return (
          <li key={s.sesionId} className="p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{s.etiqueta}</span>
              {s.estado === 'cancelada' ? <span className="text-xs font-bold text-red-700">Cancelada</span>
                : avisada ? <span className="text-xs font-bold text-amber-800">No vas a ir</span>
                : <button className="btn-secondary btn-sm min-h-[40px]" disabled={pending} onClick={() => run(() => avisarAusenciaAction(s.sesionId, alumnoId).then((r) => { setResp((x) => ({ ...x, [s.sesionId]: r })); return r; }))}><BellOff size={14} aria-hidden />No voy</button>}
            </div>
            {resp[s.sesionId] && <div className="mt-2"><Aviso tono={resp[s.sesionId].ok ? 'azul' : 'rojo'}>{resp[s.sesionId].msg}</Aviso></div>}
          </li>
        );
      })}
    </ul>
  );
}

export function DisponibilidadForm({ alumnoId, inicial }: { alumnoId: number; inicial: { diaSemana: number; franja: string }[] }) {
  const [sel, setSel] = useState(new Set(inicial.map((d) => `${d.diaSemana}:${d.franja}`)));
  const { run, pending } = useRun();
  const toggle = (k: string) => setSel((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  return (
    <div className="p-4">
      <p className="mb-3 text-sm text-ink-700">Marca cuándo puedes venir. Te proponemos grupos de tu nivel que encajen.</p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1.5 text-center text-xs">
          <thead><tr><th />{DIAS.map(([, n]) => <th key={n} className="font-semibold text-ink-500">{n}</th>)}</tr></thead>
          <tbody>
            {FRANJAS.map((f) => (
              <tr key={f.id}>
                <th scope="row" className="pr-1 text-left font-semibold text-ink-700">{f.nombre}<span className="block text-[10px] font-normal text-ink-500">{f.rango}</span></th>
                {DIAS.map(([d, n]) => {
                  const k = `${d}:${f.id}`; const on = sel.has(k);
                  return <td key={k}><button type="button" aria-pressed={on} aria-label={`${n} ${f.nombre}`} onClick={() => toggle(k)}
                    className={clsx('grid h-11 w-full min-w-[40px] place-items-center rounded-lg border-2 transition', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-100 bg-white text-transparent')}><Check size={18} aria-hidden /></button></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn-primary mt-3" disabled={pending} onClick={() => run(() => disponibilidadAction(alumnoId, [...sel].map((k) => { const [d, f] = k.split(':'); return { diaSemana: Number(d), franja: f }; })))}>Guardar disponibilidad</button>
    </div>
  );
}

export function SolicitarBoton({ alumnoId, grupoId, lleno }: { alumnoId: number; grupoId: number; lleno: boolean }) {
  return <ActionButton action={() => solicitarAction(alumnoId, grupoId)} className="btn-primary btn-sm min-h-[40px]">{lleno ? 'Pedir lista de espera' : 'Solicitar plaza'}</ActionButton>;
}

export function CancelarSolicitud({ id }: { id: number }) {
  return <ActionButton action={() => cancelarSolicitudAction(id)}>Cancelar</ActionButton>;
}

export function ResolverSolicitud({ id }: { id: number }) {
  return (
    <span className="inline-flex gap-2">
      <ActionButton action={() => resolverSolicitudAction(id, true)} className="btn-primary btn-sm">Confirmar</ActionButton>
      <ActionButton action={() => resolverSolicitudAction(id, false)} className="btn-secondary btn-sm !text-red-700">Rechazar</ActionButton>
    </span>
  );
}

export function RegistroForm() {
  const router = useRouter();
  const { run, pending } = useRun();
  const [v, setV] = useState({ nombre: '', apellidos: '', fechaNacimiento: '', nivel: 'iniciacion', email: '', telefono: '' });
  const [pass, setPass] = useState('');
  const set = (k: keyof typeof v, x: string) => setV((s) => ({ ...s, [k]: x }));
  return (
    <form className="card grid max-w-xl gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); run(() => crearCuentaAction(v), { onOk: () => router.push('/alumno') }); }}>
      <label><span className="label">Nombre *</span><input className="input" required value={v.nombre} onChange={(e) => set('nombre', e.target.value)} /></label>
      <label><span className="label">Apellidos *</span><input className="input" required value={v.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></label>
      <label><span className="label">Fecha de nacimiento *</span><input type="date" className="input" required value={v.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} /></label>
      <label><span className="label">Tu nivel *</span>
        <select className="input" value={v.nivel} onChange={(e) => set('nivel', e.target.value)}><option value="iniciacion">Iniciación (empiezo o casi)</option><option value="intermedio">Intermedio (juego con regularidad)</option><option value="avanzado">Avanzado</option><option value="competicion">Competición</option></select></label>
      <label><span className="label">Email *</span><input type="email" className="input" required value={v.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label><span className="label">Teléfono</span><input className="input" inputMode="tel" value={v.telefono} onChange={(e) => set('telefono', e.target.value)} /></label>
      <label className="sm:col-span-2"><span className="label">Contraseña (simulada)</span><input type="password" className="input" value={pass} onChange={(e) => setPass(e.target.value)} autoComplete="new-password" />
        <span className="mt-1 block text-xs text-ink-500">En la demo no hay inicio de sesión real: la contraseña no se guarda. Tu nivel lo revisará recepción.</span></label>
      <div className="sm:col-span-2"><button className="btn-primary" disabled={pending}><UserPlus size={16} aria-hidden />Crear mi cuenta</button></div>
    </form>
  );
}

export const _c = Clock;
