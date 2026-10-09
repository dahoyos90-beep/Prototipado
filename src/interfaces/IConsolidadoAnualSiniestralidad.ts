/**
 * src/interfaces/IConsolidadoAnualSiniestralidad.ts
 * 
 * Interfaz que define la estructura del Consolidado Anual del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * Corresponde a la columna "Consolidado" del Excel "APLICATIVO
 * ESTADISTICO DE ACCIDENTALIDAD.xls" + bloques de análisis agregado
 * (Top 5 meses, distribuciones por gravedad y por área).
 * 
 * IMPORTANTE: Los indicadores anuales se recalculan con los totales
 * brutos del año (NO se promedian los IF/IS mensuales). Fórmula NTC 3701:
 *   IF_anual = (∑AT_anual × K) / HHT_anual
 *   IS_anual = (∑DíasPerdidos_anual × K) / HHT_anual
 *   ILI_anual = (IF_anual × IS_anual) / K_ILI
 * 
 * Se persiste como caché por empresa + año para:
 * - Auditoría histórica (aunque los datos crudos cambien, el consolidado
 *   generado en fecha X queda congelado como registro).
 * - Renderizado rápido de la sub-pestaña "Consolidado" sin recalcular.
 * 
 * Clave natural: `${empresaId}__${anio}`.
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (indicadores mínimos)
 * - NTC 3701 (fórmulas IF, IS, ILI)
 * - Decreto 1072 de 2015 (evaluación de indicadores)
 * 
 * @version 1.0.1
 *  - Renombrado el tipo `IResumenMensualAnual` → `IResumenMensualSiniestralidad`
 *    para evitar colisión con el homónimo de M24 (IResumenMensualAnual en
 *    IConsolidadoAnual.ts). Cambio puramente nominal.
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

import type { EscenarioJornada } from './IIndicadoresMensualesSiniestralidad.js';
import type { GravedadLesion, TipoSiniestro } from './ISiniestro.js';

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Resumen mensual dentro del consolidado anual.
 * Guarda los totales brutos de cada mes para permitir gráficos de
 * tendencia y tablas de comparación sin tener que releer todos los
 * registros mensuales.
 */
export interface IResumenMensualSiniestralidad {
    /** Mes del año (1-12). */
    mes: number;
    /** Nombre del mes para el reporte (ej. "Enero"). */
    nombreMes: string;
    /** Horas Hombre Trabajadas del mes. */
    hht: number;
    /** ∑AT del mes. */
    sumAT: number;
    /** ∑AT con incapacidad del mes. */
    sumATinc: number;
    /** ∑AT mortales del mes. */
    sumATmortal: number;
    /** ∑Días perdidos del mes. */
    sumDiasPerdidos: number;
    /** Investigaciones realizadas y enviadas en el mes. */
    investigaciones: number;
}

/**
 * Entrada del Top de meses por indicador.
 * Se usa para los rankings del bloque "Estadísticas".
 */
export interface ITopMesSiniestralidad {
    /** Mes (1-12). */
    mes: number;
    /** Nombre del mes. */
    nombreMes: string;
    /** Valor del indicador en ese mes. */
    valor: number;
    /** Indicador de referencia (IF, IS, etc.). */
    indicador: string;
}

/**
 * Entrada del Top de áreas por accidentes.
 */
export interface ITopAreaSiniestralidad {
    /** Nombre del área. */
    area: string;
    /** Número de accidentes en esa área en el año. */
    total: number;
    /** Porcentaje sobre el total anual. */
    porcentaje: number;
}

// ================================================================
// INTERFAZ PRINCIPAL: IConsolidadoAnualSiniestralidad
// ================================================================

