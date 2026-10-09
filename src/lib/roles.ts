export type Rol = 'director' | 'recepcion' | 'profesor' | 'familia';
export const ROLES: { id: Rol; nombre: string }[] = [
  { id: 'director', nombre: 'Director' },
  { id: 'recepcion', nombre: 'Recepción' },
  { id: 'profesor', nombre: 'Profesor' },
  { id: 'familia', nombre: 'Familia' },
];

export const INICIO_ROL: Record<Rol, string> = {
  director: '/', recepcion: '/alumnos', profesor: '/asistencia', familia: '/familia',
};
