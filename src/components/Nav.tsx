'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LayoutDashboard, Users, Layers, Calendar, SquareCheck, RefreshCw, Euro, GraduationCap, MessageSquare, House, Settings, Inbox } from 'lucide-react';

const ICONOS = { 'layout-dashboard': LayoutDashboard, users: Users, layers: Layers, calendar: Calendar, 'check-square': SquareCheck, refresh: RefreshCw, euro: Euro, graduation: GraduationCap, message: MessageSquare, home: House, settings: Settings, inbox: Inbox } as const;

export function Nav({ items, pendientes, solicitudes = 0 }: { items: { href: string; label: string; icono: string }[]; pendientes: number; solicitudes?: number }) {
  const path = usePathname();
  const activo = (h: string) => (h === '/' ? path === '/' : path.startsWith(h));
  return (
    <nav aria-label="Principal" className="flex gap-1 overflow-x-auto px-2 py-2 lg:flex-col lg:overflow-visible lg:px-3 lg:py-4">
      {items.map((i) => {
        const Icono = ICONOS[i.icono as keyof typeof ICONOS] ?? LayoutDashboard;
        return (
          <Link key={i.href} href={i.href} aria-current={activo(i.href) ? 'page' : undefined}
            className={clsx('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition lg:py-2.5', activo(i.href) ? 'bg-brand-700 text-white' : 'text-ink-700 hover:bg-brand-50')}>
            <Icono size={18} aria-hidden />
            <span>{i.label}</span>
            {i.href === '/solicitudes' && solicitudes > 0 && <span className="ml-auto rounded-full bg-accent-400 px-1.5 text-[11px] font-bold text-ink-900">{solicitudes}</span>}
            {i.href === '/mensajes' && pendientes > 0 && <span className="ml-auto rounded-full bg-accent-400 px-1.5 text-[11px] font-bold text-ink-900">{pendientes}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
