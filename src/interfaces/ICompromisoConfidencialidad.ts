/**
 * src/interfaces/ICompromisoConfidencialidad.ts
 * 
 * Interfaz que define la estructura de un Compromiso Individual de
 * Confidencialidad y Reserva del Comité de Convivencia Laboral (CCL).
 * Corresponde al módulo M21 - Gestión del Comité de Convivencia.
 * 
 * Cada miembro (principal y suplente) debe firmar este compromiso al
 * asumir su cargo. La firma es individual e indelegable.
 * 
 * Basado en:
 * - Ley 1010 de 2006 (art. 2 — Reserva y confidencialidad)
 * - Resolución 3461 de 2025 (integración y funciones del CCL)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Parte representada por el firmante.
 * - Empleador:   Designado por el Representante Legal.
 * - Trabajador:  Electo por votación de los trabajadores.
 */
export type ParteConfidencialidad = "Empleador" | "Trabajador";

/**
 * Rol del firmante dentro del comité.
 * - Presidente:  Designado por mutuo acuerdo.
 * - Secretario:  Designado por mutuo acuerdo.
 * - Integrante:  Miembro sin rol directivo.
 */
export type RolConfidencialidad = "Presidente" | "Secretario" | "Integrante";

/**
 * Tipo de miembro.
 * - Principal: Miembro con voz y voto.
 * - Suplente:  Reemplaza al principal en ausencias.
 */
export type TipoMiembroConfidencialidad = "Principal" | "Suplente";

// ================================================================
// INTERFAZ PRINCIPAL: ICompromisoConfidencialidad
// ================================================================

/**
 * Interfaz ICompromisoConfidencialidad
 * 
 * Define la estructura del Compromiso Individual de Confidencialidad.
 * Se genera UN registro por cada miembro del comité.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del compromiso.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité al que pertenece.
 * 
 * --- Datos del firmante ---
 * @property {string} nombre - Nombres y apellidos del firmante.
 * @property {string} cedula - Número de cédula de ciudadanía.
 * @property {string} cargo - Cargo en la empresa.
 * @property {ParteConfidencialidad} parte - Empleador o Trabajador.
 * @property {TipoMiembroConfidencialidad} tipo - Principal o Suplente.
 * @property {RolConfidencialidad} rol - Presidente / Secretario / Integrante.
 * 
 * --- Cláusulas del compromiso ---
 * @property {string} alcance - Cláusula 1: alcance de la confidencialidad.
 * @property {string} prohibiciones - Cláusula 2: prohibiciones y deber de custodia.
 * @property {string} vigencia - Cláusula 3: vigencia del compromiso.
 * @property {string} consecuencias - Cláusula 4: consecuencias por incumplimiento.
 * 
 * --- Firma ---
 * @property {string} ciudadFirma - Ciudad donde se firma.
 * @property {string} fechaFirma - Fecha de firma (ISO YYYY-MM-DD).
 * @property {boolean} firmado - Indica si el compromiso fue firmado.
 * @property {string} archivoPDF - Nombre del PDF del compromiso firmado.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICompromisoConfidencialidad {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;

    // --- Datos del firmante ---
    nombre: string;
    cedula: string;
    cargo: string;
    parte: ParteConfidencialidad;
    tipo: TipoMiembroConfidencialidad;
    rol: RolConfidencialidad;

    // --- Cláusulas del compromiso ---
    alcance: string;
    prohibiciones: string;
    vigencia: string;
    consecuencias: string;

    // --- Firma ---
    ciudadFirma: string;
    fechaFirma: string;
    firmado: boolean;
    archivoPDF: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}