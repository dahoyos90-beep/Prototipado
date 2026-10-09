/**
 * src/interfaces/IAnalisisTrimestralSiniestralidad.ts
 * 
 * Interfaz que define la estructura del Análisis Trimestral del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * Corresponde al bloque "Análisis del Indicador" del Excel
 * "APLICATIVO ESTADISTICO DE ACCIDENTALIDAD.xls". Son 4 bloques de texto
 * libre donde el responsable SST redacta hallazgos, tendencias, planes
 * de acción y conclusiones por trimestre.
 * 
 * Una instancia por empresa + año + trimestre. Clave natural:
 *   `${empresaId}__${anio}__${trimestre}`.
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (evaluación cualitativa del SG-SST)
 * - Decreto 1072 de 2015 (evaluación y planes de acción)
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Número de trimestre (1-4).
 * 
 * - 1: Enero – Febrero – Marzo.
 * - 2: Abril – Mayo – Junio.
 * - 3: Julio – Agosto – Septiembre.
 * - 4: Octubre – Noviembre – Diciembre.
 */
export type NumeroTrimestre = 1 | 2 | 3 | 4;

/**
 * Meses que conforman cada trimestre.
 * Se usa para mostrar el subtítulo en la card (ej. "Enero – Marzo").
 */
export type MesesTrimestre =
    | "Enero – Febrero – Marzo"
    | "Abril – Mayo – Junio"
    | "Julio – Agosto – Septiembre"
    | "Octubre – Noviembre – Diciembre";

// ================================================================
// INTERFAZ PRINCIPAL: IAnalisisTrimestralSiniestralidad
// ================================================================

/**
 * Interfaz IAnalisisTrimestralSiniestralidad
 * 
 * Define el análisis cualitativo de un trimestre del módulo M25.
 * 
 * --- Identificación ---
 * @property {string}           id        - ID único del análisis.
 * @property {string}           empresaId - NIT de la empresa activa.
 * @property {string}           configId  - ID de la IConfiguracionSiniestralidad asociada.
 * @property {string}           anio      - Año del análisis (YYYY).
 * @property {NumeroTrimestre}  trimestre - Número de trimestre (1-4).
 * 
 * --- Contenido ---
 * @property {string} meses                  - Subtítulo del trimestre
 *                                             (ej. "Enero – Febrero – Marzo").
 * @property {string} texto                  - Texto libre con hallazgos, tendencias,
 *                                             desviaciones y conclusiones del trimestre.
 * @property {boolean} guardado             - Marca si el usuario ya guardó este análisis
 *                                             (permite discriminar borrador vs. definitivo).
 * 
 * --- Metadatos ---
 * @property {Date}   fechaCreacion      - Fecha y hora de creación.
 * @property {Date}   fechaActualizacion - Fecha y hora de la última modificación.
 * @property {string} actualizadoPor     - Nombre o ID del usuario que hizo el último cambio.
 */
export interface IAnalisisTrimestralSiniestralidad {
    // --- Identificación ---
    id: string;
    empresaId: string;
    configId: string;
    anio: string;
    trimestre: NumeroTrimestre;

    // --- Contenido ---
    meses: string;
    texto: string;
    guardado: boolean;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
    actualizadoPor: string;
}