# Demo: software de gestión para escuelas de pádel

> Documento para Claude Code. Léelo entero antes de escribir código. Construye una DEMO funcional y vistosa, con datos de ejemplo, para enseñarla al responsable de un club de pádel cuya escuela hoy funciona con papel y Excel.

## 1. Objetivo y contexto

- Cliente final: el director o coordinador de la escuela de un club de pádel. Hoy lleva grupos, asistencia, cuotas y cuadrantes de profesores en papel y Excel.
- La demo debe conseguir que diga: "quiero probarlo con mis datos reales". No es el producto final.
- Playtomic ya cubre reservas de pistas y cobro de clases sueltas. **No construyas reservas de pistas ni partidos abiertos ni torneos.** Este software gestiona la escuela: alumnos, grupos estables, asistencia, recuperaciones, cuotas mensuales, profesores, comunicación y métricas.
- Todo en español de España. Moneda en euros, fechas en formato dd/mm/aaaa, semana que empieza en lunes.

## 2. Alcance de la demo

**Dentro (MVP):**

1. Alumnos: ficha, estado, tutor para menores, importación desde CSV.
2. Grupos y horarios: nivel, profesor, pista, día, hora, plazas, lista de espera.
3. Asistencia: lista de clase pensada para móvil, un toque por alumno.
4. Ausencias y recuperaciones con reglas configurables.
5. Cuotas mensuales: estado de pago, descuentos, recordatorios de impago.
6. Profesores: horas impartidas y cálculo del pago mensual.
7. Comunicación: plantillas y envío **simulado** (bandeja de salida visible).
8. Panel del director con indicadores clave.

**Fuera (no lo hagas):** pagos reales, WhatsApp real, email real, integración con Playtomic, app nativa, multi-club, facturación legal, IA conversacional. Si una pantalla necesita enseñar cómo sería, usa un botón o mensaje claro de "simulado en la demo".

## 3. Stack técnico

Elige este stack salvo que haya un problema serio, y en ese caso explícalo en el README:

