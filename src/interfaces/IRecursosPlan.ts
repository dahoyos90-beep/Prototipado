/**
 * src/interfaces/IRecursosPlan.ts
 * 
 * Interfaz que define la estructura de los recursos asignados al
 * Plan de Capacitación en el sistema.
 * Corresponde al módulo M17 - Plan de Trabajo y Capacitación.
 * 
 * Propósito:
 * - Establecer el contrato de datos para los recursos del plan.
 * - Ser utilizada por ICapacitacion.ts para tipar la propiedad `recursos`.
 * 
 * @version 1.0.0
 * @since 2026-09-28
 */

/**
 * Interfaz IRecursosPlan
 * 
 * Define los recursos asignados al plan de capacitación.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} humanos - Descripción de los recursos humanos (ej. "Profesional en Seguridad y Salud en el Trabajo").
 * @property {string} tecnicos - Descripción de los recursos técnicos (ej. "Computador, video beam, internet").
 * @property {string} financieros - Descripción de los recursos financieros (ej. "Presupuesto asignado por la empresa").
 * @property {string} locativos - Descripción de los recursos locativos (ej. "Instalaciones de la empresa, aforo 12 personas").
 */
export interface IRecursosPlan {
    humanos: string;
    tecnicos: string;
    financieros: string;
    locativos: string;
}