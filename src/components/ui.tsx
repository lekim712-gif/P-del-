import clsx from 'clsx';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { CircleAlert, Inbox } from 'lucide-react';

export const NIVEL_ESTILO: Record<string, string> = {
  iniciacion: 'bg-sky-100 text-sky-800 border-sky-200',
  intermedio: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  avanzado: 'bg-amber-100 text-amber-900 border-amber-200',
  competicion: 'bg-rose-100 text-rose-800 border-rose-200',
};
export const NIVEL_BLOQUE: Record<string, string> = {
  iniciacion: 'bg-sky-50 border-sky-300 text-sky-900',
  intermedio: 'bg-emerald-50 border-emerald-300 text-emerald-900',
  avanzado: 'bg-amber-50 border-amber-300 text-amber-900',
  competicion: 'bg-rose-50 border-rose-300 text-rose-900',
};
export const NIVEL_NOMBRE: Record<string, string> = { iniciacion: 'Iniciación', intermedio: 'Intermedio', avanzado: 'Avanzado', competicion: 'Competición' };

export function Badge({ children, tone = 'gris', className }: { children: ReactNode; tone?: 'gris' | 'verde' | 'rojo' | 'ambar' | 'azul' | 'morado'; className?: string }) {
  const t = {
    gris: 'bg-ink-100 text-ink-700', verde: 'bg-brand-100 text-brand-800', rojo: 'bg-red-100 text-red-800',
    ambar: 'bg-amber-100 text-amber-900', azul: 'bg-sky-100 text-sky-800', morado: 'bg-violet-100 text-violet-800',
  }[tone];
  return <span className={clsx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', t, className)}>{children}</span>;
}

export function NivelBadge({ nivel }: { nivel: string }) {
  return <span className={clsx('inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold', NIVEL_ESTILO[nivel])}>{NIVEL_NOMBRE[nivel] ?? nivel}</span>;
}

export function EstadoCuota({ estado }: { estado: string }) {
  return <Badge tone={estado === 'pagada' ? 'verde' : estado === 'vencida' ? 'rojo' : 'ambar'}>{estado === 'pagada' ? 'Pagada' : estado === 'vencida' ? 'Vencida' : 'Pendiente'}</Badge>;
}

export function PageHeader({ titulo, subtitulo, acciones }: { titulo: string; subtitulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm text-ink-500">{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

export function Card({ children, className, titulo, acciones }: { children: ReactNode; className?: string; titulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <section className={clsx('card', className)}>
      {(titulo || acciones) && (
        <header className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
          <h2 className="text-sm font-bold text-ink-900">{titulo}</h2>
          {acciones}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ etiqueta, valor, detalle, tono = 'normal', href }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode; tono?: 'normal' | 'alerta' | 'bueno'; href?: string }) {
  const c = (
    <div className={clsx('card h-full p-4 transition', href && 'hover:border-brand-400 hover:shadow-md')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">{etiqueta}</p>
      <p className={clsx('mt-1 text-2xl font-extrabold xl:text-[1.65rem] tabular-nums', tono === 'alerta' ? 'text-red-600' : tono === 'bueno' ? 'text-brand-700' : 'text-ink-900')}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-ink-500">{detalle}</p>}
    </div>
  );
  return href ? <Link href={href} className="block rounded-2xl">{c}</Link> : c;
}

export function Progress({ valor, max, className }: { valor: number; max: number; className?: string }) {
  const pct = max ? Math.min(100, Math.round((valor / max) * 100)) : 0;
  const color = pct >= 100 ? 'bg-amber-500' : pct < 50 ? 'bg-sky-400' : 'bg-brand-500';
  return (
    <div className={clsx('h-2 w-full overflow-hidden rounded-full bg-ink-100', className)} role="progressbar" aria-valuenow={valor} aria-valuemin={0} aria-valuemax={max} aria-label={`${valor} de ${max} plazas`}>
      <div className={clsx('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Empty({ titulo, texto, icono }: { titulo: string; texto?: string; icono?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-ink-500">
      <div className="rounded-full bg-ink-50 p-3 text-ink-300">{icono ?? <Inbox size={28} aria-hidden />}</div>
      <p className="font-semibold text-ink-700">{titulo}</p>
      {texto && <p className="max-w-sm text-sm">{texto}</p>}
    </div>
  );
}

export function Aviso({ children, tono = 'ambar' }: { children: ReactNode; tono?: 'ambar' | 'rojo' | 'azul' }) {
  const t = { ambar: 'border-amber-300 bg-amber-50 text-amber-900', rojo: 'border-red-300 bg-red-50 text-red-900', azul: 'border-sky-300 bg-sky-50 text-sky-900' }[tono];
  return <div className={clsx('flex items-start gap-2 rounded-xl border px-3 py-2 text-sm', t)}><CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />{children}</div>;
}

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[640px] border-collapse">{children}</table></div>;
}

export function Select({ name, defaultValue, children, label, className }: { name: string; defaultValue?: string; children: ReactNode; label: string; className?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      <select name={name} defaultValue={defaultValue} className="input">{children}</select>
    </label>
  );
}

export function iniciales(nombre: string) {
  return nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}
