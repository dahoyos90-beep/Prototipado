/**
 * src/interfaces/IConfiguracionSiniestralidad.ts
 * 
 * Interfaz que define la estructura de la Configuración Anual del módulo
 * M25 - Gestión de Siniestralidad.
 * 
 * Corresponde al encabezado del Excel "APLICATIVO ESTADISTICO DE
 * ACCIDENTALIDAD.xls" + parámetros de jornada laboral (Ley 2101 de 2021)
 * + metas anuales de indicadores para el semáforo.
 * 
 * Una configuración por empresa + año. Clave natural:
 *   `${empresaId}__${anio}`.
 * 
 * Basado en:
 * - Resolución 0312 de 2019 (estándares mínimos del SG-SST)
 * - NTC 3701 (constante K = 240.000)
 * - Ley 2101 de 2021 (jornada de 42 a 48 horas semanales)
 * - Decreto 1072 de 2015 (evaluación de indicadores)
 * 
 * @version 1.0.0
 * @since 2026-10-09
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Tipo de jornada laboral de referencia para el cálculo de HHT.
 * 
 * - "48h":           Jornada clásica (48 horas semanales).
 * - "42h":           Jornada reducida (42 horas semanales, Ley 2101).
 * - "personalizada": El usuario define las horas semanales manualmente.
 */
export type JornadaReferencia = "48h" | "42h" | "personalizada";

/**
 * Metas anuales de los indicadores de accidentalidad.
 * Se usan para el semáforo de la sub-pestaña "Estadísticas".
 * 
 * Cada meta puede ser `null` si no está definida; en ese caso el indicador
 * se muestra con semáforo neutro ("—").
 */
export interface IMetasSiniestralidad {
    /** Índice de Frecuencia (IF). Ejemplo: 2.0. */
    metaIF: number | null;
    /** Índice de Frecuencia con Incapacidad (IF_inc). */
    metaIFInc: number | null;
    /** Índice de Severidad (IS). Ejemplo: 15.0. */
    metaIS: number | null;
    /** Índice de Lesiones Incapacitantes (ILI). Ejemplo: 3.0. */
    metaILI: number | null;
    /** Porcentaje de cumplimiento de investigaciones (0-100). */
    metaPorcentajeInvestigaciones: number | null;
    /** Proporción de accidentes mortales (0-100). Meta típica: 0. */
    metaProporcionMortales: number | null;
}

// ================================================================
// INTERFAZ PRINCIPAL: IConfiguracionSiniestralidad
// ================================================================

/**
 * Interfaz IConfiguracionSiniestralidad
 * 
 * Define la configuración anual del módulo M25.
 * 
 * --- Identificación ---
 * @property {string} id         - ID único de la configuración.
 * @property {string} empresaId  - NIT de la empresa activa.
 * @property {string} anio       - Año de vigencia (YYYY).
 * 
 * --- Encabezado tipo Excel ---
 * @property {string} razonSocial      - Razón social de la empresa (desnormalizado para el reporte).
 * @property {string} nit              - NIT con formato (desnormalizado para el reporte).
 * @property {string} sedeObraProceso  - Sede, obra o proceso (texto libre).
 * @property {string} responsableSST   - Nombre del responsable SST / SISO.
 * @property {string} version          - Versión del documento (ej. "1"). Opcional.
 * @property {string} vigenciaAnio     - Año de vigencia según encabezado (ej. "2026").
 * 
 * --- Parámetros de jornada ---
 * @property {JornadaReferencia} jornadaReferencia - Tipo de jornada seleccionada.
 * @property {number}              horasSemanales   - Horas por semana (42, 48 o personalizado).
 * @property {number}              horasMensuales   - Horas por mes (210, 240 o calculado).
 * @property {boolean}             hhtAutomatica    - ¿La HHT se calcula automáticamente (jornada × trabajadores)?
 * 
 * --- Constantes normativas ---
 * @property {number} constK     - Constante K (por defecto 240.000, NTC 3701).
 * @property {number} constKILI  - Constante divisor del ILI (por defecto 1.000).
 * 
 * --- Metas anuales ---
 * @property {IMetasSiniestralidad} metas - Metas para el semáforo de indicadores.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion      - Fecha y hora de creación.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IConfiguracionSiniestralidad {
    // --- Identificación ---
    id: string;
    empresaId: string;
    anio: string;

    // --- Encabezado tipo Excel ---
    razonSocial: string;
    nit: string;
    sedeObraProceso: string;
    responsableSST: string;
    version: string;
    vigenciaAnio: string;

    // --- Parámetros de jornada ---
    jornadaReferencia: JornadaReferencia;
    horasSemanales: number;
    horasMensuales: number;
    hhtAutomatica: boolean;

    // --- Constantes normativas ---
    constK: number;
    constKILI: number;

    // --- Metas anuales ---
    metas: IMetasSiniestralidad;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}