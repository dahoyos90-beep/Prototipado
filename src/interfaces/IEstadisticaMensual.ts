/**
 * src/interfaces/IEstadisticaMensual.ts
 * 
 * Interfaz que define la estructura del Cierre Mensual de Ausentismo.
 * Corresponde al módulo M24 - Gestión de Ausentismo.
 * 
 * Un cierre mensual guarda TODOS los totales calculados a partir de los
 * eventos del mes, organizados en:
 *   1. Módulo de días por concepto (11 conceptos: EG, AT, LM, LP, LL, LAC,
 *      VAC, DP, VM, ES, CD — LNR no aplica en días).
 *   2. Bloque "Ausentismo por Ley" (9 conceptos): horas, días, DHM, días
 *      trabajados, % días trabajados, % ausentismo.
 *   3. Bloque "Ausentismo por Causa Médica" (5 conceptos: EG, AT, EL, LM, LP):
 *      SOLO estos cuentan para el indicador legal obligatorio de la
 *      Resolución 0312 de 2019.
 *   4. Bloque "Permiso Laboral" (4 conceptos): mismos indicadores.
 *   5. Parámetros del mes (periodo, días del mes, # empleados, jornada).
 *   6. Firma (observaciones, elaborado por).
 * 
 * Estado del cierre:
 *   - Borrador: todavía se están registrando eventos. Se recalcula.
 *   - Cerrado: se congeló y se envió a M23 (Indicadores).
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (SG-SST)
 * - NTC 3793 (ausentismo laboral)
 * - Resolución 0312 de 2019 (indicador de Ausentismo por Causa Médica)
 * 
 * @version 1.1.0 (agregado bloqueCausaMedica — solo EG, AT, EL, LM, LP)
 * @since 2026-10-08
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

import type { IParametrosMes } from './IParametrosMes.js';
import type {
    CodigoAusentismoLey,
    CodigoPermisoLaboral
} from './IEventoAusentismo.js';

// ================================================================
// TIPOS AUXILIARES
// ================================================================

/**
 * Estado del cierre mensual.
 * - Borrador: se siguen registrando/modificando eventos.
 * - Cerrado:  se congeló y se envió a M23.
 */
export type EstadoCierreMensual = 'Borrador' | 'Cerrado';

/**
 * Conceptos que se calculan en el módulo de días.
 * Incluye los 9 de Ley + los 4 de Permisos, MENOS 'LNR' (no aplica en días).
 */
export type CodigoConceptoDias =
    | 'EG' | 'AT' | 'EL' | 'LM' | 'LP' | 'LL' | 'LAC' | 'VAC'
    | 'DP' | 'VM' | 'ES' | 'CD';

/**
 * Diccionario de días por concepto (12 conceptos).
 */
export type DiasPorConcepto = Record<CodigoConceptoDias, number>;

/**
 * Conceptos que conforman el "Ausentismo por Causa Médica" según la
 * Resolución 0312 de 2019. SOLO estos conceptos cuentan para el indicador
 * legal obligatorio "Ausentismo por Causa Médica".
 * 
 * Los demás conceptos de "Ausentismo por Ley" (LL, LAC, VAC, LNR) son
 * licencias legales pero NO son causas médicas.
 */
export type CodigoAusentismoMedico = 'EG' | 'AT' | 'EL' | 'LM' | 'LP';

/**
 * Bloque de indicadores de un grupo de conceptos
 * (aplica a "Por Ley", "Causa Médica" y "Permisos").
 * 
 * @property {number} totalHoras - Suma de horas de los conceptos del grupo.
 * @property {number} totalDias - Conversión de horas a días (totalHoras ÷ jornadaDiaria).
 * @property {number} diasHombreMes - DHM = numEmpleados × diasMes.
 * @property {number} diasTrabajados - DHM − totalDias.
 * @property {number} porcentajeDiasTrabajados - (diasTrabajados ÷ DHM) × 100.
 * @property {number} porcentajeAusentismo - (totalDias ÷ DHM) × 100.
 */
