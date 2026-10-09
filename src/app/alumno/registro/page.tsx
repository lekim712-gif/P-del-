import { PageHeader } from '@/components/ui';
import { RegistroForm } from '@/components/AlumnoPanelUI';

export default function Registro() {
  return (
    <>
      <PageHeader titulo="Crea tu cuenta de alumno" subtitulo="Con tu cuenta puedes avisar de que no vas, indicar cuándo puedes venir y pedir plaza en un grupo de tu nivel." />
      <RegistroForm />
    </>
  );
}
