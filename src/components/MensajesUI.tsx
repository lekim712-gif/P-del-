'use client';

import { useState } from 'react';
import { CheckCheck, Mail, Pencil, Send, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { aprobarAction, aprobarTodosAction, descartarAction, editarMensajeAction, masivoAction, plantillaAction } from '@/app/actions';
import type { MensajeRow } from '@/lib/services/mensajes';
import { ActionButton } from './ActionButton';
import { useRun } from './Toast';
import { Badge } from './ui';
import { formatoFecha } from '@/lib/rules';

export function Burbuja({ texto, hora, canal, enviado }: { texto: string; hora?: string; canal?: string; enviado?: boolean }) {
  return (
    <div className="rounded-xl bg-[#e5ddd5] p-3" aria-label={`Vista previa de ${canal === 'email' ? 'email' : 'WhatsApp'}`}>
      <div className="ml-auto max-w-[92%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 text-sm text-ink-900 shadow-sm">
        <p className="whitespace-pre-wrap">{texto}</p>
        <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-ink-500">{hora}{enviado && <CheckCheck size={14} className="text-sky-500" aria-label="Enviado" />}</p>
      </div>
    </div>
  );
}

export function TarjetaMensaje({ m }: { m: MensajeRow }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(m.texto);
  const { run, pending } = useRun();
  const pendiente = m.estado === 'pendienteRevision';
  return (
    <li className="card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm"><span className="font-bold">{m.destinatario}</span>{m.telefono && <span className="ml-2 text-xs text-ink-500">{m.telefono}</span>}</div>
        <div className="flex items-center gap-2 text-xs"><Badge tone={m.canal === 'email' ? 'azul' : 'verde'}>{m.canal === 'email' ? <><Mail size={12} aria-hidden />Email</> : 'WhatsApp'}</Badge><span className="text-ink-500">{formatoFecha(m.creadoEn)} {m.creadoEn.slice(11)}</span></div>
      </div>
      {editando ? <textarea className="input min-h-[110px] py-2" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Texto del mensaje" /> : <Burbuja texto={m.texto} hora={m.creadoEn.slice(11)} canal={m.canal} enviado={!pendiente} />}
      {pendiente ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {editando ? (
            <><button className="btn-primary btn-sm" disabled={pending} onClick={() => run(() => editarMensajeAction(m.id, texto), { onOk: () => setEditando(false) })}>Guardar texto</button>
              <button className="btn-secondary btn-sm" onClick={() => { setTexto(m.texto); setEditando(false); }}>Cancelar</button></>
          ) : (
            <>
              <ActionButton action={() => aprobarAction(m.id)} className="btn-primary btn-sm"><Send size={14} aria-hidden />Aprobar y enviar (simulado)</ActionButton>
              <button className="btn-secondary btn-sm" onClick={() => setEditando(true)}><Pencil size={14} aria-hidden />Editar</button>
              <ActionButton action={() => descartarAction(m.id)} className="btn-secondary btn-sm !text-red-700" confirmar="¿Descartar este mensaje?"><Trash2 size={14} aria-hidden />Descartar</ActionButton>
            </>
          )}
        </div>
      ) : <p className="mt-2 text-xs font-semibold text-brand-700">Enviado (simulado) · no ha salido ningún mensaje real</p>}
    </li>
  );
}

export function AprobarTodos({ ids }: { ids: number[] }) {
  return <ActionButton action={() => aprobarTodosAction(ids)} className="btn-primary" disabled={!ids.length} confirmar={`¿Aprobar y enviar (simulado) los ${ids.length} mensajes?`}><CheckCheck size={16} aria-hidden />Aprobar todos ({ids.length})</ActionButton>;
}

export function EditorPlantilla({ clave, nombre, texto }: { clave: string; nombre: string; texto: string }) {
  const [t, setT] = useState(texto);
  const { run, pending } = useRun();
  return (
    <div className="card p-4">
      <h3 className="mb-2 text-sm font-bold">{nombre}</h3>
      <textarea className="input min-h-[96px] py-2" value={t} onChange={(e) => setT(e.target.value)} aria-label={`Texto de la plantilla ${nombre}`} />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[11px] text-ink-500">Variables: {'{destinatario} {alumno} {mes} {importe} {vencimiento} {grupo} {fecha} {hora}'}</p>
        <button className="btn-secondary btn-sm" disabled={pending || t === texto} onClick={() => run(() => plantillaAction(clave, t))}>Guardar</button>
      </div>
      <div className="mt-3"><Burbuja texto={t.replace(/\{(\w+)\}/g, (_, k) => ({ destinatario: 'Marta', alumno: 'Lucía', mes: '2026-10', importe: '58,00 €', vencimiento: '05/10/2026', grupo: 'Iniciación · Lun 19:00', fecha: '12/10/2026', hora: '19:00', escuela: 'Escuela de Pádel Club Las Pistas' } as Record<string, string>)[k] ?? `{${k}}`)} hora="10:00" /></div>
    </div>
  );
}

export function EnvioMasivo({ plantillas, grupos }: { plantillas: { clave: string; nombre: string }[]; grupos: { id: number; nombre: string }[] }) {
  const [destino, setDestino] = useState('grupo:' + (grupos[0]?.id ?? ''));
  const [plantilla, setPlantilla] = useState('horario');
  const [fecha, setFecha] = useState('');
  const [hora, setHora] = useState('');
  const { run, pending } = useRun();
  const [tipo, valor] = destino.split(':');
  return (
    <form className="card grid max-w-2xl gap-4 p-5 sm:grid-cols-2" onSubmit={(e) => {
      e.preventDefault();
      run(() => masivoAction({ plantilla, fecha: fecha || undefined, hora: hora || undefined, grupoId: tipo === 'grupo' ? Number(valor) : undefined, nivel: tipo === 'nivel' ? valor : undefined }));
    }}>
      <label className="sm:col-span-2"><span className="label">Destinatarios</span>
        <select className="input" value={destino} onChange={(e) => setDestino(e.target.value)}>
          <optgroup label="Un grupo">{grupos.map((g) => <option key={g.id} value={`grupo:${g.id}`}>{g.nombre}</option>)}</optgroup>
          <optgroup label="Todos los alumnos de un nivel"><option value="nivel:iniciacion">Nivel iniciación</option><option value="nivel:intermedio">Nivel intermedio</option><option value="nivel:avanzado">Nivel avanzado</option><option value="nivel:competicion">Nivel competición</option></optgroup>
          <optgroup label="Todos"><option value="todos:todos">Todos los alumnos activos</option></optgroup>
        </select></label>
      <label className="sm:col-span-2"><span className="label">Plantilla</span>
        <select className="input" value={plantilla} onChange={(e) => setPlantilla(e.target.value)}>{plantillas.filter((p) => !['coordinador'].includes(p.clave)).map((p) => <option key={p.clave} value={p.clave}>{p.nombre}</option>)}</select></label>
      <label><span className="label">Fecha (opcional)</span><input type="date" className="input" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      <label><span className="label">Hora (opcional)</span><input type="time" className="input" value={hora} onChange={(e) => setHora(e.target.value)} /></label>
      <div className="sm:col-span-2"><button className={clsx('btn-primary')} disabled={pending}><Send size={16} aria-hidden />Crear mensajes para revisar</button>
        <p className="mt-2 text-xs text-ink-500">Los mensajes se crean en la bandeja de salida; no se envía nada hasta que los apruebes. Una familia con dos hijos recibe un solo mensaje.</p></div>
    </form>
  );
}
