import { requireRol } from '@/lib/session';
import { all, getConfig, hoyISO } from '@/lib/db';
import { AlumnoForm } from '@/components/AlumnoForm';
import { PageHeader } from '@/components/ui';

export default async function Nuevo() {
  await requireRol('director', 'recepcion');
  const tutores = all<{ id: number; nombre: string; consentimientoFecha: string | null }>('SELECT id, nombre, consentimientoFecha FROM tutor ORDER BY nombre');
  return (
    <>
      <PageHeader titulo="Nuevo alumno" subtitulo="Si es menor de 14 años, el tutor y su consentimiento son obligatorios." />
      <AlumnoForm inicial={{ nombre: '', apellidos: '', fechaNacimiento: '', telefono: '', email: '', nivel: 'iniciacion', notas: '', tutorId: null }} tutores={tutores} edadMinima={getConfig().edadMinimaSinTutor} hoy={hoyISO()} />
    </>
  );
}
