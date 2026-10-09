PRAGMA foreign_keys = ON;

CREATE TABLE temporada (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, fechaInicio TEXT NOT NULL, fechaFin TEXT NOT NULL);
CREATE TABLE tutor (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT, email TEXT, consentimientoFecha TEXT, consentimientoVersion TEXT);
CREATE TABLE profesor (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, telefono TEXT, tarifaHora REAL NOT NULL, tipoContrato TEXT NOT NULL CHECK (tipoContrato IN ('autonomo','contratado')));
CREATE TABLE pista (id INTEGER PRIMARY KEY, nombre TEXT NOT NULL);
CREATE TABLE alumno (
  id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, apellidos TEXT NOT NULL, fechaNacimiento TEXT NOT NULL,
  telefono TEXT, email TEXT, nivel TEXT NOT NULL, estado TEXT NOT NULL CHECK (estado IN ('activo','baja','espera')),
  fechaAlta TEXT NOT NULL, notas TEXT, tutorId INTEGER REFERENCES tutor(id)
);
CREATE TABLE grupo (
  id INTEGER PRIMARY KEY, nombre TEXT NOT NULL, nivel TEXT NOT NULL, categoria TEXT NOT NULL CHECK (categoria IN ('adultos','infantil')),
  profesorId INTEGER NOT NULL REFERENCES profesor(id), pistaId INTEGER NOT NULL REFERENCES pista(id),
  diaSemana INTEGER NOT NULL, horaInicio TEXT NOT NULL, duracionMin INTEGER NOT NULL, plazasMax INTEGER NOT NULL,
  precioMensual REAL NOT NULL, temporadaId INTEGER NOT NULL REFERENCES temporada(id)
);
CREATE TABLE inscripcion (id INTEGER PRIMARY KEY, alumnoId INTEGER NOT NULL REFERENCES alumno(id), grupoId INTEGER NOT NULL REFERENCES grupo(id), fechaAlta TEXT NOT NULL, fechaBaja TEXT);
CREATE TABLE listaEspera (id INTEGER PRIMARY KEY, alumnoId INTEGER NOT NULL REFERENCES alumno(id), grupoId INTEGER NOT NULL REFERENCES grupo(id), fechaSolicitud TEXT NOT NULL);
CREATE TABLE sesion (
  id INTEGER PRIMARY KEY, grupoId INTEGER NOT NULL REFERENCES grupo(id), fecha TEXT NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('programada','impartida','cancelada')), motivoCancelacion TEXT,
  profesorRealId INTEGER REFERENCES profesor(id)
);
CREATE TABLE asistencia (
  id INTEGER PRIMARY KEY, sesionId INTEGER NOT NULL REFERENCES sesion(id), alumnoId INTEGER NOT NULL REFERENCES alumno(id),
  estado TEXT NOT NULL CHECK (estado IN ('presente','ausente','ausenteAvisado','recuperacion')), avisadoEn TEXT,
  UNIQUE (sesionId, alumnoId)
);
CREATE TABLE recuperacion (
  id INTEGER PRIMARY KEY, alumnoId INTEGER NOT NULL REFERENCES alumno(id), sesionOrigenId INTEGER NOT NULL REFERENCES sesion(id),
  sesionDestinoId INTEGER REFERENCES sesion(id), estado TEXT NOT NULL CHECK (estado IN ('pendiente','reservada','usada','caducada')),
  caducaEn TEXT NOT NULL, origen TEXT NOT NULL DEFAULT 'ausencia' CHECK (origen IN ('ausencia','cancelacion'))
);
CREATE TABLE cuota (
  id INTEGER PRIMARY KEY, alumnoId INTEGER NOT NULL REFERENCES alumno(id), mes TEXT NOT NULL,
  importeBase REAL NOT NULL, descuento REAL NOT NULL, importeFinal REAL NOT NULL,
  estado TEXT NOT NULL CHECK (estado IN ('pagada','pendiente','vencida')), fechaVencimiento TEXT NOT NULL,
  fechaPago TEXT, metodo TEXT CHECK (metodo IN ('efectivo','transferencia','tarjeta')),
  UNIQUE (alumnoId, mes)
);
CREATE TABLE mensaje (
  id INTEGER PRIMARY KEY, destinatarioTipo TEXT NOT NULL, destinatarioId INTEGER NOT NULL, plantilla TEXT NOT NULL,
  texto TEXT NOT NULL, canal TEXT NOT NULL CHECK (canal IN ('whatsapp','email')),
  estado TEXT NOT NULL CHECK (estado IN ('pendienteRevision','enviadoSimulado')), creadoEn TEXT NOT NULL,
  referencia TEXT
);
CREATE TABLE plantilla (clave TEXT PRIMARY KEY, nombre TEXT NOT NULL, texto TEXT NOT NULL);
CREATE TABLE configuracion (clave TEXT PRIMARY KEY, valor TEXT NOT NULL);

CREATE TABLE disponibilidad (
  alumnoId INTEGER NOT NULL REFERENCES alumno(id), diaSemana INTEGER NOT NULL, franja TEXT NOT NULL CHECK (franja IN ('manana','tarde','noche')),
  PRIMARY KEY (alumnoId, diaSemana, franja)
);
CREATE TABLE solicitud (
  id INTEGER PRIMARY KEY, alumnoId INTEGER NOT NULL REFERENCES alumno(id), grupoId INTEGER NOT NULL REFERENCES grupo(id),
  estado TEXT NOT NULL CHECK (estado IN ('pendiente','confirmada','espera','rechazada')), creadoEn TEXT NOT NULL
);
