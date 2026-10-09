/**
 * src/interfaces/IParametrosMes.ts
 * 
 * Interfaz que define la estructura de los Parámetros de un Mes específico
 * para el cálculo de ausentismo. Corresponde al módulo M24 - Gestión de
 * Ausentismo.
 * 
 * Los parámetros definen las variables globales del mes:
 *   - Periodo (YYYY-MM).
 *   - Días del mes (28-31).
 *   - Número de empleados de la empresa en ese mes.
 *   - Jornada diaria (horas/día, configurable por mes, default = 7).
 * 
 * Estos parámetros son la base para calcular:
 *   - Días Hombre Mes (DHM) = numEmpleados × diasMes.
 *   - Conversión de horas a días = horas ÷ jornadaDiaria.
 *   - Porcentajes de ausentismo.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - NTC 3793 (ausentismo laboral)
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

/**
 * Interfaz IParametrosMes
 * 
 * Define la estructura completa de los parámetros de un mes para el
 * cálculo de ausentismo. Cumple con `IStorable` (tiene `id: string`).
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único de los parámetros (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenecen.
 * 
 * --- Periodo ---
 * @property {string} periodo - Periodo en formato "YYYY-MM" (ej. "2026-09").
 * 
 * --- Datos del mes ---
 * @property {number} diasMes - Cantidad de días calendario del mes (28-31).
 * @property {number} numEmpleados - Número promedio de empleados en el mes.
 * @property {number} jornadaDiaria - Horas/día de la jornada laboral (default = 7, configurable).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de creación.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IParametrosMes {
    // --- Identificación ---
    id: string;
    empresaId: string;

    // --- Periodo ---
    periodo: string; // "YYYY-MM"

    // --- Datos del mes ---
    diasMes: number;        // 28-31
    numEmpleados: number;   // promedio de empleados del mes
    jornadaDiaria: number;  // horas/día (default 7)

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}