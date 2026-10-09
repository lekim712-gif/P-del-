import { requireRol } from '@/lib/session';
import { getConfig } from '@/lib/db';
import { aISO } from '@/lib/rules';
import { ConfigForm } from '@/components/ConfigForm';
import { Card, PageHeader } from '@/components/ui';

export default async function Configuracion() {
  await requireRol('director');
  const { fechaDemo, consentimientoVersion, textoConsentimiento, ...reglas } = getConfig();
  return (
    <>
      <PageHeader titulo="Configuración" subtitulo="Reglas de la escuela: cada cambio se aplica al instante en recuperaciones, cuotas y avisos" />
      <ConfigForm valores={reglas} fechaDemo={fechaDemo} fechaReal={aISO(new Date())} />
      <Card titulo={`Texto legal de consentimiento · versión ${consentimientoVersion}`} className="mt-6 max-w-3xl">
        <p className="p-4 text-sm leading-relaxed text-ink-700">{textoConsentimiento}</p>
        <p className="border-t border-ink-100 px-4 py-2 text-xs text-ink-500">Cada tutor guarda la fecha y la versión del texto que aceptó. En un piloto real, este texto debe revisarlo un profesional de protección de datos (RGPD).</p>
      </Card>
    </>
  );
}
