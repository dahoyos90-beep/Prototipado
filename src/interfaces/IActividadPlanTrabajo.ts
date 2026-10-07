/**
 * src/interfaces/IActividadPlanTrabajo.ts
 * 
 * Interfaz que define la estructura de una Actividad dentro del
 * Plan de Trabajo (M17).
 * 
 * Cada actividad tiene su etapa PHVA, programa/componente, responsable,
 * su programación mensual (P/E/R), su porcentaje de cumplimiento,
 * indicador y documentos de soporte.
 * 
 * @version 1.1.0 (cambiado semanas por meses; agregado totalCapacitados e indicador)
 * @since 2026-09-28
 */

/**
 * Etapa del ciclo PHVA (Planear, Hacer, Verificar, Actuar).
 * - Planear: Actividades de planificación.
 * - Hacer: Actividades de ejecución.
 * - Verificar: Actividades de verificación y auditoría.
 * - Actuar: Actividades de mejora y corrección.
 */
export type EtapaPHVA = "Planear" | "Hacer" | "Verificar" | "Actuar";

/**
 * Interfaz IActividadPlanTrabajo
 * 
 * Define la estructura completa de una actividad del Plan de Trabajo.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la actividad (generado por el sistema).
 * @property {EtapaPHVA} etapa - Etapa del ciclo PHVA a la que pertenece.
 * @property {string} programa - Programa o componente (ej. "Copasst", "Convivencia Laboral").
 * @property {string} actividad - Descripción de la actividad programada.
 * @property {string} responsable - Responsable(s) de ejecutar la actividad.
 * @property {Record<string, 'P' | 'E' | 'R' | null>} meses - Estado mensual.
 *   Claves: "enero", "febrero", ..., "diciembre".
 *   Valores: P (Programado), E (Ejecutado), R (Reprogramado), null (No aplica).
 * @property {number} porcentajeCumplimiento - Porcentaje de cumplimiento de la actividad (0-100).
 * @property {number} totalCapacitados - Total de trabajadores capacitados en esta actividad (ingresado manualmente).
 * @property {number} indicador - Indicador = (totalCapacitados / totalTrabajadoresActivos) × 100.
 * @property {string[]} documentosSoporte - URLs o nombres de archivos de evidencias (solo si el estado es "E").
 * @property {string} observaciones - Notas aclaratorias de la gestión.
 * @property {Date} fechaCreacion - Fecha y hora de registro de la actividad.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActividadPlanTrabajo {
    id: string;
    etapa: EtapaPHVA;
    programa: string;
    actividad: string;
    responsable: string;
    meses: Record<string, 'P' | 'E' | 'R' | null>;
    porcentajeCumplimiento: number;
    totalCapacitados: number;
    indicador: number;
    documentosSoporte: string[];
    observaciones: string;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}