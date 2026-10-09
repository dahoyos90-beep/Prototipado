/**
 * src/interfaces/IIndicadoresMensualesSiniestralidad.ts
 * 
 * Interfaz que define la forma de los indicadores calculados del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * IMPORTANTE: Estos indicadores NO se persisten (decisión de diseño 3a).
 * Se calculan al vuelo desde las variables crudas del
 * IRegistroMensualSiniestralidad aplicando las fórmulas de la NTC 3701.
 * 
 * Este archivo define el tipo de retorno de las funciones de cálculo
 * en `src/siniestralidad-utils.ts` y el tipo usado por las vistas para
 * renderizar los valores sin ambigüedad.
 * 
 * Basado en:
 * - NTC 3701 (fórmulas IF, IF_inc, IS, ILI)
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Escenario de cálculo según jornada laboral.
 * 
 * - "48h": Jornada clásica.
 * - "42h": Jornada reducida (Ley 2101 de 2021).
 * 
 * El módulo permite alternar entre ambos para comparar el impacto en
 * los índices de frecuencia y severidad.
 */
export type EscenarioJornada = "48h" | "42h";

// ================================================================
// INTERFAZ PRINCIPAL: IIndicadoresMensualesSiniestralidad
// ================================================================

/**
 * Interfaz IIndicadoresMensualesSiniestralidad
 * 
 * Representa los 5 indicadores calculados de un mes específico, junto
 * con los totales brutos que se usaron para calcularlos (trazabilidad).
 * 
 * Todos los indicadores pueden ser `null` cuando la división por cero
 * no es posible (HHT = 0). En la UI se renderizan como "—".
 * 
 * --- Identificación ---
 * @property {string}          periodo    - Periodo calculado (YYYY-MM).
 * @property {EscenarioJornada} escenario  - Escenario de jornada usado.
 * 
 * --- Totales brutos (entrada del cálculo) ---
 * @property {number} hht             - Horas Hombre Trabajadas efectivas usadas.
 * @property {number} sumAT           - ∑AT: accidentes de trabajo del mes.
 * @property {number} sumATinc        - ∑AT con incapacidad del mes.
 * @property {number} sumATmortal     - ∑AT mortales del mes.
 * @property {number} sumDiasPerdidos - Total de días perdidos del mes.
 * @property {number} investigaciones - Investigaciones realizadas y enviadas.
 * 
 * --- Indicadores calculados (NTC 3701) ---
 * @property {number | null} if_AT       - IF: Índice de Frecuencia de AT.
 *                                        Fórmula: (∑AT × K) / HHT.
 * @property {number | null} if_inc      - IF_inc: Índice de Frecuencia con incapacidad.
 *                                        Fórmula: (∑AT_inc × K) / HHT.
 * @property {number | null} is_AT       - IS: Índice de Severidad de AT.
 *                                        Fórmula: (∑DíasPerdidos × K) / HHT.
 * @property {number | null} ili         - ILI: Índice de Lesiones Incapacitantes.
 *                                        Fórmula: (IF × IS) / K_ILI.
 * @property {number | null} porcentajeInvestigaciones
 *                                        - %Investigaciones: (Investigaciones / ∑AT) × 100.
 * @property {number | null} proporcionMortales
 *                                        - Proporción de AT mortales: (∑AT_mortal / ∑AT) × 100.
 * 
 * --- Constantes usadas ---
 * @property {number} constK    - Constante K usada en el cálculo (por defecto 240.000).
 * @property {number} constKILI - Constante K_ILI usada en el cálculo (por defecto 1.000).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCalculo - Fecha y hora del cálculo (para trazabilidad en memoria).
 */
export interface IIndicadoresMensualesSiniestralidad {
    // --- Identificación ---
    periodo: string;
    escenario: EscenarioJornada;

    // --- Totales brutos (entrada del cálculo) ---
    hht: number;
    sumAT: number;
    sumATinc: number;
    sumATmortal: number;
    sumDiasPerdidos: number;
    investigaciones: number;

    // --- Indicadores calculados (NTC 3701) ---
    if_AT: number | null;
    if_inc: number | null;
    is_AT: number | null;
    ili: number | null;
    porcentajeInvestigaciones: number | null;
    proporcionMortales: number | null;

    // --- Constantes usadas ---
    constK: number;
    constKILI: number;

    // --- Metadatos ---
    fechaCalculo: Date;
}