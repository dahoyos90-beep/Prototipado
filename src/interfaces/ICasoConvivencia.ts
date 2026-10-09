/**
 * src/interfaces/ICasoConvivencia.ts
 * 
 * Interfaz que define la estructura de un Caso asociado a una Queja en el
 * Comité de Convivencia Laboral (CCL). Corresponde al módulo M21 - Gestión
 * del Comité de Convivencia.
 * 
 * Representa el ciclo de vida completo de la queja: entrevistas individuales,
 * mesa de diálogo, plan de mejora, seguimientos, cierre o traslado.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (procedimiento interno)
 * - Ley 2365 de 2024 (Acoso Sexual Laboral — sin conciliación)
 * - Ley 1010 de 2006 (Acoso Laboral general)
 * 
 * @version 2.0.0 (separada de IConvivencia.ts; extendida con entrevistas,
 *                  plan de mejora, seguimientos, informe de recomendaciones
 *                  y datos de traslado)
 * @since 2026-08-31
 */

import type { EstadoQueja } from './IQuejaConvivencia.js';

// ================================================================
// TIPOS
// ================================================================

/**
 * Resultado del caso al momento del cierre.
 * - Acuerdo:              Se llegó a acuerdo y plan de mejora.
 * - SinAcuerdo:           No se logró acuerdo; se emite informe.
 * - TrasladoDisciplinario: Se trasladó a la vía disciplinaria interna.
 * - TrasladoPenal:        Se trasladó a la Fiscalía (Acoso Sexual).
 * - Desistimiento:        La parte quejosa desistió del trámite.
 */
export type ResultadoCaso =
    | "Acuerdo"
    | "SinAcuerdo"
    | "TrasladoDisciplinario"
    | "TrasladoPenal"
    | "Desistimiento";

/**
 * Estado de un seguimiento del plan de mejora.
 * - Pendiente:   Aún no se ha verificado.
 * - Cumplido:    Se verificó cumplimiento.
 * - Incumplido:  Se verificó incumplimiento.
 */
export type EstadoSeguimiento = "Pendiente" | "Cumplido" | "Incumplido";

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz ISeguimientoCaso
 * 
 * Registra cada verificación periódica del plan de mejora.
 * 
 * @property {string} id - Identificador único del seguimiento.
 * @property {string} fecha - Fecha de la verificación (ISO YYYY-MM-DD).
 * @property {string} responsable - Nombre del responsable de verificar.
 * @property {string} observaciones - Observaciones del seguimiento.
 * @property {EstadoSeguimiento} estado - Resultado del seguimiento.
 */
export interface ISeguimientoCaso {
    id: string;
    fecha: string;
    responsable: string;
    observaciones: string;
    estado: EstadoSeguimiento;
}

// ================================================================
// INTERFAZ PRINCIPAL: ICasoConvivencia
// ================================================================

/**
 * Interfaz ICasoConvivencia
 * 
 * Define la estructura de un caso asociado a una queja.
 * Representa el ciclo de vida completo: entrevistas, mesa de diálogo,
 * plan de mejora, seguimientos, cierre o traslado.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del caso.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité que gestiona el caso.
 * @property {string} quejaId - ID de la queja asociada.
 * 
 * --- Entrevistas individuales ---
 * @property {string[]} entrevistas - IDs de las actas de entrevista vinculadas.
 * @property {string | null} actaQuejoso - ID/nombre del acta de entrevista del quejoso.
 * @property {string | null} actaDenunciado - ID/nombre del acta de entrevista del denunciado.
 * @property {string[]} actasTestigos - IDs/nombres de actas de testigos.
 * 
 * --- Medidas de protección ---
 * @property {string[]} medidasProteccion - Descripciones de medidas aplicadas.
 * @property {string | null} fechaMedidasProteccion - Fecha de aplicación (ISO).
 * 
 * --- Mesa de diálogo y plan de mejora ---
 * @property {string | null} fechaMesaDialogo - Fecha de la mesa de diálogo (ISO).
 * @property {string | null} acuerdos - Descripción de los acuerdos logrados.
 * @property {string | null} planMejoraId - ID del plan de mejora asociado.
 * @property {string | null} actaCompromiso - URL o nombre del PDF del acta.
 * 
 * --- Seguimiento ---
 * @property {ISeguimientoCaso[]} seguimientos - Lista de verificaciones.
 * 
 * --- Traslado externo ---
 * @property {string | null} trasladoExterno - Descripción del traslado.
 * @property {string | null} fechaTraslado - Fecha del traslado (ISO).
 * @property {string | null} entidadReceptora - Entidad que recibió el caso.
 * 
 * --- Cierre ---
 * @property {ResultadoCaso | null} resultado - Resultado al cierre.
 * @property {string | null} informeRecomendaciones - Informe emitido (URL/nombre).
 * @property {string | null} actaCierre - Acta de cierre (URL/nombre).
 * @property {string | null} fechaCierre - Fecha de cierre (ISO YYYY-MM-DD).
 * @property {string | null} observaciones - Observaciones adicionales.
 * 
 * --- Estado ---
 * @property {EstadoQueja} estado - Estado actual (coincide con el de la queja).
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface ICasoConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    quejaId: string;

    // --- Entrevistas individuales ---
    entrevistas: string[];
    actaQuejoso: string | null;
    actaDenunciado: string | null;
    actasTestigos: string[];

    // --- Medidas de protección ---
    medidasProteccion: string[];
    fechaMedidasProteccion: string | null;

    // --- Mesa de diálogo y plan de mejora ---
    fechaMesaDialogo: string | null;
    acuerdos: string | null;
    planMejoraId: string | null;
    actaCompromiso: string | null;

    // --- Seguimiento ---
    seguimientos: ISeguimientoCaso[];

    // --- Traslado externo ---
    trasladoExterno: string | null;
    fechaTraslado: string | null;
    entidadReceptora: string | null;

    // --- Cierre ---
    resultado: ResultadoCaso | null;
    informeRecomendaciones: string | null;
    actaCierre: string | null;
    fechaCierre: string | null;
    observaciones: string | null;

    // --- Estado ---
    estado: EstadoQueja;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}