/**
 * src/interfaces/IConsolidadoAnual.ts
 * 
 * Interfaz que define la estructura del Consolidado Anual de Ausentismo.
 * Corresponde al módulo M24 - Gestión de Ausentismo.
 * 
 * Un consolidado anual agrega TODOS los cierres mensuales de un año
 * (según los meses que ya tengan cierre registrado) y los presenta como:
 *   1. Matriz 12 meses × 13 conceptos (horas y días por mes).
 *   2. Totales anuales por concepto.
 *   3. Bloque anual "Por Ley" (9 conceptos, informativo).
 *   4. Bloque anual "Por Causa Médica" (5 conceptos: EG, AT, EL, LM, LP,
 *      indicador legal Res. 0312).
 *   5. Bloque anual "Por Permisos" (4 conceptos).
 *   6. Comparación contra años anteriores (variación porcentual).
 *   7. Top 5 de conceptos con más horas del año.
 * 
 * Se genera automáticamente cada vez que hay un cierre mensual nuevo
 * y se guarda en storageConsolidadosAnuales.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - NTC 3793 (ausentismo laboral)
 * - Resolución 0312 de 2019 (indicador mínimo de Ausentismo por Causa Médica)
 * 
 * @version 1.1.0 (agregado bloqueAnualCausaMedica — indicador legal Res. 0312)
 * @since 2026-10-08
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

import type { CodigoConceptoAusentismo } from './IEventoAusentismo.js';

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Resumen mensual de un mes dentro del consolidado anual.
 * Contiene las horas y días totales por cada uno de los 13 conceptos,
 * más los indicadores globales del mes.
 * 
 * @property {string} periodo - Periodo en formato "YYYY-MM".
 * @property {string} nombreMes - Nombre del mes (ej. "Enero").
 * @property {number} diasMes - Días calendario del mes.
 * @property {number} numEmpleados - Número de empleados del mes.
 * @property {Record<CodigoConceptoAusentismo, number>} horasPorConcepto - Horas por cada uno de los 13 conceptos.
 * @property {number} totalHorasLey - Suma total de horas del grupo Por Ley.
 * @property {number} totalHorasCausaMedica - Suma total de horas del grupo Causa Médica.
 * @property {number} totalHorasPermisos - Suma total de horas del grupo Permisos.
 * @property {number} totalDiasLey - Total de días (Por Ley) del mes.
 * @property {number} totalDiasCausaMedica - Total de días (Causa Médica) del mes.
 * @property {number} totalDiasPermisos - Total de días (Permisos) del mes.
 * @property {number} porcentajeAusentismoLey - % de ausentismo del grupo Por Ley.
 * @property {number} porcentajeAusentismoCausaMedica - % de ausentismo del grupo Causa Médica.
 * @property {number} porcentajeAusentismoPermisos - % de ausentismo del grupo Permisos.
 * @property {boolean} tieneCierre - Indica si el mes tiene cierre registrado.
 */
export interface IResumenMensualAnual {
    periodo: string; // "YYYY-MM"
    nombreMes: string;
    diasMes: number;
    numEmpleados: number;
    horasPorConcepto: Record<CodigoConceptoAusentismo, number>;
    totalHorasLey: number;
    totalHorasCausaMedica: number;
    totalHorasPermisos: number;
    totalDiasLey: number;
    totalDiasCausaMedica: number;
    totalDiasPermisos: number;
    porcentajeAusentismoLey: number;
    porcentajeAusentismoCausaMedica: number;
    porcentajeAusentismoPermisos: number;
    tieneCierre: boolean;
}

/**
 * Bloque anual de indicadores (aplica a "Por Ley", "Causa Médica" y "Permisos").
 * 
 * @property {number} totalHorasAnio - Suma de horas del año.
 * @property {number} totalDiasAnio - Suma de días del año.
 * @property {number} promedioHorasMensuales - Promedio de horas por mes con cierre.
 * @property {number} promedioDiasMensuales - Promedio de días por mes con cierre.
 * @property {number} promedioAusentismoMensual - Promedio de % ausentismo por mes con cierre.
 * @property {number} porcentajeAusentismoAnual - % de ausentismo anual calculado sobre los días con cierre.
 */
export interface IBloqueAnual {
    totalHorasAnio: number;
    totalDiasAnio: number;
    promedioHorasMensuales: number;
    promedioDiasMensuales: number;
    promedioAusentismoMensual: number;
    porcentajeAusentismoAnual: number;
}

