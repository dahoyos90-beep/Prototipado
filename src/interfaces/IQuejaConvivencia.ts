/**
 * src/interfaces/IQuejaConvivencia.ts
 * 
 * Interfaz que define la estructura de una Queja radicada en el Comité de
 * Convivencia Laboral (CCL). Corresponde al módulo M21 - Gestión del
 * Comité de Convivencia.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (trazabilidad de plazos legales)
 * - Ley 2365 de 2024 (Acoso Sexual Laboral — sin conciliación)
 * - Ley 1010 de 2006 (Acoso Laboral general)
 * 
 * @version 2.0.0 (separada de IConvivencia.ts; extendida con ruta, plazos
 *                  legales, medidas de protección y datos del denunciado)
 * @since 2026-08-31
 */

import type { RutaQueja } from './IConvivencia.js';

// ================================================================
// TIPOS
// ================================================================

/**
 * Estado de una queja radicada en el Comité de Convivencia.
 * - Radicada:       Queja ingresada, pendiente de revisión.
 * - EnInvestigacion: Comité en proceso de investigación.
 * - Citacion:       Se han citado a las partes involucradas.
 * - EnConciliacion: Proceso de conciliación en curso.
 * - Cerrada:        Caso resuelto y cerrado.
 * - Trasladada:     Caso trasladado a entidad externa (Ministerio, Fiscalía).
 */
export type EstadoQueja =
    | "Radicada"
    | "EnInvestigacion"
    | "Citacion"
    | "EnConciliacion"
    | "Cerrada"
    | "Trasladada";

/**
 * Tipo de queja según la naturaleza del incidente.
 * - AcosoLaboral:   Acoso en el entorno laboral (Ley 1010 de 2006).
 * - Discriminacion: Discriminación por género, raza, religión, etc.
 * - Hostigamiento:  Hostigamiento o intimidación.
 * - Violencia:      Violencia física o verbal.
 * - AcosoSexual:    Acoso sexual laboral (Ley 2365 de 2024).
 * - Otro:           Cualquier otro tipo de queja.
 */
export type TipoQueja =
    | "AcosoLaboral"
    | "Discriminacion"
    | "Hostigamiento"
    | "Violencia"
    | "AcosoSexual"
    | "Otro";

// ================================================================
// INTERFAZ PRINCIPAL: IQuejaConvivencia
// ================================================================

/**
 * Interfaz IQuejaConvivencia
 * 
 * Define la estructura de una queja radicada en el Comité de Convivencia.
 * La queja puede ser anónima o con identificación del quejoso.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único de la queja.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité al que pertenece.
 * @property {string} numeroRadicado - Número de radicado (formato CCL-Q-XXX-YYYY).
 * 
 * --- Datos del quejoso ---
 * @property {boolean} esAnonimo - Indica si la queja es anónima.
 * @property {string | null} quejosoId - ID del usuario que radica la queja.
 * @property {string | null} quejosoNombre - Nombre del quejoso.
 * @property {string | null} quejosoCargo - Cargo del quejoso.
 * @property {string | null} quejosoArea - Área o departamento del quejoso.
 * @property {string | null} quejosoCorreo - Correo de contacto del quejoso.
 * @property {string | null} quejosoTelefono - Teléfono de contacto del quejoso.
 * 
 * --- Datos del denunciado ---
 * @property {string} denunciadoNombre - Nombre del presunto agresor.
 * @property {string} denunciadoCargo - Cargo del presunto agresor.
 * @property {string} denunciadoArea - Área del presunto agresor.
 * @property {string} relacionJerarquica - Relación jerárquica (Superior/Par/Subalterno).
 * 
 * --- Naturaleza del hecho ---
 * @property {TipoQueja} tipo - Tipo de queja.
 * @property {RutaQueja} ruta - Ruta del trámite (Laboral/Sexual/Convivencia).
 * @property {string} descripcion - Descripción detallada del incidente.
 * @property {string[]} evidencias - Nombres de archivos de pruebas aportadas.
 * 
 * --- Fechas del trámite (Resolución 3461 de 2025) ---
 * @property {string} fechaRadicacion - Fecha de radicación (ISO YYYY-MM-DD).
 * @property {string | null} fechaAcuseRecibo - Fecha de acuse de recibo (ISO).
 * @property {string | null} fechaExamenInicial - Fecha del examen inicial (ISO).
 * @property {string | null} fechaMedidasProteccion - Fecha de medidas de protección (ISO).
 * @property {string | null} fechaEntrevistas - Fecha de entrevistas individuales (ISO).
 * @property {string | null} fechaMesaDialogo - Fecha de mesa de diálogo (ISO).
 * @property {string | null} fechaCierre - Fecha de cierre de la queja (ISO).
 * @property {string | null} fechaTraslado - Fecha de traslado a instancia externa (ISO).
 * 
 * --- Gestión y resultado ---
 * @property {string[]} medidasProteccion - Descripciones de medidas aplicadas.
 * @property {string | null} casoId - ID del caso asociado.
 * @property {string[]} entrevistas - IDs de las actas de entrevista vinculadas.
 * @property {string | null} observaciones - Observaciones adicionales.
 * @property {EstadoQueja} estado - Estado actual de la queja.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IQuejaConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    numeroRadicado: string;

    // --- Datos del quejoso ---
    esAnonimo: boolean;
    quejosoId: string | null;
    quejosoNombre: string | null;
    quejosoCargo: string | null;
    quejosoArea: string | null;
    quejosoCorreo: string | null;
    quejosoTelefono: string | null;

    // --- Datos del denunciado ---
    denunciadoNombre: string;
    denunciadoCargo: string;
    denunciadoArea: string;
    relacionJerarquica: string;

    // --- Naturaleza del hecho ---
    tipo: TipoQueja;
    ruta: RutaQueja;
    descripcion: string;
    evidencias: string[];

    // --- Fechas del trámite (Res. 3461 de 2025) ---
    fechaRadicacion: string;
    fechaAcuseRecibo: string | null;
    fechaExamenInicial: string | null;
    fechaMedidasProteccion: string | null;
    fechaEntrevistas: string | null;
    fechaMesaDialogo: string | null;
    fechaCierre: string | null;
    fechaTraslado: string | null;

    // --- Gestión y resultado ---
    medidasProteccion: string[];
    casoId: string | null;
    entrevistas: string[];
    observaciones: string | null;
    estado: EstadoQueja;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}