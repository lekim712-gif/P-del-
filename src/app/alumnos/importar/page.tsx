import { requireRol } from '@/lib/session';
import { ImportarCSV } from '@/components/ImportarCSV';
import { PageHeader } from '@/components/ui';

export default async function Importar() {
  await requireRol('director', 'recepcion');
  return (
    <>
      <PageHeader titulo="Importar alumnos desde CSV" subtitulo="Sube tu Excel guardado como CSV. Antes de importar verás los errores y los duplicados detectados." />
      <ImportarCSV />
    </>
  );
}
