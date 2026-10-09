/**
 * src/interfaces/IReglamentoInternoCCL.ts
 * 
 * Interfaz que define la estructura del Reglamento Interno del Comité de
 * Convivencia Laboral (CCL). Corresponde al módulo M21 - Gestión del
 * Comité de Convivencia.
 * 
 * Es un documento oficial redactado y firmado por los miembros del CCL
 * donde se definen las reglas internas de funcionamiento.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (funcionamiento del CCL)
 * - Ley 1010 de 2006 (reserva y régimen disciplinario)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Estado del reglamento.
 * - Borrador:  En construcción, no aprobado.
 * - Aprobado:  Firmado por todos los miembros del CCL.
 * - Archivado: Guardado como versión anterior.
 */
export type EstadoReglamento = "Borrador" | "Aprobado" | "Archivado";

// ================================================================
// INTERFAZ PRINCIPAL: IReglamentoInternoCCL
// ================================================================

/**
 * Interfaz IReglamentoInternoCCL
 * 
 * Define la estructura del Reglamento Interno del Comité de Convivencia.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del reglamento.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {string} version - Versión del reglamento (ej. "1.0.0").
 * 
 * --- Contenido (10 cláusulas según Info 19) ---
 * @property {string} objeto - Objeto del reglamento.
 * @property {string} marcoLegal - Marco legal aplicable.
 * @property {string} conformacion - Composición del CCL.
 * @property {string} funcionesPresidente - Funciones del Presidente.
 * @property {string} funcionesSecretario - Funciones del Secretario.
 * @property {string} funcionesIntegrantes - Funciones de los integrantes.
 * @property {string} impedimentos - Causales de impedimento y recusación.
 * @property {string} protocoloConfidencialidad - Protocolo de confidencialidad.
 * @property {string} regimenSanciones - Sanciones por violar la reserva.
 * @property {string} vigencia - Vigencia del reglamento.
 * 
 * --- Aprobación ---
 * @property {string} fechaAprobacion - Fecha de aprobación (ISO YYYY-MM-DD).
 * @property {string} ciudadAprobacion - Ciudad donde se aprobó.
 * @property {EstadoReglamento} estado - Estado del reglamento.
 * 
 * --- Firmas ---
 * @property {string[]} firmantes - Nombres de los miembros que firmaron.
 * @property {string} archivoPDF - Nombre del PDF del reglamento.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IReglamentoInternoCCL {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    version: string;

    // --- Contenido (10 cláusulas) ---
    objeto: string;
    marcoLegal: string;
    conformacion: string;
    funcionesPresidente: string;
    funcionesSecretario: string;
    funcionesIntegrantes: string;
    impedimentos: string;
    protocoloConfidencialidad: string;
    regimenSanciones: string;
    vigencia: string;

    // --- Aprobación ---
    fechaAprobacion: string;
    ciudadAprobacion: string;
    estado: EstadoReglamento;

    // --- Firmas ---
    firmantes: string[];
    archivoPDF: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}