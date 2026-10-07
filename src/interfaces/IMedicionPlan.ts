/**
 * src/interfaces/IMedicionPlan.ts
 * 
 * Interfaz que define la estructura de la configuración de medición
 * y seguimiento del Plan de Capacitación en el sistema.
 * Corresponde al módulo M17 - Plan de Trabajo y Capacitación.
 * 
 * Propósito:
 * - Establecer el contrato de datos para la medición del plan.
 * - Ser utilizada por ICapacitacion.ts para tipar la propiedad `medicion`.
 * 
 * @version 1.0.0
 * @since 2026-09-28
 */

/**
 * Interfaz IMedicionPlan
 * 
 * Define la configuración de medición y seguimiento del plan.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} formula - Fórmula de cálculo del cumplimiento
 *   (ej. "Actividades ejecutadas * 100 / Actividades programadas").
 * @property {number} meta - Meta porcentual de cumplimiento (ej. 90).
 * @property {string} analisis - Análisis de datos o conclusiones del seguimiento.
 */
export interface IMedicionPlan {
    formula: string;
    meta: number;
    analisis: string;
}