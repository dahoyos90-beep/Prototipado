/**
 * src/session-manager.ts
 * 
 * Gestor de sesión centralizado para SG-SST Manager.
 * Maneja el estado de la sesión activa, la empresa activa (para el SST),
 * las empresas vinculadas, la expiración por inactividad (30 min) y
 * el control de cambios sin guardar.
 * 
 * Propósito:
 * - Centralizar toda la lógica de sesión en un solo lugar.
 * - Ser utilizada por auth.ts, app.ts y todos los módulos.
 * - Garantizar el tipado fuerte con la interfaz ISession.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

import { fechaHoraActualISO } from './utils.js';
import type { ISession } from './interfaces/index.js';
import type { IUsuario, RolUsuario } from './interfaces/index.js';

// ================================================================
// CONSTANTES
// ================================================================

/** Clave de sesión en localStorage (debe coincidir con auth.ts) */
const SESSION_KEY = 'session';

/** Tiempo de inactividad permitido antes de expirar la sesión (30 minutos) */
const TIEMPO_INACTIVIDAD_MS = 30 * 60 * 1000;

// ================================================================
// FUNCIONES DE SESIÓN
// ================================================================

/**
 * Obtiene la sesión completa desde localStorage.
 * 
 * @returns {ISession | null} - Sesión completa o null si no existe.
 */
export function obtenerSesionCompleta(): ISession | null {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    try {
        const parsed = JSON.parse(sessionData) as ISession;
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Guarda la sesión completa en localStorage.
 * 
 * @param sesion - Objeto ISession a guardar.
 * @returns {boolean} - true si se guardó correctamente.
 */
export function guardarSesionCompleta(sesion: ISession): boolean {
    try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(sesion));
        return true;
    } catch (error) {
        console.error('session-manager: Error al guardar la sesión:', error);
        return false;
    }
}

/**
 * Crea un objeto ISession a partir de un usuario autenticado.
 * 
 * @param usuario - Usuario autenticado (IUsuario).
 * @returns {ISession} - Sesión creada con los datos del usuario.
 */
export function crearSesionDesdeUsuario(usuario: IUsuario): ISession {
    const ahora = fechaHoraActualISO();
    return {
        usuarioId: usuario.id,
        email: usuario.email,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.rol as RolUsuario,
        fechaInicio: ahora,
        empresaIdActiva: null,
        empresasVinculadas: usuario.empresasVinculadas || [],
        ultimaActividad: ahora,
        cambiosSinGuardar: false
    };
}

/**
 * Actualiza la fecha de última actividad de la sesión activa.
 * 
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function actualizarActividad(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.ultimaActividad = fechaHoraActualISO();
    return guardarSesionCompleta(sesion);
}

/**
 * Verifica si la sesión ha expirado por inactividad.
 * 
 * @returns {boolean} - true si la sesión ha expirado (> 30 min sin actividad).
 */
export function verificarInactividad(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return true;

    const ultimaActividad = new Date(sesion.ultimaActividad).getTime();
    const ahora = Date.now();
    const diferencia = ahora - ultimaActividad;

    return diferencia >= TIEMPO_INACTIVIDAD_MS;
}

/**
 * Marca la sesión como "con cambios sin guardar".
 * 
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function marcarCambiosSinGuardar(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.cambiosSinGuardar = true;
    return guardarSesionCompleta(sesion);
}

/**
 * Limpia el estado de "cambios sin guardar".
 * 
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function limpiarCambiosSinGuardar(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.cambiosSinGuardar = false;
    return guardarSesionCompleta(sesion);
}

/**
 * Verifica si hay cambios sin guardar en la sesión activa.
 * 
 * @returns {boolean} - true si hay cambios sin guardar.
 */
export function hayCambiosSinGuardar(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;
    return sesion.cambiosSinGuardar === true;
}

/**
 * Establece la empresa activa en la sesión (NIT).
 * 
 * @param nit - NIT de la empresa a activar.
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function establecerEmpresaActiva(nit: string): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.empresaIdActiva = nit;
    return guardarSesionCompleta(sesion);
}

/**
 * Limpia la empresa activa (pone null).
 * 
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function limpiarEmpresaActiva(): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.empresaIdActiva = null;
    return guardarSesionCompleta(sesion);
}

/**
 * Obtiene el NIT de la empresa activa.
 * 
 * @returns {string | null} - NIT de la empresa activa o null si no hay.
 */
export function obtenerEmpresaActiva(): string | null {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return null;
    return sesion.empresaIdActiva;
}

/**
 * Obtiene la lista de NITs de empresas vinculadas al usuario.
 * 
 * @returns {string[]} - Array de NITs.
 */
export function obtenerEmpresasVinculadas(): string[] {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return [];
    return sesion.empresasVinculadas;
}

/**
 * Establece las empresas vinculadas al usuario.
 * 
 * @param nits - Array de NITs.
 * @returns {boolean} - true si se actualizó correctamente.
 */
export function establecerEmpresasVinculadas(nits: string[]): boolean {
    const sesion = obtenerSesionCompleta();
    if (!sesion) return false;

    sesion.empresasVinculadas = nits;
    return guardarSesionCompleta(sesion);
}

/**
 * Elimina la sesión del localStorage.
 * 
 * @returns {boolean} - true si se eliminó correctamente.
 */
export function eliminarSesion(): boolean {
    try {
        localStorage.removeItem(SESSION_KEY);
        return true;
    } catch (error) {
        console.error('session-manager: Error al eliminar la sesión:', error);
        return false;
    }
}