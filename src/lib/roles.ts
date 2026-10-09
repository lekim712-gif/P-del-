export type Rol = 'director' | 'recepcion' | 'profesor' | 'familia' | 'alumno';
export const ROLES: { id: Rol; nombre: string }[] = [
  { id: 'director', nombre: 'Director' },
  { id: 'recepcion', nombre: 'Recepción' },
  { id: 'profesor', nombre: 'Profesor' },
  { id: 'familia', nombre: 'Familia' },
  { id: 'alumno', nombre: 'Alumno' },
];

export const INICIO_ROL: Record<Rol, string> = {
  director: '/', recepcion: '/alumnos', profesor: '/asistencia', familia: '/familia', alumno: '/alumno',
};
