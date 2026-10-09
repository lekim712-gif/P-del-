import { notFound } from 'next/navigation';
import { requireRol } from '@/lib/session';
import { all, getConfig, hoyISO } from '@/lib/db';
import { getAlumno } from '@/lib/services/alumnos';
import { AlumnoForm } from '@/components/AlumnoForm';
import { PageHeader } from '@/components/ui';

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('director', 'recepcion');
  const a = getAlumno(Number((await params).id));
  if (!a) notFound();
  const tutores = all<{ id: number; nombre: string; consentimientoFecha: string | null }>('SELECT id, nombre, consentimientoFecha FROM tutor ORDER BY nombre');
  return (
    <>
      <PageHeader titulo={`Editar · ${a.nombre} ${a.apellidos}`} />
      <AlumnoForm inicial={{ id: a.id, nombre: a.nombre, apellidos: a.apellidos, fechaNacimiento: a.fechaNacimiento, telefono: a.telefono ?? '', email: a.email ?? '', nivel: a.nivel, notas: a.notas ?? '', tutorId: a.tutorId }} tutores={tutores} edadMinima={getConfig().edadMinimaSinTutor} hoy={hoyISO()} />
    </>
  );
}
