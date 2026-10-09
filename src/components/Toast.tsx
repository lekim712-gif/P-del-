'use client';

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import type { Result } from '@/lib/services/common';

type T = { id: number; msg: string; tipo: 'ok' | 'error'; deshacer?: () => void };
const Ctx = createContext<(msg: string, tipo?: 'ok' | 'error', deshacer?: () => void) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<T[]>([]);
  const push = useCallback((msg: string, tipo: 'ok' | 'error' = 'ok', deshacer?: () => void) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, msg, tipo, deshacer }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), tipo === 'error' ? 8000 : 5000);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4" aria-live="polite" role="status">
        {items.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${t.tipo === 'ok' ? 'bg-brand-800' : 'bg-red-700'}`}>
            {t.tipo === 'ok' ? <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /> : <XCircle size={18} className="mt-0.5 shrink-0" aria-hidden />}
            <span className="flex-1">{t.msg}</span>
            {t.deshacer && <button className="rounded px-2 font-bold underline" onClick={() => { t.deshacer!(); setItems((x) => x.filter((i) => i.id !== t.id)); }}>Deshacer</button>}
            <button aria-label="Cerrar aviso" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}><X size={16} /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);

/** Ejecuta una acción de servidor, muestra el resultado y refresca la pantalla. */
export function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = useCallback(
    (fn: () => Promise<Result<any>>, opts?: { onOk?: (r: Result<any>) => void; deshacer?: () => Promise<Result<any>> }) =>
      start(async () => {
        const r = await fn();
        toast(r.msg, r.ok ? 'ok' : 'error', r.ok && opts?.deshacer ? () => { void opts.deshacer!().then((u) => { toast(u.msg, u.ok ? 'ok' : 'error'); router.refresh(); }); } : undefined);
        if (r.ok) opts?.onOk?.(r);
        router.refresh();
      }),
    [router, toast],
  );
  return { run, pending };
}
