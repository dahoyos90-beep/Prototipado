/**
 * src/interfaces/IEventoAusentismo.ts
 * 
 * Interfaz que define la estructura de un Evento de Ausentismo Laboral.
 * Corresponde al módulo M24 - Gestión de Ausentismo.
 * 
 * Un evento representa el registro de una ausencia (por uno o varios días)
 * con las horas por concepto. Los 13 conceptos se dividen en:
 *   - Ausentismo por Ley (9): EG, AT, EL, LM, LP, LL, LAC, VAC, LNR.
 *   - Permiso Laboral (4): DP, VM, ES, CD.
 * 
 * La ausencia puede ser de uno o varios días (fechaInicio y fechaFin),
 * pero SIEMPRE se registra en horas.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3793 (ausentismo laboral)
 * 
 * @version 1.1.0 (agregado EL — Enfermedad Laboral, requerido por Res. 0312)
 * @since 2026-10-08
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

// ================================================================
// CÓDIGOS DE CONCEPTO
// ================================================================

/**
 * Códigos de ausentismo por Ley (9 conceptos).
 * - EG:  Enfermedad General.
 * - AT:  Accidente de Trabajo.
 * - EL:  Enfermedad Laboral.
 * - LM:  Licencia de Maternidad.
 * - LP:  Licencia de Paternidad.
 * - LL:  Licencia por Luto.
 * - LAC: Lactancia.
 * - VAC: Vacaciones.
 * - LNR: Licencia No Remunerada.
 */
export type CodigoAusentismoLey =
    | 'EG'
    | 'AT'
    | 'EL'
    | 'LM'
    | 'LP'
    | 'LL'
    | 'LAC'
    | 'VAC'
    | 'LNR';

/**
 * Códigos de permiso laboral (4 conceptos).
 * - DP: Diligencias Personales.
 * - VM: Visita Médica.
 * - ES: Estudio.
 * - CD: Calamidad Doméstica.
 */
export type CodigoPermisoLaboral =
    | 'DP'
    | 'VM'
    | 'ES'
    | 'CD';

/**
 * Unión de todos los códigos de concepto de ausentismo (13 en total).
 */
export type CodigoConceptoAusentismo =
    | CodigoAusentismoLey
    | CodigoPermisoLaboral;

// ================================================================
// INTERFAZ PRINCIPAL: IEventoAusentismo
// ================================================================

/**
 * Interfaz IEventoAusentismo
 * 
 * Define la estructura completa de un evento de ausentismo laboral.
 * Cumple con `IStorable` (tiene `id: string`).
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del evento (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el evento.
 * 
 * --- Rango de fechas de la ausencia ---
 * @property {string} fechaInicio - Fecha de inicio de la ausencia (ISO YYYY-MM-DD).
 * @property {string} fechaFin - Fecha de fin de la ausencia (ISO YYYY-MM-DD, puede ser igual a fechaInicio).
 * 
 * --- Datos manuales del evento ---
 * @property {string} nombre - Nombre completo del trabajador ausente.
 * @property {string} area - Área o departamento del trabajador.
 * @property {string} soporteContingencia - Nombre del archivo (PDF/imagen) del soporte de la contingencia.
 * @property {string} enfermedadCodigo - Código CIE-10 de la enfermedad o diagnóstico.
 * @property {string} entidadExpideIncapacidad - Nombre de la entidad que expidió la incapacidad (EPS, ARL, etc.).
 * @property {string} otorgadoPor - Persona que otorgó el permiso o registro (ej. jefe inmediato).
 * @property {string | null} observaciones - Observaciones adicionales (puede ser null).
 * 
 * --- Contingencia expresada en horas (13 conceptos) ---
 * @property {number} horasEG - Horas de Enfermedad General.
 * @property {number} horasAT - Horas de Accidente de Trabajo.
 * @property {number} horasEL - Horas de Enfermedad Laboral.
 * @property {number} horasLM - Horas de Licencia de Maternidad.
 * @property {number} horasLP - Horas de Licencia de Paternidad.
 * @property {number} horasLL - Horas de Licencia por Luto.
 * @property {number} horasLAC - Horas de Lactancia.
 * @property {number} horasVAC - Horas de Vacaciones.
 * @property {number} horasLNR - Horas de Licencia No Remunerada.
 * @property {number} horasDP - Horas de Diligencias Personales.
 * @property {number} horasVM - Horas de Visita Médica.
 * @property {number} horasES - Horas de Estudio.
 * @property {number} horasCD - Horas de Calamidad Doméstica.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de creación del evento.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IEventoAusentismo {
    // --- Identificación ---
    id: string;
    empresaId: string;

    // --- Rango de fechas de la ausencia ---
    fechaInicio: string; // ISO YYYY-MM-DD
    fechaFin: string;    // ISO YYYY-MM-DD (>= fechaInicio)

    // --- Datos manuales del evento ---
    nombre: string;
    area: string;
    soporteContingencia: string;
    enfermedadCodigo: string;
    entidadExpideIncapacidad: string;
    otorgadoPor: string;
    observaciones: string | null;

    // --- Contingencia expresada en horas (13 conceptos) ---
    horasEG: number;
    horasAT: number;
    horasEL: number;
    horasLM: number;
    horasLP: number;
    horasLL: number;
    horasLAC: number;
    horasVAC: number;
    horasLNR: number;
    horasDP: number;
    horasVM: number;
    horasES: number;
    horasCD: number;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}