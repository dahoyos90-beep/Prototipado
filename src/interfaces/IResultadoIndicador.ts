/**
 * src/interfaces/IResultadoIndicador.ts
 * 
 * Interfaz que define la estructura de un Resultado registrado para un
 * Indicador del SG-SST en un periodo específico. Corresponde al módulo
 * M23 - Gestión de Indicadores (CU39).
 * 
 * Cada indicador tiene múltiples resultados (uno por cada periodo según
 * su periodicidad). Los resultados se utilizan para calcular tendencias
 * y generar reportes.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (art. 2.2.4.6.19 — registro de valores)
 * - Resolución 0312 de 2019 (periodicidad de reporte)
 * 
 * @version 2.0.0
 *  - Separada de IIndicador.ts (módulo M23).
 *  - Agregados campos: semaforo (calculado) y planAccionId (vinculación
 *    con plan de acción cuando el resultado está en rojo).
 * 
 * @since 2026-08-31
 */

import type { NivelSemaforo } from './IIndicador.js';

// ================================================================
// INTERFAZ PRINCIPAL: IResultadoIndicador
// ================================================================

/**
 * Interfaz IResultadoIndicador
 * 
 * Define la estructura de un resultado registrado para un indicador
 * en un periodo específico.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del resultado.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} indicadorId - ID del indicador al que pertenece.
 * 
 * --- Periodo y valor ---
 * @property {string} periodo - Periodo del registro ("2026-08", "2026-Q3", "2026-S1", "2026").
 * @property {number} valor - Valor numérico obtenido para el resultado.
 * @property {number} metaPeriodo - Meta específica para el periodo (puede diferir de la meta anual).
 * @property {number} porcentajeCumplimiento - Porcentaje de cumplimiento calculado (0-100).
 * 
 * --- Semáforo y alertas ---
 * @property {NivelSemaforo} semaforo - Nivel de semáforo calculado (Verde/Amarillo/Rojo).
 * @property {boolean} alertaGenerada - Indica si se generó alerta (semáforo Amarillo o Rojo).
 * @property {string | null} planAccionId - ID del plan de acción asociado (si se abrió uno).
 * 
 * --- Datos de captura ---
 * @property {string[]} evidencias - Nombres de archivos de evidencia (PDFs, imágenes).
 * @property {string | null} observaciones - Observaciones sobre el resultado (puede ser null).
 * @property {boolean} validado - Indica si el resultado fue validado por un profesional.
 * @property {string | null} validadoPor - Nombre o ID de quien validó.
 * @property {string | null} fechaValidacion - Fecha de validación (ISO YYYY-MM-DD).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha de creación.
 * @property {Date} fechaActualizacion - Fecha de última modificación.
 */
export interface IResultadoIndicador {
    // --- Identificación ---
    id: string;
    empresaId: string;
    indicadorId: string;

    // --- Periodo y valor ---
    periodo: string;
    valor: number;
    metaPeriodo: number;
    porcentajeCumplimiento: number;

    // --- Semáforo y alertas ---
    semaforo: NivelSemaforo;
    alertaGenerada: boolean;
    planAccionId: string | null;

    // --- Datos de captura ---
    evidencias: string[];
    observaciones: string | null;
    validado: boolean;
    validadoPor: string | null;
    fechaValidacion: string | null;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}