/**
 * Interfaz IConsolidadoAnualSiniestralidad
 * 
 * Define el consolidado anual del módulo M25.
 * 
 * --- Identificación ---
 * @property {string}          id         - ID único del consolidado.
 * @property {string}          empresaId  - NIT de la empresa activa.
 * @property {string}          configId   - ID de la IConfiguracionSiniestralidad asociada.
 * @property {string}          anio       - Año del consolidado (YYYY).
 * @property {EscenarioJornada} escenario - Escenario de jornada usado para recalcular.
 * 
 * --- Totales brutos anuales ---
 * @property {number} totalHHT                - HHT total del año.
 * @property {number} totalAT                 - ∑AT total del año.
 * @property {number} totalATinc              - ∑AT con incapacidad total del año.
 * @property {number} totalATmortal           - ∑AT mortales total del año.
 * @property {number} totalDiasPerdidos       - ∑Días perdidos total del año.
 * @property {number} totalInvestigaciones    - Investigaciones totales del año.
 * @property {number} mesesConDatos           - Cantidad de meses con registros cargados (0-12).
 * 
 * --- Indicadores anuales recalculados (NTC 3701) ---
 * @property {number | null} if_AT_anual                    - IF anual ponderado.
 * @property {number | null} if_inc_anual                   - IF con incapacidad anual.
 * @property {number | null} is_AT_anual                    - IS anual ponderado.
 * @property {number | null} ili_anual                      - ILI anual.
 * @property {number | null} porcentajeInvestigaciones_anual - %Investigaciones anual.
 * @property {number | null} proporcionMortales_anual       - Proporción de mortales anual (0-100).
 * 
 * --- Datos mensuales consolidados (para gráficos y tablas) ---
 * @property {IResumenMensualSiniestralidad[]} resumenMensual - Resumen de los 12 meses.
 * 
 * --- Rankings y distribuciones ---
 * @property {ITopMesSiniestralidad[]}   top5MesesPorIF     - Top 5 meses por IF.
 * @property {ITopMesSiniestralidad[]}   top5MesesPorIS     - Top 5 meses por IS.
 * @property {ITopAreaSiniestralidad[]}  top5Areas          - Top 5 áreas con más accidentes.
 * @property {Record<GravedadLesion, number>}  distribucionPorGravedad - Conteo por gravedad.
 * @property {Record<TipoSiniestro, number>}   distribucionPorTipo     - Conteo por tipo de siniestro.
 * 
 * --- Constantes usadas ---
 * @property {number} constK    - Constante K usada (por defecto 240.000).
 * @property {number} constKILI - Constante K_ILI usada (por defecto 1.000).
 * 
 * --- Metadatos ---
 * @property {Date}   fechaGeneracion    - Fecha y hora de la generación del consolidado.
 * @property {Date}   fechaActualizacion - Fecha y hora de la última modificación.
 * @property {string} generadoPor        - Nombre o ID del usuario que lo generó.
 */
export interface IConsolidadoAnualSiniestralidad {
    // --- Identificación ---
    id: string;
    empresaId: string;
    configId: string;
    anio: string;
    escenario: EscenarioJornada;

    // --- Totales brutos anuales ---
    totalHHT: number;
    totalAT: number;
    totalATinc: number;
    totalATmortal: number;
    totalDiasPerdidos: number;
    totalInvestigaciones: number;
    mesesConDatos: number;

    // --- Indicadores anuales recalculados ---
    if_AT_anual: number | null;
    if_inc_anual: number | null;
    is_AT_anual: number | null;
    ili_anual: number | null;
    porcentajeInvestigaciones_anual: number | null;
    proporcionMortales_anual: number | null;

    // --- Datos mensuales consolidados ---
    resumenMensual: IResumenMensualSiniestralidad[];

    // --- Rankings y distribuciones ---
    top5MesesPorIF: ITopMesSiniestralidad[];
    top5MesesPorIS: ITopMesSiniestralidad[];
    top5Areas: ITopAreaSiniestralidad[];
    distribucionPorGravedad: Record<GravedadLesion, number>;
    distribucionPorTipo: Record<TipoSiniestro, number>;

    // --- Constantes usadas ---
    constK: number;
    constKILI: number;

    // --- Metadatos ---
    fechaGeneracion: Date;
    fechaActualizacion: Date;
    generadoPor: string;
}