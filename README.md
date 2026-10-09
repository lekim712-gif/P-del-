# Demo · Software de gestión para escuelas de pádel

Demo funcional con datos ficticios para enseñar a un club cuya escuela hoy funciona con papel y Excel.
Gestiona alumnos, grupos estables, asistencia, recuperaciones, cuotas, profesores y comunicación. **No** incluye reservas de pistas, partidos ni torneos (eso ya lo cubre Playtomic).

## Arranque

Requiere **Node ≥ 22.13** (usa el módulo SQLite integrado `node:sqlite`).

```bash
npm install
npm run db:reset   # crea la base y carga los datos de ejemplo (< 1 s)
npm run dev        # http://localhost:3000
npm test           # reglas de negocio
```

`npm run db:reset` se puede ejecutar con el servidor en marcha: vacía las tablas sin borrar el archivo.
Los datos se generan relativos a la fecha de hoy (hay siempre clases hoy, 8 semanas de historial y 4 semanas por delante).

## Roles
Selector arriba a la derecha (sin autenticación real): Director, Recepción, Profesor (elige profesor) y Familia (elige familia). Cada rol ve su menú.

## Guion de 5 minutos
1. **Director** → Panel: impagos y grupos con lista de espera.
2. Alumnos → Importar CSV con `ejemplo_alumnos.csv` (1 duplicado en la base, 1 repetido, 4 errores).
3. Grupos → «Iniciación Adultos · Lun 19:00» (lleno) → inscribir a otro alumno: pasa a lista de espera.
4. **Profesor** (Sergio Valverde, clase de los viernes) → Asistencia en móvil → un toque por alumno → Cerrar clase.
5. **Familia** → «Avisar de ausencia»: aplica la regla de 12 h y dice si genera recuperación.
6. **Director** → grupo → «Cancelar clase» por lluvia: crea recuperaciones y avisos.
7. Cuotas → «Generar recordatorios» → Mensajes → aprobar y enviar (simulado).
8. Profesores → pago del mes con una sustitución incluida.

## Organización del código
- `src/lib/rules.ts` — reglas de negocio como funciones puras (tests en `tests/`).
- `src/lib/schema.sql`, `src/lib/db.ts`, `src/lib/seed.ts` — datos; `scripts/seed.ts` es el reset.
- `src/lib/services/*` — operaciones de negocio sobre la base (alumnos, sesiones, recuperaciones, cuotas, mensajes, profesores, panel, familia).
- `src/app/*` — pantallas (App Router) y `actions.ts` (acciones de servidor). `src/components/*` — UI.

## Qué es simulado
Cobros (sin pasarela), WhatsApp/email (bandeja de salida con vista tipo chat; «enviar» solo cambia el estado), roles (sin login), texto de consentimiento (ficticio). Sin llamadas de red externas.

## Decisiones donde el documento era ambiguo
- **SQLite con `node:sqlite`** en lugar de Prisma: sin binarios que descargar. Next.js 15 requiere TypeScript 6 (no 7).
- **Temporada:** empieza el 1 de septiembre, o antes si hace falta para garantizar 8 semanas de historial.
- **Recuperaciones:** el límite mensual (2) cuenta las de ausencia, por mes de la sesión destino; las de clase cancelada no cuentan. La asistencia de un alumno que recupera se guarda como `recuperacion`.
- **Recordatorios:** el botón genera el aviso del tramo alcanzado (3 días antes, +2, +10, +20) sin duplicar. Los de +20 días van al coordinador.
- **Cuotas «pendientes»:** por la regla del día 5, solo existen hasta ese día. Pasado, las impagadas son «vencidas». Para enseñar pendientes y recordatorios previos, fija la **fecha de la demo** (p. ej. día 3) en Configuración.
- **Rentabilidad de grupo:** ingresos (precio × inscritos) menos ≈ 4 clases/mes × tarifa del profesor.
- **Familias:** 18 tutores y 25 menores (7 familias con dos hermanos). Un tutor sin consentimiento demuestra la regla de menores.

## Para un piloto real
Autenticación y permisos, cumplimiento RGPD (consentimientos, retención, derechos), WhatsApp Business y pagos reales (domiciliación/pasarela), copias de seguridad, base de datos de producción, facturación legal.