export interface IBloqueIndicadores {
    totalHoras: number;
    totalDias: number;
    diasHombreMes: number;
    diasTrabajados: number;
    porcentajeDiasTrabajados: number;
    porcentajeAusentismo: number;
}

// ================================================================
// INTERFAZ PRINCIPAL: IEstadisticaMensual
// ================================================================

/**
 * Interfaz IEstadisticaMensual
 * 
 * Define la estructura completa del cierre mensual de ausentismo.
 * Cumple con `IStorable` (tiene `id: string`).
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del cierre (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece.
 * @property {string} periodo - Periodo en formato "YYYY-MM" (ej. "2026-09").
 * 
 * --- Parámetros del mes ---
 * @property {IParametrosMes} parametros - Copia de los parámetros del mes usados para el cálculo.
 * 
 * --- Módulo de días por concepto ---
 * @property {DiasPorConcepto} diasPorConcepto - Días calculados por cada uno de los 12 conceptos.
 * 
 * --- Bloque "Ausentismo por Ley" (informativo, 9 conceptos) ---
 * @property {IBloqueIndicadores} bloqueLey - Indicadores del grupo de 9 conceptos de Ley.
 * @property {Record<CodigoAusentismoLey, number>} horasLey - Horas por cada concepto de Ley.
 * 
 * --- Bloque "Ausentismo por Causa Médica" (indicador legal Res. 0312, 5 conceptos) ---
 * @property {IBloqueIndicadores} bloqueCausaMedica - Indicadores SOLO de EG, AT, EL, LM, LP.
 * @property {Record<CodigoAusentismoMedico, number>} horasCausaMedica - Horas por cada concepto médico.
 * 
 * --- Bloque "Permiso Laboral" (4 conceptos) ---
 * @property {IBloqueIndicadores} bloquePermisos - Indicadores del grupo de 4 conceptos de Permisos.
 * @property {Record<CodigoPermisoLaboral, number>} horasPermisos - Horas por cada concepto de Permiso.
 * 
 * --- Firma y observaciones ---
 * @property {string | null} observaciones - Observaciones generales del mes (puede ser null).
 * @property {string} elaboradoPor - Nombre del responsable que elaboró el cierre.
 * 
 * --- Estado del cierre ---
 * @property {EstadoCierreMensual} estado - Borrador o Cerrado.
 * @property {string | null} fechaCierre - Fecha de cierre (ISO YYYY-MM-DD, null si está en borrador).
 * 
 * --- Sincronización con M23 ---
 * @property {boolean} enviadoAM23 - Indica si el cierre ya se envió al módulo de indicadores.
 * @property {string | null} fechaEnvioM23 - Fecha del último envío a M23 (ISO YYYY-MM-DD, null si no se ha enviado).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de creación.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IEstadisticaMensual {
    // --- Identificación ---
    id: string;
    empresaId: string;
    periodo: string; // "YYYY-MM"

    // --- Parámetros del mes ---
    parametros: IParametrosMes;

    // --- Módulo de días por concepto ---
    diasPorConcepto: DiasPorConcepto;

    // --- Bloque "Ausentismo por Ley" (9 conceptos, informativo) ---
    bloqueLey: IBloqueIndicadores;
    horasLey: Record<CodigoAusentismoLey, number>;

    // --- Bloque "Ausentismo por Causa Médica" (5 conceptos, indicador legal) ---
    bloqueCausaMedica: IBloqueIndicadores;
    horasCausaMedica: Record<CodigoAusentismoMedico, number>;

    // --- Bloque "Permiso Laboral" (4 conceptos) ---
    bloquePermisos: IBloqueIndicadores;
    horasPermisos: Record<CodigoPermisoLaboral, number>;

    // --- Firma y observaciones ---
    observaciones: string | null;
    elaboradoPor: string;

    // --- Estado del cierre ---
    estado: EstadoCierreMensual;
    fechaCierre: string | null;

    // --- Sincronización con M23 ---
    enviadoAM23: boolean;
    fechaEnvioM23: string | null;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}