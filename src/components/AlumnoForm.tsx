'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { guardarAlumnoAction } from '@/app/actions';
import { calcularEdad } from '@/lib/rules';
import { useRun } from './Toast';
import { Aviso } from './ui';

type Tutor = { id: number; nombre: string; consentimientoFecha: string | null };
type Inicial = { id?: number; nombre: string; apellidos: string; fechaNacimiento: string; telefono: string; email: string; nivel: string; notas: string; tutorId: number | null };

export function AlumnoForm({ inicial, tutores, edadMinima, hoy }: { inicial: Inicial; tutores: Tutor[]; edadMinima: number; hoy: string }) {
  const router = useRouter();
  const { run, pending } = useRun();
  const [v, setV] = useState(inicial);
  const [modoTutor, setModoTutor] = useState<'existente' | 'nuevo'>(inicial.tutorId ? 'existente' : 'existente');
  const [tn, setTn] = useState({ nombre: '', telefono: '', email: '', consentimiento: false });
  const [error, setError] = useState('');
  const edad = /^\d{4}-\d{2}-\d{2}$/.test(v.fechaNacimiento) ? calcularEdad(v.fechaNacimiento, new Date(hoy + 'T12:00:00')) : null;
  const menor = edad !== null && edad < edadMinima;
  const set = (k: keyof Inicial, val: string | number | null) => setV((x) => ({ ...x, [k]: val }));

  return (
    <form
      className="card grid max-w-3xl gap-4 p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault(); setError('');
        run(() => guardarAlumnoAction({
          id: v.id, nombre: v.nombre, apellidos: v.apellidos, fechaNacimiento: v.fechaNacimiento, telefono: v.telefono, email: v.email, nivel: v.nivel, notas: v.notas,
          tutorId: modoTutor === 'existente' ? v.tutorId : null, tutorNuevo: modoTutor === 'nuevo' && tn.nombre ? tn : undefined,
        }).then((r) => { if (!r.ok) setError(r.msg); return r; }), { onOk: (r) => router.push(`/alumnos/${r.data?.id ?? v.id}`) });
      }}
    >
      <label><span className="label">Nombre *</span><input className="input" required value={v.nombre} onChange={(e) => set('nombre', e.target.value)} /></label>
      <label><span className="label">Apellidos *</span><input className="input" required value={v.apellidos} onChange={(e) => set('apellidos', e.target.value)} /></label>
      <label><span className="label">Fecha de nacimiento *</span><input type="date" className="input" required value={v.fechaNacimiento} max={hoy} onChange={(e) => set('fechaNacimiento', e.target.value)} />
        {edad !== null && <span className="mt-1 block text-xs text-ink-500">{edad} años</span>}</label>
      <label><span className="label">Nivel *</span>
        <select className="input" value={v.nivel} onChange={(e) => set('nivel', e.target.value)}>
          <option value="iniciacion">Iniciación</option><option value="intermedio">Intermedio</option><option value="avanzado">Avanzado</option><option value="competicion">Competición</option>
        </select></label>
      <label><span className="label">Teléfono</span><input className="input" inputMode="tel" value={v.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="600 000 000" /></label>
      <label><span className="label">Email</span><input type="email" className="input" value={v.email} onChange={(e) => set('email', e.target.value)} /></label>
      <label className="sm:col-span-2"><span className="label">Notas</span><textarea className="input min-h-[80px] py-2" value={v.notas} onChange={(e) => set('notas', e.target.value)} /></label>

      {menor && (
        <fieldset className="sm:col-span-2 grid gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <legend className="px-1 text-sm font-bold text-amber-900">Tutor (obligatorio, menor de {edadMinima} años)</legend>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="radio" checked={modoTutor === 'existente'} onChange={() => setModoTutor('existente')} />Tutor existente</label>
            <label className="flex items-center gap-2"><input type="radio" checked={modoTutor === 'nuevo'} onChange={() => setModoTutor('nuevo')} />Nuevo tutor</label>
          </div>
          {modoTutor === 'existente' ? (
            <label><span className="label">Tutor</span>
              <select className="input" value={v.tutorId ?? ''} onChange={(e) => set('tutorId', e.target.value ? Number(e.target.value) : null)}>
                <option value="">Selecciona…</option>
                {tutores.map((t) => <option key={t.id} value={t.id}>{t.nombre}{t.consentimientoFecha ? '' : ' — SIN consentimiento'}</option>)}
              </select></label>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <label><span className="label">Nombre del tutor</span><input className="input" value={tn.nombre} onChange={(e) => setTn({ ...tn, nombre: e.target.value })} /></label>
              <label><span className="label">Teléfono</span><input className="input" value={tn.telefono} onChange={(e) => setTn({ ...tn, telefono: e.target.value })} /></label>
              <label><span className="label">Email</span><input className="input" type="email" value={tn.email} onChange={(e) => setTn({ ...tn, email: e.target.value })} /></label>
              <label className="flex items-start gap-2 text-sm sm:col-span-3"><input type="checkbox" className="mt-1" checked={tn.consentimiento} onChange={(e) => setTn({ ...tn, consentimiento: e.target.checked })} />
                <span>El tutor ha leído y acepta el texto de consentimiento vigente (se registra la fecha y la versión).</span></label>
            </div>
          )}
        </fieldset>
      )}
      {error && <div className="sm:col-span-2"><Aviso tono="rojo">{error}</Aviso></div>}
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{v.id ? 'Guardar cambios' : 'Crear alumno'}</button>
        <button type="button" className="btn-secondary" onClick={() => router.back()}>Cancelar</button>
      </div>
    </form>
  );
}
