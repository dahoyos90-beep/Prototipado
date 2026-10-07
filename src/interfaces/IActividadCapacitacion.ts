/**
 * src/interfaces/IActividadCapacitacion.ts
 * 
 * Interfaz que define la estructura de una Actividad dentro del
 * Plan de Capacitación (M17).
 * 
 * Cada actividad tiene su propia programación mensual (P/E/R),
 * su porcentaje de cumplimiento, indicador y horas de capacitación.
 * 
 * @version 1.1.0 (agregado totalCapacitados; indicador ahora es number)
 * @since 2026-09-28
 */

import type { TipoActividad, EstadoEjecucion, FrecuenciaActividad } from './ICapacitacion.js';

/**
 * Interfaz IActividadCapacitacion
 * 
 * Define la estructura completa de una actividad del Plan de Capacitación.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único de la actividad (generado por el sistema).
 * @property {string} nombre - Nombre o título de la actividad (ej. "Inducción SST").
 * @property {string} descripcion - Descripción detallada de la actividad.
 * @property {string} facilitador - Nombre del facilitador o responsable de la actividad.
 * @property {string} poblacionObjetivo - Descripción de la población objetivo.
 * @property {TipoActividad} tipo - Tipo de actividad (Capacitacion, PlanSST, etc.).
 * @property {FrecuenciaActividad} frecuencia - Frecuencia de la actividad.
 * @property {EstadoEjecucion} estado - Estado de ejecución de la actividad.
 * @property {string} fechaInicio - Fecha de inicio (ISO YYYY-MM-DD).
 * @property {string} fechaFin - Fecha de finalización (ISO YYYY-MM-DD).
 * @property {string | null} fechaEjecucionReal - Fecha real de ejecución (null si no se ha ejecutado).
 * @property {number} totalCapacitados - Total de trabajadores capacitados en esta actividad (ingresado manualmente).
 * @property {string[]} documentosSoporte - URLs o nombres de archivos de evidencias (solo si el estado es "Ejecutada").
 * @property {string | null} observaciones - Observaciones adicionales.
 * @property {Record<string, 'P' | 'E' | 'R' | null>} meses - Estado de la actividad por mes
 *   (P = Planeado, E = Ejecutado, R = Reprogramado, null = No aplica).
 * @property {number} porcentajeCumplimiento - Porcentaje de cumplimiento (0-100).
 * @property {number} indicador - Indicador de cumplimiento = (totalCapacitados / totalTrabajadoresActivos) × 100.
 * @property {number} horasCapacitacion - Horas totales de capacitación de la actividad.
 * @property {Date} fechaCreacion - Fecha y hora de registro de la actividad.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActividadCapacitacion {
    id: string;
    nombre: string;
    descripcion: string;
    facilitador: string;
    poblacionObjetivo: string;
    tipo: TipoActividad;
    frecuencia: FrecuenciaActividad;
    estado: EstadoEjecucion;
    fechaInicio: string;          // ISO YYYY-MM-DD
    fechaFin: string;             // ISO YYYY-MM-DD
    fechaEjecucionReal: string | null;
    totalCapacitados: number;
    documentosSoporte: string[];
    observaciones: string | null;
    meses: Record<string, 'P' | 'E' | 'R' | null>;
    porcentajeCumplimiento: number;
    indicador: number;
    horasCapacitacion: number;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}