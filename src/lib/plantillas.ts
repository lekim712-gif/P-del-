export const ESCUELA = 'Escuela de Pádel Club Las Pistas';

export const PLANTILLAS_DEFECTO = [
  { clave: 'recordatorio', nombre: 'Recordatorio de cuota', texto: 'Hola {destinatario} 👋 Te recordamos que la cuota de {mes} de {alumno} ({importe}) vence el {vencimiento}. Puedes pagarla en recepción o por transferencia. ¡Gracias! — {escuela}' },
  { clave: 'aviso1', nombre: 'Aviso de impago (1.º)', texto: 'Hola {destinatario}, la cuota de {mes} de {alumno} ({importe}) venció el {vencimiento} y seguimos sin verla. Si ya la has pagado, ignora este mensaje. — {escuela}' },
  { clave: 'aviso2', nombre: 'Aviso de impago (2.º)', texto: 'Hola {destinatario}, segundo aviso: la cuota de {mes} de {alumno} ({importe}) sigue pendiente desde el {vencimiento}. Escríbenos si necesitas ayuda para regularizarlo. — {escuela}' },
  { clave: 'coordinador', nombre: 'Aviso al coordinador (impago grave)', texto: 'Aviso interno: la cuota de {mes} de {alumno} ({importe}) lleva más de 20 días vencida (venció el {vencimiento}). Conviene llamar a la familia.' },
  { clave: 'lluvia', nombre: 'Clase cancelada por lluvia', texto: 'Hola {destinatario}, la clase de {grupo} del {fecha} ({hora}) se cancela por lluvia. Tienes una recuperación disponible, sin límite mensual, durante 30 días. — {escuela}' },
  { clave: 'horario', nombre: 'Cambio de horario', texto: 'Hola {destinatario}, te avisamos de un cambio de horario en {grupo}: la clase del {fecha} pasa a las {hora}. Disculpa las molestias. — {escuela}' },
  { clave: 'recuperacion', nombre: 'Confirmación de recuperación', texto: 'Hola {destinatario}, confirmada la recuperación de {alumno} en {grupo} el {fecha} a las {hora}. ¡Te esperamos! — {escuela}' },
] as const;

export function renderPlantilla(texto: string, vars: Record<string, string | number | undefined>): string {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? String(vars[k]) : m));
}

export const TEXTO_CONSENTIMIENTO =
  'Como padre, madre o tutor/a legal, autorizo la participación del menor en las clases de la escuela y el tratamiento de sus datos personales ' +
  '(nombre, contacto, nivel, asistencia y cuotas) con la única finalidad de gestionar la actividad y comunicarme con la familia. ' +
  'Puedo ejercer mis derechos de acceso, rectificación y supresión escribiendo a la escuela. (Texto ficticio de demostración.)';