/**
 * Registro de comparación del año actual con un año anterior.
 * 
 * @property {number} anio - Año comparado (ej. 2025).
 * @property {number} totalHorasLey - Total de horas Por Ley del año comparado.
 * @property {number} totalDiasLey - Total de días Por Ley del año comparado.
 * @property {number} totalHorasPermisos - Total de horas de Permisos del año comparado.
 * @property {number} totalDiasPermisos - Total de días de Permisos del año comparado.
 * @property {number} variacionPorcentualHoras - Variación % del total de horas (Ley + Permisos) vs el año comparado.
 * @property {number} variacionPorcentualDias - Variación % del total de días (Ley + Permisos) vs el año comparado.
 * @property {string} tendencia - Dirección de la tendencia: "Mejora" | "Deterioro" | "Estable".
 */
export interface IComparacionAnio {
    anio: number;
    totalHorasLey: number;
    totalDiasLey: number;
    totalHorasPermisos: number;
    totalDiasPermisos: number;
    variacionPorcentualHoras: number;
    variacionPorcentualDias: number;
    tendencia: 'Mejora' | 'Deterioro' | 'Estable';
}

/**
 * Entrada del Top de conceptos con más horas del año.
 * 
 * @property {CodigoConceptoAusentismo} codigo - Código del concepto.
 * @property {string} etiqueta - Nombre del concepto (ej. "Enfermedad General").
 * @property {number} totalHoras - Total de horas del concepto en el año.
 * @property {number} porcentaje - Porcentaje sobre el total anual de horas.
 */
export interface ITopConceptoAnual {
    codigo: CodigoConceptoAusentismo;
    etiqueta: string;
    totalHoras: number;
    porcentaje: number;
}

// ================================================================
// INTERFAZ PRINCIPAL: IConsolidadoAnual
// ================================================================

/**
 * Interfaz IConsolidadoAnual
 * 
 * Define la estructura completa del consolidado anual de ausentismo.
 * Cumple con `IStorable` (tiene `id: string`).
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del consolidado (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece.
 * @property {string} anio - Año en formato "YYYY" (ej. "2026").
 * 
 * --- Resumen de cada mes ---
 * @property {IResumenMensualAnual[]} meses - Array de 12 entradas (una por mes, incluidos los que no tienen cierre).
 * 
 * --- Totales anuales por concepto ---
 * @property {Record<CodigoConceptoAusentismo, number>} horasTotalesPorConcepto - Suma anual de horas por concepto.
 * @property {Record<CodigoConceptoAusentismo, number>} diasTotalesPorConcepto - Suma anual de días por concepto.
 * 
 * --- Bloques anuales ---
 * @property {IBloqueAnual} bloqueAnualLey - Bloque anual "Por Ley" (9 conceptos, informativo).
 * @property {IBloqueAnual} bloqueAnualCausaMedica - Bloque anual "Causa Médica" (5 conceptos, indicador legal Res. 0312).
 * @property {IBloqueAnual} bloqueAnualPermisos - Bloque anual "Permisos" (4 conceptos).
 * 
 * --- Comparación con años anteriores ---
 * @property {IComparacionAnio[]} comparacionAnios - Array de comparaciones contra años anteriores (ordenado descendente).
 * 
 * --- Top 5 de conceptos ---
 * @property {ITopConceptoAnual[]} top5Conceptos - Top 5 de conceptos con más horas del año.
 * 
 * --- Estado y control ---
 * @property {number} mesesConCierre - Cantidad de meses que tienen cierre registrado (0-12).
 * @property {number} cierresEnviadosAM23 - Cantidad de cierres mensuales enviados a M23.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de creación.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IConsolidadoAnual {
    // --- Identificación ---
    id: string;
    empresaId: string;
    anio: string; // "YYYY"

    // --- Resumen de cada mes ---
    meses: IResumenMensualAnual[];

    // --- Totales anuales por concepto ---
    horasTotalesPorConcepto: Record<CodigoConceptoAusentismo, number>;
    diasTotalesPorConcepto: Record<CodigoConceptoAusentismo, number>;

    // --- Bloques anuales ---
    bloqueAnualLey: IBloqueAnual;
    bloqueAnualCausaMedica: IBloqueAnual;
    bloqueAnualPermisos: IBloqueAnual;

    // --- Comparación con años anteriores ---
    comparacionAnios: IComparacionAnio[];

    // --- Top 5 de conceptos ---
    top5Conceptos: ITopConceptoAnual[];

    // --- Estado y control ---
    mesesConCierre: number;
    cierresEnviadosAM23: number;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}