/**
 * src/interfaces/IPlanMejoraConvivencia.ts
 * 
 * Interfaz que define la estructura de un Plan de Mejora / Compromiso de
 * Convivencia en el Comité de Convivencia Laboral (CCL). Corresponde al
 * módulo M21 - Gestión del Comité de Convivencia.
 * 
 * ⚠️ IMPORTANTE:
 * Este documento SOLO se genera para casos de:
 *   - Acoso Laboral (Ley 1010 de 2006).
 *   - Conflictos de Convivencia.
 * 
 * NO aplica para casos de Acoso Sexual Laboral (ASL). La Ley 2365 de 2024
 * prohíbe expresamente la conciliación y el careo entre víctima y presunto
 * agresor en dichos supuestos.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (mesa de diálogo: 5 a 15 días calendario)
 * - Ley 1010 de 2006 (procedimiento conciliatorio)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Estado general del plan de mejora.
 * - EnEjecucion: El plan fue firmado y está vigente.
 * - Cumplido:    Se completaron todos los seguimientos con éxito.
 * - Incumplido:  Algún seguimiento no se cumplió.
 * - Cerrado:     Cerrado por decisión del comité.
 */
export type EstadoPlanMejora = "EnEjecucion" | "Cumplido" | "Incumplido" | "Cerrado";

/**
 * Estado de un seguimiento específico del plan.
 * - Pendiente:  Aún no se ha verificado.
 * - Cumplido:   Se verificó cumplimiento.
 * - Incumplido: Se verificó incumplimiento.
 */
export type EstadoSeguimientoPlan = "Pendiente" | "Cumplido" | "Incumplido";

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz ISeguimientoPlanMejora
 * 
 * Registra cada verificación periódica del plan de mejora.
 * 
 * @property {string} id - Identificador único del seguimiento.
 * @property {string} fecha - Fecha de la verificación (ISO YYYY-MM-DD).
 * @property {string} responsable - Nombre del responsable del seguimiento.
 * @property {string} observaciones - Observaciones del seguimiento.
 * @property {EstadoSeguimientoPlan} estado - Resultado del seguimiento.
 */
export interface ISeguimientoPlanMejora {
    id: string;
    fecha: string;
    responsable: string;
    observaciones: string;
    estado: EstadoSeguimientoPlan;
}

// ================================================================
// INTERFAZ PRINCIPAL: IPlanMejoraConvivencia
// ================================================================

/**
 * Interfaz IPlanMejoraConvivencia
 * 
 * Define la estructura del Plan de Mejora / Compromiso de Convivencia.
 * Se genera al final de la mesa de diálogo conjunta.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del plan.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité.
 * @property {string} quejaId - ID de la queja asociada.
 * @property {string} casoId - ID del caso asociado.
 * @property {string} numeroActa - Número de acta del plan (formato).
 * 
 * --- Partes comprometidas ---
 * @property {string} parteANombre - Nombre del quejoso.
 * @property {string} parteACargo - Cargo del quejoso.
 * @property {string} parteACedula - Cédula del quejoso.
 * @property {string} parteBNombre - Nombre de la persona reportada.
 * @property {string} parteBCargo - Cargo de la persona reportada.
 * @property {string} parteBCedula - Cédula de la persona reportada.
 * 
 * --- Contenido ---
 * @property {string} fechaFirma - Fecha de firma (ISO YYYY-MM-DD).
 * @property {string} ciudad - Ciudad de firma.
 * @property {string} objetivo - Objetivo del plan.
 * @property {string[]} compromisosParteA - Compromisos del quejoso.
 * @property {string[]} compromisosParteB - Compromisos del denunciado.
 * @property {string[]} compromisosInstitucionales - Compromisos del comité.
 * 
 * --- Seguimiento ---
 * @property {ISeguimientoPlanMejora[]} seguimientos - Lista de verificaciones.
 * 
 * --- Cierre y estado ---
 * @property {EstadoPlanMejora} estado - Estado general del plan.
 * @property {string | null} actaCierre - Acta de cierre (URL/nombre).
 * @property {string | null} observaciones - Observaciones adicionales.
 * 
 * --- Firmas y documento ---
 * @property {boolean} firmadoParteA - Indica si el quejoso firmó.
 * @property {boolean} firmadoParteB - Indica si el denunciado firmó.
 * @property {boolean} firmadoPresidente - Indica si el presidente firmó.
 * @property {boolean} firmadoSecretario - Indica si el secretario firmó.
 * @property {string} archivoPDF - Nombre del PDF del acta de plan.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IPlanMejoraConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    quejaId: string;
    casoId: string;
    numeroActa: string;

    // --- Partes comprometidas ---
    parteANombre: string;
    parteACargo: string;
    parteACedula: string;
    parteBNombre: string;
    parteBCargo: string;
    parteBCedula: string;

    // --- Contenido ---
    fechaFirma: string;
    ciudad: string;
    objetivo: string;
    compromisosParteA: string[];
    compromisosParteB: string[];
    compromisosInstitucionales: string[];

    // --- Seguimiento ---
    seguimientos: ISeguimientoPlanMejora[];

    // --- Cierre y estado ---
    estado: EstadoPlanMejora;
    actaCierre: string | null;
    observaciones: string | null;

    // --- Firmas y documento ---
    firmadoParteA: boolean;
    firmadoParteB: boolean;
    firmadoPresidente: boolean;
    firmadoSecretario: boolean;
    archivoPDF: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}