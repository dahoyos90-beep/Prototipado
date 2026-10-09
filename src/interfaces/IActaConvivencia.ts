/**
 * src/interfaces/IActaConvivencia.ts
 * 
 * Interfaz que define la estructura de un Acta de Reunión del Comité de
 * Convivencia Laboral (CCL). Corresponde al módulo M21 - Gestión del
 * Comité de Convivencia.
 * 
 * Incluye restricciones de acceso para proteger la información sensible
 * (Ley 1010 de 2006, art. 2 — Deber de Reserva).
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (reuniones mensuales)
 * - Ley 1010 de 2006 (reserva y confidencialidad)
 * - Ley 2365 de 2024 (protección ASL)
 * 
 * @version 2.0.0 (separada de IConvivencia.ts; extendida con campos del
 *                  acta: número, hora inicio/cierre, lugar, orden del día,
 *                  desarrollo, compromisos)
 * @since 2026-08-31
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Tipo de reunión del comité.
 * - Ordinaria:      Reunión mensual programada.
 * - Extraordinaria: Reunión convocada por urgencia.
 */
export type TipoReunionConvivencia = "Ordinaria" | "Extraordinaria";

// ================================================================
// INTERFAZ PRINCIPAL: IActaConvivencia
// ================================================================

/**
 * Interfaz IActaConvivencia
 * 
 * Define la estructura de un acta de reunión del Comité de Convivencia.
 * Incluye restricciones de acceso para proteger la información sensible.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del acta.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {number} numeroActa - Número consecutivo del acta.
 * 
 * --- Datos de la reunión ---
 * @property {string} fechaReunion - Fecha de la reunión (ISO YYYY-MM-DD).
 * @property {string} horaInicio - Hora de inicio (HH:MM).
 * @property {string} horaCierre - Hora de cierre (HH:MM).
 * @property {TipoReunionConvivencia} tipoReunion - Ordinaria o Extraordinaria.
 * @property {string} lugar - Lugar de la reunión.
 * 
 * --- Quórum y asistentes ---
 * @property {string[]} asistentes - Nombres/IDs de los asistentes.
 * @property {string[]} ausentes - Nombres/IDs de los ausentes.
 * @property {boolean} quorumValido - Indica si hubo quórum reglamentario.
 * 
 * --- Contenido ---
 * @property {string} ordenDelDia - Orden del día (texto libre).
 * @property {string} desarrollo - Desarrollo de los temas tratados.
 * @property {string} resumen - Resumen del contenido.
 * @property {string[]} compromisos - IDs de los compromisos asociados.
 * 
 * --- Documento y acceso ---
 * @property {string} archivoPDF - URL o nombre del archivo PDF del acta.
 * @property {string[]} permisosAcceso - Roles o usuarios autorizados.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IActaConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    numeroActa: number;

    // --- Datos de la reunión ---
    fechaReunion: string;
    horaInicio: string;
    horaCierre: string;
    tipoReunion: TipoReunionConvivencia;
    lugar: string;

    // --- Quórum y asistentes ---
    asistentes: string[];
    ausentes: string[];
    quorumValido: boolean;

    // --- Contenido ---
    ordenDelDia: string;
    desarrollo: string;
    resumen: string;
    compromisos: string[];

    // --- Documento y acceso ---
    archivoPDF: string;
    permisosAcceso: string[];

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}