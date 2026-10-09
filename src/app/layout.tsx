import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { all, getConfig, one } from '@/lib/db';
import { NAV, getSesion } from '@/lib/session';
import { ToastProvider } from '@/components/Toast';
import { RoleSwitcher } from '@/components/RoleSwitcher';
import { Nav } from '@/components/Nav';
import { listarTutores } from '@/lib/services/familia';
import { pendientesSolicitudes } from '@/lib/services/disponibilidad';
import { formatoFecha } from '@/lib/rules';

export const metadata: Metadata = { title: 'Escuela de Pádel · Demo', description: 'Demo de gestión para escuelas de pádel' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { rol, actorId } = await getSesion();
  const items = NAV.filter((n) => n.roles.includes(rol));
  const profesores = all<{ id: number; nombre: string }>('SELECT id, nombre FROM profesor ORDER BY id');
  const tutores = listarTutores();
  const alumnos = all<{ id: number; nombre: string }>("SELECT id, nombre || ' ' || apellidos AS nombre FROM alumno WHERE tutorId IS NULL AND estado <> 'baja' ORDER BY apellidos, nombre");
  const pendientes = one<{ n: number }>("SELECT COUNT(*) n FROM mensaje WHERE estado='pendienteRevision'")?.n ?? 0;
  const solicitudes = pendientesSolicitudes();
  const cfg = getConfig();
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <div className="bg-accent-400 px-4 py-1 text-center text-xs font-semibold text-ink-900">
            DEMO · datos ficticios, envíos y cobros simulados{cfg.fechaDemo ? ` · fecha simulada: ${formatoFecha(cfg.fechaDemo)}` : ''}
          </div>
          <header className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 bg-brand-900 px-4 py-2 text-white">
            <div className="flex items-center gap-2">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-accent-400 text-lg">🎾</span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold">Escuela de Pádel</p>
                <p className="hidden text-[11px] text-brand-200 sm:block">Club Las Pistas · Gestión de la escuela</p>
              </div>
            </div>
            <a href="/alumno/registro" className="order-last w-full text-right text-xs font-semibold text-accent-400 underline sm:order-none sm:w-auto">Crear cuenta de alumno</a>
            <RoleSwitcher rol={rol} actorId={actorId} profesores={profesores} tutores={tutores} alumnos={alumnos} />
          </header>
          <div className="mx-auto flex max-w-[1400px] flex-col lg:flex-row">
            <aside className="border-b border-ink-100 bg-white lg:min-h-[calc(100vh-76px)] lg:w-56 lg:shrink-0 lg:border-b-0 lg:border-r">
              <Nav items={items.map(({ href, label, icono }) => ({ href, label, icono }))} pendientes={rol === 'familia' || rol === 'profesor' || rol === 'alumno' ? 0 : pendientes} solicitudes={rol === 'director' || rol === 'recepcion' ? solicitudes : 0} />
            </aside>
            <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-7">{children}</main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
