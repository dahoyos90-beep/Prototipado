/**
 * src/interfaces/IPlanTrabajo.ts
 * 
 * Interfaz que define la estructura del Plan de Trabajo Anual en el sistema.
 * Corresponde al módulo M17 - Plan de Trabajo y Capacitación.
 * 
 * El Plan de Trabajo es el documento anual que agrupa las actividades
 * de SST (IActividadPlanTrabajo), junto con el objetivo, metas,
 * recursos y medición del plan.
 * 
 * Propósito:
 * - Establecer el contrato de datos para el Plan de Trabajo.
 * - Permitir la planificación anual por etapas PHVA, el seguimiento semanal
 *   de actividades y la gestión de recursos y medición del plan.
 * 
 * @version 1.0.0
 * @since 2026-09-28
 */

import type { IActividadPlanTrabajo } from './IActividadPlanTrabajo.js';
import type { IRecursosPlan } from './IRecursosPlan.js';
import type { IMedicionPlan } from './IMedicionPlan.js';

/**
 * Interfaz IPlanTrabajo
 * 
 * Define la estructura completa del Plan de Trabajo anual.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del plan (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el plan.
 * @property {number} anio - Año de vigencia del plan (ej. 2024).
 * 
 * @property {string} objetivo - Objetivo general del plan de trabajo.
 * @property {string} alcance - Alcance del plan (a quién aplica).
 * @property {string[]} metas - Lista de metas específicas del plan.
 * @property {string} plazoCumplimiento - Descripción del plazo para el cumplimiento del plan.
 * 
 * @property {IActividadPlanTrabajo[]} actividades - Lista de actividades del plan.
 * 
 * @property {IRecursosPlan} recursos - Recursos asignados al plan de trabajo.
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
export interface IPlanTrabajo {
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
    actividades: IActividadPlanTrabajo[];

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