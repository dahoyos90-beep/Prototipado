/**
 * src/interfaces/ICalculoHHT.ts
 * 
 * Interfaz que define la estructura de un Cálculo de Horas Hombre
 * Trabajadas (HHT) para un periodo específico en el módulo M23 -
 * Gestión de Indicadores.
 * 
 * La HHT es el insumo principal para calcular los índices de
 * accidentalidad (IFAT, ISAT, ILIAT) según la NTC 3701.
 * 
 * Fórmula estándar:
 *   HHT = (XT × HTD × DTM) + NHE − NHA
 * 
 * Donde:
 *   - XT  = Número promedio de trabajadores en el periodo
 *   - HTD = Horas ordinarias trabajadas al día
 *   - DTM = Días trabajados en el mes
 *   - NHE = Horas extras y tiempo suplementario laborado
 *   - NHA = Horas totales de ausentismo durante el periodo
 * 
 * Basado en:
 * - NTC 3701 (Higiene y seguridad — índices de accidentalidad)
 * - NTC 3793 (Ausentismo laboral)
 * - Decreto 1072 de 2015
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Origen del cálculo de HHT.
 * - Manual: Ingresado manualmente por el usuario.
 * - Automatico: Calculado automáticamente desde otros módulos.
 * - Mixto: Parte manual, parte automático.
 */
export type OrigenCalculoHHT = "Manual" | "Automatico" | "Mixto";

/**
 * Estado de validación del cálculo de HHT.
 * - Borrador: Aún no confirmado.
 * - Validado: Confirmado por un profesional.
 * - Rechazado: Revisado y no válido.
 */
export type EstadoCalculoHHT = "Borrador" | "Validado" | "Rechazado";

// ================================================================
// INTERFAZ PRINCIPAL: ICalculoHHT
// ================================================================

/**
 * Interfaz ICalculoHHT
 * 
 * Define la estructura completa de un cálculo de Horas Hombre
 * Trabajadas para un periodo específico.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del cálculo.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} periodo - Periodo del cálculo ("2026-08", "2026-Q3", etc.).
 * @property {string} fechaInicioPeriodo - Fecha de inicio (ISO YYYY-MM-DD).
 * @property {string} fechaFinPeriodo - Fecha de fin (ISO YYYY-MM-DD).
 * 
 * --- Componentes de la fórmula ---
 * @property {number} XT - Número promedio de trabajadores en el periodo.
 * @property {number} HTD - Horas ordinarias trabajadas al día.
 * @property {number} DTM - Días trabajados en el mes.
 * @property {number} NHE - Horas extras y suplementarias.
 * @property {number} NHA - Horas totales de ausentismo.
 * 
 * --- Resultado del cálculo ---
 * @property {number} horasOrdinariasTotales - Resultado de (XT × HTD × DTM).
 * @property {number} hhtTotal - Resultado final: HHT = ordinarias + NHE − NHA.
 * 
 * --- Origen y validación ---
 * @property {OrigenCalculoHHT} origen - Cómo se obtuvo el cálculo.
 * @property {EstadoCalculoHHT} estado - Estado de validación.
 * @property {string | null} observaciones - Observaciones (puede ser null).
 * @property {string | null} calculadoPor - Nombre o ID de quien calculó.
 * @property {string | null} validadoPor - Nombre o ID de quien validó.
 * @property {string | null} fechaValidacion - Fecha de validación (ISO YYYY-MM-DD).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha de creación.
 * @property {Date} fechaActualizacion - Fecha de última modificación.
 */
export interface ICalculoHHT {
    // --- Identificación ---
    id: string;
    empresaId: string;
    periodo: string;
    fechaInicioPeriodo: string;
    fechaFinPeriodo: string;

    // --- Componentes de la fórmula ---
    XT: number;   // Número promedio de trabajadores
    HTD: number;  // Horas trabajadas al día
    DTM: number;  // Días trabajados en el mes
    NHE: number;  // Horas extras y suplementarias
    NHA: number;  // Horas totales de ausentismo

    // --- Resultado del cálculo ---
    horasOrdinariasTotales: number;
    hhtTotal: number;

    // --- Origen y validación ---
    origen: OrigenCalculoHHT;
    estado: EstadoCalculoHHT;
    observaciones: string | null;
    calculadoPor: string | null;
    validadoPor: string | null;
    fechaValidacion: string | null;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}