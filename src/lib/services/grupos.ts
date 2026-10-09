import { all, one, ahora } from '../db';
import { calcularEdad, redondear } from '../rules';
import { GRUPO_SELECT, type GrupoRow } from './common';
import { proponerDeLaLista } from './alumnos';

export function listarGrupos(f: { categoria?: string; nivel?: string } = {}) {
  const where: string[] = []; const p: string[] = [];
  if (f.categoria) { where.push('g.categoria = ?'); p.push(f.categoria); }
  if (f.nivel) { where.push('g.nivel = ?'); p.push(f.nivel); }
  return all<GrupoRow>(`${GRUPO_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY g.diaSemana, g.horaInicio`, ...p);
}

export function getGrupo(id: number) {
  const g = one<GrupoRow>(`${GRUPO_SELECT} WHERE g.id = ?`, id);
  if (!g) return null;
  const inscritos = all<{ inscripcionId: number; id: number; nombre: string; apellidos: string; nivel: string; tutorId: number | null; fechaAlta: string }>(
    `SELECT i.id AS inscripcionId, a.id, a.nombre, a.apellidos, a.nivel, a.tutorId, i.fechaAlta FROM inscripcion i JOIN alumno a ON a.id = i.alumnoId
     WHERE i.grupoId = ? AND i.fechaBaja IS NULL ORDER BY a.apellidos`, id);
  const espera = all<{ id: number; alumnoId: number; nombre: string; apellidos: string; fechaSolicitud: string }>(
    `SELECT l.id, l.alumnoId, a.nombre, a.apellidos, l.fechaSolicitud FROM listaEspera l JOIN alumno a ON a.id = l.alumnoId WHERE l.grupoId = ? ORDER BY l.fechaSolicitud, l.id`, id);
  const primero = proponerDeLaLista(id);
  const horasMes = g.duracionMin / 60 * 4;
  // Rentabilidad estimada: ingresos mensuales del grupo (precio × inscritos) − coste del profesor (≈ 4 clases/mes × tarifa).
  const tarifa = one<{ tarifaHora: number }>('SELECT tarifaHora FROM profesor WHERE id = ?', g.profesorId)!.tarifaHora;
  const ingresos = redondear(g.precioMensual * g.inscritos);
  const coste = redondear(horasMes * tarifa);
  return { ...g, listaInscritos: inscritos, listaEspera: espera, primeroEspera: primero?.alumnoId ?? null, ingresos, coste, margen: redondear(ingresos - coste) };
}

export function alumnosInscribibles(grupoId: number) {
  const g = one<{ categoria: string }>('SELECT categoria FROM grupo WHERE id = ?', grupoId);
  return all<{ id: number; nombre: string; apellidos: string; nivel: string; estado: string; fechaNacimiento: string }>(
    `SELECT a.id, a.nombre, a.apellidos, a.nivel, a.estado, a.fechaNacimiento FROM alumno a
     WHERE NOT EXISTS (SELECT 1 FROM inscripcion i WHERE i.alumnoId = a.id AND i.grupoId = ? AND i.fechaBaja IS NULL)
     AND NOT EXISTS (SELECT 1 FROM listaEspera l WHERE l.alumnoId = a.id AND l.grupoId = ?)
     ORDER BY a.apellidos, a.nombre`, grupoId, grupoId,
  ).filter((a) => {
    const esNino = calcularEdad(a.fechaNacimiento, ahora()) < 14;
    return g?.categoria === 'infantil' ? esNino : !esNino;
  });
}
