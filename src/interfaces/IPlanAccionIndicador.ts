/**
 * src/interfaces/IPlanAccionIndicador.ts
 * 
 * Interfaz que define la estructura de un Plan de Acción asociado a un
 * Indicador del SG-SST cuando este cae en estado crítico (Rojo) o de
 * alerta (Amarillo). Corresponde al módulo M23 - Gestión de Indicadores.
 * 
 * Un plan de acción se abre automáticamente cuando:
 *   - Un indicador cae en Rojo (incumplimiento crítico).
 *   - Un indicador cae en Amarillo y persiste por 2+ periodos.
 * 
 * El plan sigue el ciclo PHVA:
 *   - Planear: Definir acciones.
 *   - Hacer: Ejecutar acciones.
 *   - Verificar: Seguimiento.
 *   - Actuar: Cierre o replanificación.
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (acciones correctivas y preventivas)
 * - Resolución 0312 de 2019 (mejora continua)
 * - Ciclo PHVA (Info 3 y 7)
 * 
 * @version 1.0.0
 * @since 2026-10-08
 */

import type { NivelSemaforo } from './IIndicador.js';

// ================================================================
// TIPOS
// ================================================================

/**
 * Estado del plan de acción.
 * - Abierto: Plan creado y en definición de acciones.
 * - EnEjecucion: Acciones en curso.
 * - EnVerificacion: Acciones ejecutadas, en fase de verificación.
 * - Cerrado: Plan cerrado exitosamente (indicador volvió a meta).
 * - Cancelado: Plan cancelado sin éxito.
 */
export type EstadoPlanAccion =
    | "Abierto"
    | "EnEjecucion"
    | "EnVerificacion"
    | "Cerrado"
    | "Cancelado";

/**
 * Tipo de acción según el enfoque del ciclo PHVA.
 * - Correctiva: Corrige la no conformidad detectada.
 * - Preventiva: Previene una posible no conformidad.
 * - Mejora: Optimiza procesos ya conformes.
 */
export type TipoAccionPlan = "Correctiva" | "Preventiva" | "Mejora";

/**
 * Estado de una acción individual dentro del plan.
 * - Pendiente: Aún no se inicia.
 * - EnProgreso: En ejecución.
 * - Completada: Finalizada exitosamente.
 * - Atrasada: Fuera de la fecha límite.
 * - Cancelada: Cancelada sin ejecutar.
 */
export type EstadoAccionPlan =
    | "Pendiente"
    | "EnProgreso"
    | "Completada"
    | "Atrasada"
    | "Cancelada";

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz IAccionPlan
 * 
 * Representa una acción individual dentro del plan de acción.
 * 
 * @property {string} id - Identificador único de la acción.
 * @property {string} descripcion - Descripción de la acción a ejecutar.
 * @property {TipoAccionPlan} tipo - Correctiva / Preventiva / Mejora.
 * @property {string} responsable - Nombre o ID del responsable.
 * @property {string} areaResponsable - Área o departamento responsable.
 * @property {string} fechaInicio - Fecha de inicio (ISO YYYY-MM-DD).
 * @property {string} fechaLimite - Fecha límite (ISO YYYY-MM-DD).
 * @property {string | null} fechaCierre - Fecha de cierre (ISO, null si no cerrada).
 * @property {EstadoAccionPlan} estado - Estado actual.
 * @property {number} avancePorcentaje - Avance (0-100).
 * @property {string[]} evidencias - Nombres de archivos de evidencia.
 * @property {string | null} observaciones - Observaciones.
 * @property {string} causaRaiz - Causa raíz identificada (5 Porqués, Ishikawa).
 */
export interface IAccionPlan {
    id: string;
    descripcion: string;
    tipo: TipoAccionPlan;
    responsable: string;
    areaResponsable: string;
    fechaInicio: string;
    fechaLimite: string;
    fechaCierre: string | null;
    estado: EstadoAccionPlan;
    avancePorcentaje: number;
    evidencias: string[];
    observaciones: string | null;
    causaRaiz: string;
}

