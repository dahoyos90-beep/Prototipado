/**
 * src/interfaces/ICapacitacion.ts
 * 
 * Interfaz que define la estructura del Plan de Capacitación en el sistema.
 * Corresponde al módulo M17 - Plan de Trabajo y Capacitación (CU26 al CU29).
 * 
 * El Plan de Capacitación es el documento anual que agrupa las actividades
 * de capacitación (IActividadCapacitacion), junto con el objetivo, metas,
 * recursos y medición del plan.
 * 
 * Propósito:
 * - Establecer el contrato de datos para el Plan de Capacitación.
 * - Permitir la planificación anual, el seguimiento mensual de actividades
 *   y la gestión de recursos y medición del plan.
 * 
 * @version 2.0.0 (separada la entidad Plan de la entidad Actividad)
 * @since 2026-08-31
 */

import type { IActividadCapacitacion } from './IActividadCapacitacion.js';
import type { IRecursosPlan } from './IRecursosPlan.js';
import type { IMedicionPlan } from './IMedicionPlan.js';

/**
 * Tipos de actividad en el plan de trabajo y capacitación.
 * - PlanSST: Actividades del plan de trabajo anual de SST (CU26).
 * - Capacitacion: Formaciones, charlas, entrenamientos (CU27).
 * - Inspeccion: Inspecciones programadas (parte del plan).
 * - Auditoria: Auditorías internas o externas.
 * - Mantenimiento: Mantenimiento de equipos y sistemas.
 * - Otro: Cualquier otra actividad no clasificada.
 */
export type TipoActividad = "PlanSST" | "Capacitacion" | "Inspeccion" | "Auditoria" | "Mantenimiento" | "Otro";

/**
 * Estado de ejecución de una actividad programada.
 * - Programada: Actividad planificada, aún no ejecutada.
 * - EnCurso: Actividad en ejecución (ej. capacitación en proceso).
 * - Ejecutada: Actividad completada exitosamente.
 * - Cancelada: Actividad cancelada por alguna razón.
 * - Reprogramada: Actividad que fue pospuesta a otra fecha.
 */
export type EstadoEjecucion = "Programada" | "EnCurso" | "Ejecutada" | "Cancelada" | "Reprogramada";

/**
 * Frecuencia de una actividad.
 * - Unica: Actividad que se realiza una sola vez.
 * - Mensual: Actividad que se repite cada mes.
 * - Trimestral: Actividad que se repite cada 3 meses.
 * - Semestral: Actividad que se repite cada 6 meses.
 * - Anual: Actividad que se repite cada año.
 * - Continua: Actividad continua o permanente.
 */
export type FrecuenciaActividad = "Unica" | "Mensual" | "Trimestral" | "Semestral" | "Anual" | "Continua";

/**
 * Interfaz ICapacitacion
 * 
 * Define la estructura completa del Plan de Capacitación anual.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del plan (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el plan.
 * @property {number} anio - Año de vigencia del plan (ej. 2024).
 * 
 * @property {string} objetivo - Objetivo general del plan de capacitación.
 * @property {string} alcance - Alcance del plan (a quién aplica).
 * @property {string[]} metas - Lista de metas específicas del plan.
 * @property {string} plazoCumplimiento - Descripción del plazo para el cumplimiento del plan.
 * 
 * @property {IActividadCapacitacion[]} actividades - Lista de actividades del plan.
 * 
 * @property {IRecursosPlan} recursos - Recursos asignados al plan de capacitación.
 * @property {IMedicionPlan} medicion - Configuración de medición y seguimiento del plan.
 * 
 * @property {string} nombreResponsable - Nombre del responsable SG-SST.
 * @property {string} resolucionLicencia - Número de resolución de la licencia de salud ocupacional.
 * @property {string} certificadoCurso - Número del certificado del curso de 50/20 horas de capacitación.
 * @property {string} representanteLegal - Nombre del representante legal de la empresa.
 * @property {string} cedulaRepresentante - Cédula del representante legal.
 * 
 * @property {Date} fechaCreacion - Fecha y hora de registro del plan.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICapacitacion {
    // --- Identificación ---
    id: string;
    empresaId: string; // NIT de la empresa
    anio: number;

    // --- Información general del plan ---
    objetivo: string;
    alcance: string;
    metas: string[];
    plazoCumplimiento: string;

    // --- Actividades del plan ---
    actividades: IActividadCapacitacion[];

    // --- Recursos y medición ---
    recursos: IRecursosPlan;
    medicion: IMedicionPlan;

    // --- Datos del encabezado ---
    nombreResponsable: string;
    resolucionLicencia: string;
    certificadoCurso: string;
    representanteLegal: string;
    cedulaRepresentante: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}