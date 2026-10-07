/**
 * src/interfaces/ISession.ts
 * 
 * Interfaz que define la estructura de la Sesión de un Usuario en el sistema.
 * Se utiliza para gestionar el estado de autenticación, la empresa activa
 * (para el Profesional SST), las empresas vinculadas (para el usuario Empresa),
 * y el control de cambios sin guardar.
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Sesión.
 * - Ser utilizada por el gestor de sesión (session-manager.ts) y por auth.ts.
 * 
 * @version 1.0.0
 * @since 2026-09-10
 */

import type { RolUsuario } from './IUsuario.js';

/**
 * Interfaz ISession
 * 
 * Define la estructura completa de la sesión de un usuario en el prototipo
 * SG-SST Manager. Todas las propiedades son obligatorias para garantizar
 * la integridad de los datos de sesión.
 * 
 * @property {string} usuarioId - Identificador único del usuario autenticado.
 * @property {string} email - Correo electrónico del usuario.
 * @property {string} nombreCompleto - Nombre completo del usuario.
 * @property {RolUsuario} rol - Rol del usuario en el sistema (Profesional, Empresa, etc.).
 * @property {string} fechaInicio - Fecha y hora de inicio de sesión (formato ISO).
 * @property {string | null} empresaIdActiva - NIT de la empresa activa (null si el SST no ha seleccionado empresa).
 * @property {string[]} empresasVinculadas - Lista de NITs de empresas vinculadas al usuario.
 * @property {string} ultimaActividad - Fecha y hora de la última actividad (formato ISO), para control de inactividad.
 * @property {boolean} cambiosSinGuardar - Indica si hay cambios sin guardar en algún formulario.
 */
export interface ISession {
    usuarioId: string;
    email: string;
    nombreCompleto: string;
    rol: RolUsuario;
    fechaInicio: string;
    empresaIdActiva: string | null;
    empresasVinculadas: string[];
    ultimaActividad: string;
    cambiosSinGuardar: boolean;
}