/**
 * Interfaz ISeguimientoPlanAccion
 * 
 * Representa un seguimiento periódico del plan de acción.
 * 
 * @property {string} id - Identificador único del seguimiento.
 * @property {string} fecha - Fecha del seguimiento (ISO YYYY-MM-DD).
 * @property {string} responsable - Nombre o ID de quien hizo el seguimiento.
 * @property {number} avanceGeneral - Avance general del plan (0-100).
 * @property {string} observaciones - Observaciones del seguimiento.
 * @property {boolean} requiereAjuste - Indica si se requiere replanificar.
 */
export interface ISeguimientoPlanAccion {
    id: string;
    fecha: string;
    responsable: string;
    avanceGeneral: number;
    observaciones: string;
    requiereAjuste: boolean;
}

// ================================================================
// INTERFAZ PRINCIPAL: IPlanAccionIndicador
// ================================================================

/**
 * Interfaz IPlanAccionIndicador
 * 
 * Define la estructura de un plan de acción asociado a un indicador.
 * Se crea cuando el indicador cae en Rojo (o Amarillo persistente).
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del plan.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} indicadorId - ID del indicador afectado.
 * @property {string} nombreIndicador - Nombre del indicador (para mostrar).
 * @property {string} resultadoId - ID del resultado que disparó el plan.
 * @property {string} periodo - Periodo en que se detectó la desviación.
 * 
 * --- Contexto del problema ---
 * @property {NivelSemaforo} semaforoDetectado - Semáforo en el momento de apertura.
 * @property {number} valorDetectado - Valor que disparó el plan.
 * @property {number} metaVigente - Meta vigente al momento del problema.
 * @property {string} descripcionProblema - Descripción del problema detectado.
 * @property {string} analisisCausaRaiz - Análisis de causa raíz (5 Porqués, Ishikawa).
 * 
 * --- Plan ---
 * @property {string} objetivo - Objetivo del plan (qué se espera lograr).
 * @property {string} fechaApertura - Fecha de apertura (ISO YYYY-MM-DD).
 * @property {string} fechaCompromiso - Fecha compromiso de cierre (ISO YYYY-MM-DD).
 * @property {string | null} fechaCierreReal - Fecha real de cierre (ISO, null si abierto).
 * @property {IAccionPlan[]} acciones - Acciones del plan.
 * 
 * --- Seguimiento ---
 * @property {ISeguimientoPlanAccion[]} seguimientos - Lista de seguimientos.
 * @property {number} avanceGeneral - Avance global (0-100).
 * 
 * --- Responsables ---
 * @property {string} responsablePlan - Nombre o ID del responsable del plan.
 * @property {string} aprobadoPor - Nombre o ID de quien aprobó el plan.
 * 
 * --- Estado ---
 * @property {EstadoPlanAccion} estado - Estado actual.
 * @property {boolean} efectivo - Indica si el plan fue efectivo (indicador volvió a meta).
 * @property {string | null} observaciones - Observaciones finales.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha de creación.
 * @property {Date} fechaActualizacion - Fecha de última modificación.
 */
export interface IPlanAccionIndicador {
    // --- Identificación ---
    id: string;
    empresaId: string;
    indicadorId: string;
    nombreIndicador: string;
    resultadoId: string;
    periodo: string;

    // --- Contexto del problema ---
    semaforoDetectado: NivelSemaforo;
    valorDetectado: number;
    metaVigente: number;
    descripcionProblema: string;
    analisisCausaRaiz: string;

    // --- Plan ---
    objetivo: string;
    fechaApertura: string;
    fechaCompromiso: string;
    fechaCierreReal: string | null;
    acciones: IAccionPlan[];

    // --- Seguimiento ---
    seguimientos: ISeguimientoPlanAccion[];
    avanceGeneral: number;

    // --- Responsables ---
    responsablePlan: string;
    aprobadoPor: string;

    // --- Estado ---
    estado: EstadoPlanAccion;
    efectivo: boolean;
    observaciones: string | null;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}