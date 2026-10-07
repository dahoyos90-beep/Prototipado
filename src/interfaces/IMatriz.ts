/**
 * src/interfaces/IMatriz.ts
 * 
 * Interfaz que define la estructura de una Matriz de Riesgos en el sistema.
 * Corresponde al módulo M13 - Gestión de Matriz de Peligros y Riesgos (GTC 45).
 * 
 * Una Matriz pertenece a un Centro de Trabajo específico y contiene
 * múltiples riesgos (relación con IRiesgo).
 * 
 * @version 1.0.0
 * @since 2026-09-16
 */

/**
 * Clase de riesgo de la empresa (según GTC 45).
 * - I: Riesgo máximo
 * - II: Riesgo alto
 * - III: Riesgo medio
 * - IV: Riesgo bajo
 * - V: Riesgo mínimo
 */
export type ClaseRiesgoEmpresa = "I" | "II" | "III" | "IV" | "V";

/**
 * Interfaz IMatriz
 * 
 * Define la estructura completa de una Matriz de Riesgos.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la matriz (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece la matriz.
 * @property {string} nombreCentroTrabajo - Nombre del Centro de Trabajo (sede física).
 * @property {string} nit - NIT del Centro de Trabajo.
 * @property {number} numTrabajadores - Número de trabajadores del Centro de Trabajo.
 * 
 * @property {boolean} clase1 - Indica si pertenece a la Clase 1.
 * @property {boolean} clase2 - Indica si pertenece a la Clase 2.
 * @property {boolean} clase3 - Indica si pertenece a la Clase 3.
 * @property {boolean} clase4 - Indica si pertenece a la Clase 4.
 * @property {boolean} clase5 - Indica si pertenece a la Clase 5.
 * @property {ClaseRiesgoEmpresa} claseRiesgoEmpresa - Clase de riesgo de la empresa (I a V).
 * 
 * @property {string} fechaUltimaEvaluacion - Fecha de la última evaluación (ISO YYYY-MM-DD).
 * @property {string} fechaRealizacion - Fecha de realización de la matriz (ISO YYYY-MM-DD).
 * 
 * @property {string} responsablesEmpresa - Responsable(s) de la empresa.
 * @property {string} levantamientoPor - Persona que realizó el levantamiento de la información.
 * @property {string} licenciaSO - Número de licencia en Seguridad y Salud en el Trabajo.
 * @property {string} verificadoPor - Persona que verificó la matriz.
 * @property {string} cargoVerificador - Cargo de la persona que verificó.
 * @property {string} asesoradoPor - Persona que asesoró la matriz.
 * @property {string} licenciaAsesor - Número de licencia del asesor.
 * @property {string} fechaVigenciaLicencia - Fecha de vigencia de la licencia (ISO YYYY-MM-DD).
 * 
 * @property {Date} fechaCreacion - Fecha y hora de creación de la matriz.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 * @property {string | null} motivoActualizacion - Motivo de la última actualización (puede ser null si es nueva).
 */
export interface IMatriz {
    // --- Identificación ---
    id: string;
    empresaId: string; // NIT de la empresa
    nombreCentroTrabajo: string;
    nit: string;
    numTrabajadores: number;

    // --- Clases ---
    clase1: boolean;
    clase2: boolean;
    clase3: boolean;
    clase4: boolean;
    clase5: boolean;
    claseRiesgoEmpresa: ClaseRiesgoEmpresa;

    // --- Fechas ---
    fechaUltimaEvaluacion: string; // ISO YYYY-MM-DD
    fechaRealizacion: string;      // ISO YYYY-MM-DD

    // --- Responsables ---
    responsablesEmpresa: string;
    levantamientoPor: string;
    licenciaSO: string;
    verificadoPor: string;
    cargoVerificador: string;
    asesoradoPor: string;
    licenciaAsesor: string;
    fechaVigenciaLicencia: string; // ISO YYYY-MM-DD

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
    motivoActualizacion: string | null;
}