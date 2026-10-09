'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { INICIO_ROL, type Rol } from '@/lib/roles';
import type { Result } from '@/lib/services/common';
import * as alumnos from '@/lib/services/alumnos';
import * as sesiones from '@/lib/services/sesiones';
import * as recup from '@/lib/services/recuperaciones';
import * as cuotas from '@/lib/services/cuotas';
import * as mensajes from '@/lib/services/mensajes';
import { guardarConfig } from '@/lib/services/config';

function refrescar<T extends Result<any>>(r: T): T {
  revalidatePath('/', 'layout');
  return r;
}

export async function cambiarRol(rol: Rol, actor: number): Promise<string> {
  const c = await cookies();
  c.set('rol', rol, { path: '/' });
  c.set('actor', String(actor), { path: '/' });
  revalidatePath('/', 'layout');
  return INICIO_ROL[rol];
}

// Alumnos y grupos
export async function guardarAlumnoAction(input: alumnos.AlumnoInput) { return refrescar(alumnos.guardarAlumno(input)); }
export async function inscribirAction(alumnoId: number, grupoId: number) { return refrescar(alumnos.inscribir(alumnoId, grupoId)); }
export async function bajaAction(alumnoId: number, grupoId: number) { return refrescar(alumnos.darDeBaja(alumnoId, grupoId)); }
export async function moverAction(alumnoId: number, origen: number, destino: number) { return refrescar(alumnos.moverDeGrupo(alumnoId, origen, destino)); }
export async function promoverAction(grupoId: number) { return refrescar(alumnos.promoverDeEspera(grupoId)); }
export async function quitarEsperaAction(id: number) { return refrescar(alumnos.quitarDeEspera(id)); }
export async function previsualizarCSVAction(texto: string) { return alumnos.previsualizarCSV(texto); }
export async function importarCSVAction(texto: string) { return refrescar(alumnos.importarCSV(texto)); }

// Asistencia y sesiones
export async function marcarAction(sesionId: number, alumnoId: number, estado: sesiones.EstadoAsistencia | null) { return refrescar(sesiones.marcarAsistencia(sesionId, alumnoId, estado)); }
export async function cerrarClaseAction(sesionId: number) { return refrescar(sesiones.cerrarClase(sesionId)); }
export async function reabrirClaseAction(sesionId: number) { return refrescar(sesiones.reabrirClase(sesionId)); }
export async function cancelarSesionAction(sesionId: number, motivo: string) { return refrescar(sesiones.cancelarSesion(sesionId, motivo)); }
export async function sustitutoAction(sesionId: number, profesorId: number | null) { return refrescar(sesiones.asignarSustituto(sesionId, profesorId)); }
export async function avisarAusenciaAction(sesionId: number, alumnoId: number) { return refrescar(sesiones.avisarAusencia(sesionId, alumnoId)); }

// Recuperaciones
export async function reservarAction(recId: number, sesionId: number) { return refrescar(recup.reservarRecuperacion(recId, sesionId)); }
export async function liberarAction(recId: number) { return refrescar(recup.liberarReserva(recId)); }
export async function compatiblesAction(recId: number) { return recup.sesionesCompatibles(recId); }

// Cuotas
export async function cobroAction(cuotaId: number, metodo: string) { return refrescar(cuotas.registrarCobro(cuotaId, metodo)); }
export async function deshacerCobroAction(cuotaId: number) { return refrescar(cuotas.deshacerCobro(cuotaId)); }
export async function recordatoriosAction() { return refrescar(cuotas.generarRecordatorios()); }

// Mensajes
export async function aprobarAction(id: number) { return refrescar(mensajes.aprobarMensaje(id)); }
export async function aprobarTodosAction(ids: number[]) { return refrescar(mensajes.aprobarTodos(ids)); }
export async function descartarAction(id: number) { return refrescar(mensajes.descartarMensaje(id)); }
export async function editarMensajeAction(id: number, texto: string) { return refrescar(mensajes.editarTextoMensaje(id, texto)); }
export async function plantillaAction(clave: string, texto: string) { return refrescar(mensajes.guardarPlantilla(clave, texto)); }
export async function masivoAction(args: Parameters<typeof mensajes.envioMasivo>[0]) { return refrescar(mensajes.envioMasivo(args)); }

// Configuración
export async function configAction(valores: Record<string, string>) { return refrescar(guardarConfig(valores)); }
