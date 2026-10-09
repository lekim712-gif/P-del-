'use client';

import { useState } from 'react';
import { FileUp, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { importarCSVAction, previsualizarCSVAction } from '@/app/actions';
import type { FilaCSV } from '@/lib/services/alumnos';
import { useRun } from './Toast';
import { Aviso, Badge, Card, TableWrap } from './ui';

export function ImportarCSV() {
  const [texto, setTexto] = useState('');
  const [nombre, setNombre] = useState('');
  const [prev, setPrev] = useState<{ filas: FilaCSV[]; error?: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const { run, pending } = useRun();

  async function leer(f: File | undefined) {
    if (!f) return;
    setCargando(true); setNombre(f.name);
    const t = await f.text();
    setTexto(t);
    setPrev(await previsualizarCSVAction(t));
    setCargando(false);
  }
  const ok = prev?.filas.filter((f) => f.estado === 'ok').length ?? 0;
  const dup = prev?.filas.filter((f) => f.estado === 'duplicado').length ?? 0;
  const err = prev?.filas.filter((f) => f.estado === 'error').length ?? 0;

  return (
    <div className="grid gap-5">
      <Card>
        <div className="flex flex-col items-start gap-3 p-5">
          <label className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-ink-300 px-4 py-8 text-center hover:border-brand-500 hover:bg-brand-50 focus-within:ring-2 focus-within:ring-brand-600">
            <FileUp size={28} className="text-brand-700" aria-hidden />
            <span className="font-semibold">{nombre || 'Elige un archivo .csv'}</span>
            <span className="text-xs text-ink-500">Columnas: nombre, apellidos, fechaNacimiento, telefono, email, nivel, tutorNombre, tutorTelefono, tutorEmail, consentimiento</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => leer(e.target.files?.[0])} />
          </label>
          <a className="text-sm font-semibold text-brand-700 underline" href="/ejemplo_alumnos.csv" download>Descargar ejemplo_alumnos.csv</a>
        </div>
      </Card>
      {cargando && <p className="text-sm text-ink-500">Leyendo archivo…</p>}
      {prev?.error && <Aviso tono="rojo">{prev.error}</Aviso>}
      {prev && !prev.error && (
        <Card titulo="Vista previa" acciones={
          <button className="btn-primary" disabled={ok === 0 || pending} onClick={() => run(() => importarCSVAction(texto), { onOk: () => { setPrev(null); setTexto(''); setNombre(''); } })}>
            Importar {ok} alumno{ok === 1 ? '' : 's'}
          </button>}>
          <div className="flex flex-wrap gap-2 border-b border-ink-100 px-4 py-3 text-sm">
            <Badge tone="verde"><CheckCircle2 size={14} aria-hidden />{ok} correctas</Badge>
            <Badge tone="ambar"><AlertTriangle size={14} aria-hidden />{dup} duplicadas</Badge>
            <Badge tone="rojo"><XCircle size={14} aria-hidden />{err} con errores</Badge>
            <span className="text-xs text-ink-500">Solo se importan las correctas.</span>
          </div>
          <TableWrap>
            <thead className="bg-ink-50"><tr><th className="th">Línea</th><th className="th">Alumno</th><th className="th">Nacimiento</th><th className="th">Nivel</th><th className="th">Resultado</th></tr></thead>
            <tbody className="divide-y divide-ink-100">
              {prev.filas.map((f) => (
                <tr key={f.linea} className={f.estado === 'error' ? 'bg-red-50' : f.estado === 'duplicado' ? 'bg-amber-50' : ''}>
                  <td className="td tabular-nums">{f.linea}</td>
                  <td className="td font-semibold">{f.datos.nombre} {f.datos.apellidos}</td>
                  <td className="td">{f.datos.fechanacimiento}</td>
                  <td className="td">{f.datos.nivel || '—'}</td>
                  <td className="td">{f.estado === 'ok' ? <Badge tone="verde">Correcta</Badge> : <div><Badge tone={f.estado === 'error' ? 'rojo' : 'ambar'}>{f.estado === 'error' ? 'Error' : 'Duplicado'}</Badge><p className="mt-1 text-xs">{f.mensajes.join(' ')}</p></div>}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </Card>
      )}
    </div>
  );
}
