/**
 * src/interfaces/ITendenciaIndicador.ts
 * 
 * Interfaz que define la estructura de los datos procesados para la
 * visualización de tendencias de un Indicador del SG-SST. Corresponde
 * al módulo M23 - Gestión de Indicadores (CU40).
 * 
 * La tendencia se calcula a partir de los resultados históricos
 * registrados para un indicador. Se utiliza para:
 *   - Mostrar la evolución del indicador en el tiempo.
 *   - Comparar contra la meta.
 *   - Detectar desviaciones tempranas.
 *   - Generar alertas automáticas.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (mejora continua)
 * - Resolución 0312 de 2019 (análisis de tendencias)
 * 
 * @version 2.0.0
 *  - Separada de IIndicador.ts (módulo M23).
 *  - Agregados campos: nivelSemaforoActual, semaforoPorPeriodo,
 *    mejorPeriodo, peorPeriodo, promedioHistorico.
 *  - El tipo de estadoTendencia ahora usa TipoTendencia (incluye "SinDatos").
 * 
 * @since 2026-08-31
 */

import type { TipoTendencia, NivelSemaforo } from './IIndicador.js';

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz IDatoHistorico
 * 
 * Representa un dato histórico de un periodo específico.
 * 
 * @property {string} periodo - Identificador del periodo ("2026-08", "2026-Q3", etc.).
 * @property {number} valor - Valor medido en el periodo.
 * @property {number} meta - Meta para ese periodo.
 * @property {NivelSemaforo} semaforo - Semáforo calculado para el periodo.
 * @property {string} fechaRegistro - Fecha de registro en formato ISO.
 */
export interface IDatoHistorico {
    periodo: string;
    valor: number;
    meta: number;
    semaforo: NivelSemaforo;
    fechaRegistro: string;
}

// ================================================================
// INTERFAZ PRINCIPAL: ITendenciaIndicador
// ================================================================

/**
 * Interfaz ITendenciaIndicador
 * 
 * Representa los datos procesados para la visualización de tendencias
 * de un indicador (CU40).
 * 
 * --- Identificación ---
 * @property {string} indicadorId - ID del indicador.
 * @property {string} nombreIndicador - Nombre del indicador (para mostrar).
 * @property {string} clasificacion - Clasificación del indicador (Estructura/Proceso/Resultado).
 * 
 * --- Datos históricos ---
 * @property {IDatoHistorico[]} datosHistoricos - Datos históricos ordenados cronológicamente.
 * @property {number} totalPeriodos - Cantidad de periodos registrados.
 * 
 * --- Estado actual ---
 * @property {number} valorActual - Último valor registrado.
 * @property {number} metaActual - Meta para el periodo actual.
 * @property {NivelSemaforo} nivelSemaforoActual - Semáforo actual del indicador.
 * 
 * --- Análisis de tendencia ---
 * @property {number} variacionPorcentual - Variación % respecto al periodo anterior.
 * @property {TipoTendencia} estadoTendencia - Dirección de la tendencia.
 * @property {number} promedioHistorico - Promedio de todos los valores históricos.
 * @property {number} mejorValor - Mejor valor histórico alcanzado.
 * @property {number} peorValor - Peor valor histórico alcanzado.
 * 
 * --- Análisis de semáforos ---
 * @property {NivelSemaforo[]} semaforoPorPeriodo - Semáforo de cada periodo.
 * @property {number} periodosVerde - Total de periodos en verde.
 * @property {number} periodosAmarillo - Total de periodos en amarillo.
 * @property {number} periodosRojo - Total de periodos en rojo.
 * 
 * --- Proyección (opcional) ---
 * @property {number | null} proyeccionProximoPeriodo - Proyección simple del siguiente periodo.
 * @property {boolean} requiereAccionInmediata - Alerta si está en rojo o con 3+ periodos sin mejora.
 * 
 * --- Metadatos ---
 * @property {Date} fechaActualizacion - Fecha de la última actualización.
 */
export interface ITendenciaIndicador {
    // --- Identificación ---
    indicadorId: string;
    nombreIndicador: string;
    clasificacion: string;

    // --- Datos históricos ---
    datosHistoricos: IDatoHistorico[];
    totalPeriodos: number;

    // --- Estado actual ---
    valorActual: number;
    metaActual: number;
    nivelSemaforoActual: NivelSemaforo;

    // --- Análisis de tendencia ---
    variacionPorcentual: number;
    estadoTendencia: TipoTendencia;
    promedioHistorico: number;
    mejorValor: number;
    peorValor: number;

    // --- Análisis de semáforos ---
    semaforoPorPeriodo: NivelSemaforo[];
    periodosVerde: number;
    periodosAmarillo: number;
    periodosRojo: number;

    // --- Proyección ---
    proyeccionProximoPeriodo: number | null;
    requiereAccionInmediata: boolean;

    // --- Metadatos ---
    fechaActualizacion: Date;
}