- Next.js (App Router) con TypeScript.
- Tailwind CSS y componentes accesibles (por ejemplo shadcn/ui).
- SQLite con Prisma (o Drizzle) para que funcione sin servicios externos.
- Sin autenticación real: un selector de rol arriba a la derecha (Director, Recepción, Profesor, Familia) que cambia lo que se ve. Para Profesor y Familia, un segundo selector elige qué profesor o qué familia.
- Mobile-first. La asistencia y la vista de familia deben verse perfectas en un móvil de 390 px de ancho.
- Comandos que deben funcionar desde cero:
  - `npm install`
  - `npm run db:reset` (crea la base y carga los datos de ejemplo)
  - `npm run dev` (arranca en http://localhost:3000)
  - `npm test` (reglas de negocio)

## 4. Modelo de datos

Crea estas entidades (nombres orientativos, campos mínimos):

| Entidad | Campos |
| --- | --- |
| Alumno | id, nombre, apellidos, fechaNacimiento, telefono, email, nivel, estado (activo, baja, espera), fechaAlta, notas, tutorId (nullable) |
| Tutor | id, nombre, telefono, email, consentimientoFecha, consentimientoVersion |
| Profesor | id, nombre, telefono, tarifaHora (€), tipoContrato (autónomo o contratado) |
| Pista | id, nombre |
| Grupo | id, nombre, nivel (iniciación, intermedio, avanzado, competición), categoria (adultos, infantil), profesorId, pistaId, diaSemana, horaInicio, duracionMin, plazasMax, precioMensual (€), temporadaId |
| Temporada | id, nombre, fechaInicio, fechaFin |
| Inscripcion | id, alumnoId, grupoId, fechaAlta, fechaBaja (nullable) |
| ListaEspera | id, alumnoId, grupoId, fechaSolicitud |
| Sesion | id, grupoId, fecha, estado (programada, impartida, cancelada), motivoCancelacion (nullable), profesorRealId (para sustituciones) |
| Asistencia | id, sesionId, alumnoId, estado (presente, ausente, ausenteAvisado, recuperacion), avisadoEn (nullable) |
| Recuperacion | id, alumnoId, sesionOrigenId, sesionDestinoId (nullable), estado (pendiente, reservada, usada, caducada), caducaEn |
| Cuota | id, alumnoId, mes (aaaa-mm), importeBase, descuento, importeFinal, estado (pagada, pendiente, vencida), fechaVencimiento, fechaPago (nullable), metodo (nullable) |
| Mensaje | id, destinatarioTipo, destinatarioId, plantilla, texto, canal (whatsapp, email), estado (pendienteRevision, enviadoSimulado), creadoEn |
| Configuracion | clave, valor (reglas editables en pantalla) |

## 5. Reglas de negocio (con pruebas automáticas)

Implementa estas reglas en funciones puras y cúbrelas con tests:

1. **Plazas:** un grupo no admite más inscritos que `plazasMax`. Al intentarlo, el alumno entra en lista de espera. Cuando se libera una plaza, se propone al primero de la lista por fecha.
2. **Ausencia avisada:** si el alumno avisa con al menos 12 horas de antelación (parámetro `horasAvisoAusencia`), la ausencia es `ausenteAvisado` y genera derecho a una recuperación. Si avisa tarde o no avisa, es `ausente` y no genera recuperación.
3. **Recuperaciones:** máximo 2 por alumno y mes (`maxRecuperacionesMes`), caducan a los 30 días (`diasCaducidadRecuperacion`) y solo se pueden reservar en sesiones futuras de grupos del mismo nivel con plazas libres.
4. **Clase cancelada** (lluvia, profesor): genera recuperación para todos los inscritos, sin límite mensual, y crea un mensaje de aviso a los afectados.
5. **Cuota mensual:** `importeBase` = suma de precios de los grupos del alumno. Descuentos: 10 % si hay un hermano inscrito (mismo tutor) y 15 % si el alumno está en dos o más grupos. Se aplica el mayor, no se suman.
6. **Estado de cuota:** `pendiente` hasta la fecha de vencimiento (día 5 del mes), `vencida` después. Un cobro marca `pagada` con fecha y método.
7. **Recordatorios:** a 3 días del vencimiento se genera un mensaje de recordatorio; a 2 días de vencida, un primer aviso; a 10 días, un segundo; a 20 días, un aviso al coordinador. Todos entran como `pendienteRevision` para que una persona los apruebe.
8. **Pago a profesores:** horas impartidas del mes (sesiones `impartida`) por `tarifaHora`, atribuidas al `profesorRealId` si hay sustituto.
9. **Menores:** todo alumno menor de 14 años debe tener tutor con consentimiento registrado; sin él, no puede inscribirse.

Todos los parámetros marcados en código (`horasAvisoAusencia`, `maxRecuperacionesMes`, `diasCaducidadRecuperacion`, porcentajes de descuento, día de vencimiento) se editan en la pantalla **Configuración**.

## 6. Datos de ejemplo (seed)

Datos ficticios y plausibles, sin personas reales. Usa nombres españoles variados y teléfonos con formato 600 000 000 inventados.

- 1 temporada activa (septiembre a junio).
- 4 profesores con tarifas entre 18 y 28 €/hora.
- 4 pistas.
- 12 grupos: 8 de adultos y 4 infantiles, de lunes a sábado, entre las 9:00 y las 21:30, con plazas de 4 a 6.
- 70 alumnos: 45 adultos y 25 menores (con 18 tutores, incluidas 3 familias con dos hermanos).
- Inscripciones: algunos grupos llenos con lista de espera, otros casi vacíos, para que el panel cuente una historia.
- 8 semanas de historial de sesiones y asistencia, con ausencias avisadas, ausencias sin aviso, 2 clases canceladas por lluvia y 1 sustitución de profesor.
- Cuotas del mes actual y de los dos anteriores: mayoría pagadas, unas 10 pendientes y 6 vencidas (2 con más de 20 días).
- 5 recuperaciones pendientes y 3 reservadas.
- Mensajes en la bandeja: 8 pendientes de revisión.

La base debe poder resetearse con `npm run db:reset` en menos de 10 segundos.

## 7. Pantallas

### 7.1 Panel del director (`/`)
- Tarjetas: ocupación media de grupos, ingresos cobrados del mes, ingresos pendientes, tasa de impago, alumnos activos, bajas del mes.
- Lista "Requiere atención": cuotas vencidas, grupos llenos con lista de espera, grupos con menos de 50 % de ocupación, recuperaciones que caducan en 7 días.
- Gráfico de ocupación por franja horaria y gráfico de ingresos de los últimos 3 meses.
- Cada elemento enlaza a su pantalla.

### 7.2 Alumnos (`/alumnos`)
- Tabla con búsqueda, filtros (nivel, estado, grupo, cuota pendiente) y orden.
- Ficha del alumno: datos, tutor, grupos, asistencia reciente, recuperaciones, cuotas, notas y botón de mensaje.
- Alta y edición con validación; el menor de 14 años exige tutor con consentimiento.
- **Importar CSV:** sube un archivo, muestra una vista previa con errores y duplicados detectados, y confirma la importación. Incluye en el repositorio un `ejemplo_alumnos.csv`.

### 7.3 Grupos y calendario (`/grupos`, `/calendario`)
- Lista de grupos con ocupación en barra de progreso y etiqueta de "lista de espera".
- Detalle de grupo: inscritos, lista de espera, historial de sesiones, rentabilidad estimada (ingresos del grupo menos coste del profesor).
- Calendario semanal por pista y por profesor, con código de color por nivel.
- Acciones: inscribir, dar de baja, mover de grupo (recalcula la cuota), cancelar sesión por lluvia.

### 7.4 Asistencia (`/asistencia`) — pantalla estrella en móvil
- Para el profesor: sus clases de hoy y, al entrar, la lista de alumnos con botones grandes: presente, ausente, ausente avisado.
- Un toque por alumno, guardado automático, botón "Cerrar clase" que marca la sesión como impartida.
- Muestra recuperaciones apuntadas a esa sesión con una etiqueta distinta.
- Debe poder usarse con una sola mano.

### 7.5 Recuperaciones (`/recuperaciones`)
- Lista de derechos pendientes con fecha de caducidad.
- Al reservar, el sistema propone sesiones compatibles (mismo nivel, plazas libres, futuras) y valida las reglas.

### 7.6 Cuotas (`/cuotas`)
- Vista mensual con filtro por estado y total cobrado, pendiente y vencido.
- Botón "Registrar cobro" con método (efectivo, transferencia, tarjeta).
- Botón "Generar recordatorios" que crea los mensajes según las reglas, en estado pendiente de revisión.
- Exportar a CSV para la gestoría.

### 7.7 Profesores (`/profesores`)
- Ficha, grupos que lleva, horas del mes y pago calculado, con desglose por clase.
- Sustituciones: marcar una sesión como cubierta por otro profesor.
- Exportar resumen mensual a CSV.

### 7.8 Comunicación (`/mensajes`)
- Plantillas editables: recordatorio de cuota, aviso de impago, clase cancelada por lluvia, cambio de horario, confirmación de recuperación.
- Bandeja de salida: mensajes pendientes de revisión, con botón "Aprobar y enviar (simulado)" que los marca como enviados.
- Vista previa tipo chat de WhatsApp para que se entienda cómo lo recibiría el alumno.
- Envío masivo a un grupo o a todos los alumnos de un nivel.

### 7.9 Vista de familia (`/familia`)
- Con el rol Familia: ven a sus hijos, horario, cuotas, recuperaciones y mensajes recibidos.
- Pueden avisar de una ausencia con un botón; el sistema aplica la regla de las 12 horas y les dice si genera recuperación.

### 7.10 Configuración (`/configuracion`)
- Edita las reglas de la sección 5 y muestra el texto legal de consentimiento con su versión.

## 8. Diseño

- Aspecto limpio, profesional y deportivo. Fondo claro, un color principal (verde pádel o azul profundo) y un acento. Tipografía legible, buen contraste y estados vacíos con ilustraciones sencillas o iconos.
- Tablas con densidad media, botones grandes en móvil, y feedback inmediato (avisos de guardado, deshacer cuando sea posible).
- Accesibilidad básica: foco visible, etiquetas en formularios y contraste AA.
- Un modo "Demo" con un banner discreto que lo identifique como demostración con datos ficticios.

## 9. Guion de demo de 5 minutos (debe funcionar sin tropiezos)

1. Director abre el panel: ve impagos y grupos con lista de espera.
2. Importa un CSV de alumnos con una fila duplicada y otra con error.
3. Entra a un grupo lleno, intenta inscribir a otro alumno y pasa a lista de espera.
4. Cambia a rol Profesor, abre la clase de hoy en móvil y pasa asistencia en segundos.
5. Cambia a rol Familia, avisa de una ausencia con 24 horas de antelación y se genera la recuperación.
6. Vuelve a Director, cancela una clase por lluvia y comprueba que se crean avisos y recuperaciones.
7. Genera recordatorios de impago, los revisa y los "envía".
8. Abre Profesores y muestra el pago del mes calculado automáticamente, con una sustitución incluida.

## 10. Criterios de aceptación

- `npm install && npm run db:reset && npm run dev` arranca sin errores y sin configurar nada más.
- Los 8 pasos del guion se pueden hacer sin errores y sin recargar manualmente.
- Todas las reglas de la sección 5 tienen tests y pasan con `npm test`.
- La asistencia y la vista de familia funcionan bien en 390 px de ancho.
- La importación CSV detecta duplicados y errores con un mensaje claro.
- Ningún dato real: todo es ficticio.
- No hay llamadas de red a servicios externos.
- Un `README.md` explica cómo arrancar, cómo resetear los datos, cómo está organizado el código y qué es simulado.

## 11. Forma de trabajar (para Claude Code)

1. Antes de programar, muéstrame un plan breve con la estructura de carpetas y el orden de construcción, y espera mi visto bueno solo si hay una decisión que cambie el alcance.
2. Construye por fases, y al final de cada una arranca la aplicación y compruébala: (a) modelo de datos y seed, (b) reglas de negocio con tests, (c) alumnos y grupos, (d) asistencia y recuperaciones, (e) cuotas y comunicación, (f) profesores y panel, (g) vista de familia, configuración y pulido.
3. Ejecuta los tests y recorre el guion de la sección 9 tú mismo antes de darlo por terminado.
4. Si algo de este documento es ambiguo, elige la opción más sencilla, anótala en el README y sigue.
5. Al terminar, resume en pocas líneas qué funciona, qué es simulado y qué faltaría para un piloto real con datos de verdad (autenticación, RGPD, WhatsApp y pagos reales).
