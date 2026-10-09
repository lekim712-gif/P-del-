import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { all } from './db';

import { INICIO_ROL, type Rol } from './roles';
export { ROLES, INICIO_ROL, type Rol } from './roles';

export async function getSesion() {
  const c = await cookies();
  const rol = (c.get('rol')?.value as Rol) || 'director';
  const actorCookie = Number(c.get('actor')?.value || 0);
  let actorId = actorCookie;
  if (rol === 'profesor') {
    const ids = all<{ id: number }>('SELECT id FROM profesor ORDER BY id').map((r) => r.id);
    if (!ids.includes(actorId)) actorId = ids[0];
  } else if (rol === 'alumno') {
    const ids = all<{ id: number }>('SELECT id FROM alumno WHERE tutorId IS NULL AND estado <> \'baja\' ORDER BY id').map((r) => r.id);
    if (!ids.includes(actorId)) actorId = ids[0];
  } else if (rol === 'familia') {
    const ids = all<{ id: number }>('SELECT id FROM tutor ORDER BY id').map((r) => r.id);
    if (!ids.includes(actorId)) actorId = ids[0];
  }
  return { rol, actorId };
}

/** Protege una pantalla: si el rol no tiene acceso, vuelve a su inicio. */
export async function requireRol(...permitidos: Rol[]) {
  const s = await getSesion();
  if (!permitidos.includes(s.rol)) redirect(INICIO_ROL[s.rol]);
  return s;
}

export const NAV: { href: string; label: string; icono: string; roles: Rol[] }[] = [
  { href: '/', label: 'Panel', icono: 'layout-dashboard', roles: ['director'] },
  { href: '/alumnos', label: 'Alumnos', icono: 'users', roles: ['director', 'recepcion'] },
  { href: '/grupos', label: 'Grupos', icono: 'layers', roles: ['director', 'recepcion'] },
  { href: '/solicitudes', label: 'Solicitudes', icono: 'inbox', roles: ['director', 'recepcion'] },
  { href: '/calendario', label: 'Calendario', icono: 'calendar', roles: ['director', 'recepcion', 'profesor'] },
  { href: '/asistencia', label: 'Asistencia', icono: 'check-square', roles: ['director', 'recepcion', 'profesor'] },
  { href: '/recuperaciones', label: 'Recuperaciones', icono: 'refresh', roles: ['director', 'recepcion'] },
  { href: '/cuotas', label: 'Cuotas', icono: 'euro', roles: ['director', 'recepcion'] },
  { href: '/profesores', label: 'Profesores', icono: 'graduation', roles: ['director'] },
  { href: '/mensajes', label: 'Mensajes', icono: 'message', roles: ['director', 'recepcion'] },
  { href: '/alumno', label: 'Mi panel', icono: 'home', roles: ['alumno'] },
  { href: '/familia', label: 'Mi familia', icono: 'home', roles: ['familia'] },
  { href: '/configuracion', label: 'Configuración', icono: 'settings', roles: ['director'] },
];
