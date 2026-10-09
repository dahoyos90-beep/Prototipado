/**
 * src/interfaces/IInformeConvivencia.ts
 * 
 * Interfaz que define la estructura de un Informe de Gestión del Comité
 * de Convivencia Laboral (CCL). Corresponde al módulo M21 - Gestión del
 * Comité de Convivencia.
 * 
 * Existen DOS tipos de informes:
 *   1. Trimestral (interno) → dirigido a la Gerencia/Alta Dirección.
 *   2. Semestral (externo)  → radicado ante el Ministerio del Trabajo.
 * 
 * Fechas de radicación al Ministerio (Res. 3461 de 2025):
 *   - Primer semestre: antes del 31 de julio.
 *   - Segundo semestre: antes del 31 de enero del año siguiente.
 * 
 * Basado en:
 * - Resolución 3461 de 2025 (informes obligatorios)
 * - Ley 1010 de 2006 (registro estadístico)
 * 
 * @version 1.0.0
 * @since 2026-10-07
 */

// ================================================================
// TIPOS
// ================================================================

/**
 * Tipo de informe.
 * - Trimestral: Informe interno para la Alta Dirección.
 * - Semestral:  Informe externo para el Ministerio del Trabajo.
 */
export type TipoInformeConvivencia = "Trimestral" | "Semestral";

/**
 * Periodo del informe.
 * Para trimestrales: T1, T2, T3, T4.
 * Para semestrales: S1, S2.
 */
export type PeriodoInformeConvivencia = "T1" | "T2" | "T3" | "T4" | "S1" | "S2";

/**
 * Estado del informe.
 * - Borrador:   En construcción, no radicado.
 * - Radicado:   Ya enviado a la entidad correspondiente.
 * - Archivado:  Guardado como histórico.
 */
export type EstadoInformeConvivencia = "Borrador" | "Radicado" | "Archivado";

// ================================================================
// SUB-INTERFACES
// ================================================================

/**
 * Interfaz IIndicadoresConvivencia
 * 
 * Indicadores de gestión del comité durante el periodo del informe.
 * 
 * Fórmulas (Info 21):
 *   - Cobertura Reuniones (%):   reunionesRealizadas / 12 × 100
 *   - Eficacia Cierre Casos (%): quejasCerradas / quejasRecibidas × 100
 *   - Cumplimiento Prevención (%): capacitacionesEjecutadas / capacitacionesPlanificadas × 100
 * 
 * @property {number} reunionesProgramadas - Reuniones planificadas en el periodo.
 * @property {number} reunionesRealizadas - Reuniones efectivamente realizadas.
 * @property {number} coberturaReuniones - % de cobertura.
 * @property {number} quejasRecibidas - Total de quejas recibidas.
 * @property {number} quejasCerradas - Total de quejas cerradas.
 * @property {number} eficaciaCierre - % de eficacia.
 * @property {number} capacitacionesPlanificadas - Actividades de prevención planificadas.
 * @property {number} capacitacionesEjecutadas - Actividades ejecutadas.
 * @property {number} cumplimientoPrevencion - % de cumplimiento.
 */
export interface IIndicadoresConvivencia {
    reunionesProgramadas: number;
    reunionesRealizadas: number;
    coberturaReuniones: number;

    quejasRecibidas: number;
    quejasCerradas: number;
    eficaciaCierre: number;

    capacitacionesPlanificadas: number;
    capacitacionesEjecutadas: number;
    cumplimientoPrevencion: number;
}

// ================================================================
// INTERFAZ PRINCIPAL: IInformeConvivencia
// ================================================================

/**
 * Interfaz IInformeConvivencia
 * 
 * Define la estructura de un informe de gestión del Comité de Convivencia.
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del informe.
 * @property {string} empresaId - NIT de la empresa.
 * @property {string} comiteId - ID del comité.
 * @property {TipoInformeConvivencia} tipo - Trimestral o Semestral.
 * @property {PeriodoInformeConvivencia} periodo - T1/T2/T3/T4 o S1/S2.
 * @property {number} año - Año del informe (ej. 2026).
 * 
 * --- Contenido estadístico ---
 * @property {number} quejasRecibidas - Total de quejas del periodo.
 * @property {number} quejasAcosoLaboral - Quejas por acoso laboral.
 * @property {number} quejasAcosoSexual - Quejas por acoso sexual.
 * @property {number} quejasConflictoConvivencia - Quejas por conflicto de convivencia.
 * @property {number} casosCerradosConAcuerdo - Casos cerrados con acuerdo.
 * @property {number} casosCerradosSinAcuerdo - Casos cerrados sin acuerdo.
 * @property {number} casosTrasladados - Casos trasladados a instancias externas.
 * @property {number} casosEnTramite - Casos aún en trámite al cierre del periodo.
 * 
 * --- Actividades preventivas ---
 * @property {number} capacitacionesRealizadas - Número de capacitaciones.
 * @property {string[]} temasCapacitacion - Temas tratados en capacitaciones.
 * @property {string} actividadesPreventivas - Descripción de otras actividades.
 * 
 * --- Indicadores ---
 * @property {IIndicadoresConvivencia} indicadores - Bloque de indicadores.
 * 
 * --- Estado y radicación ---
 * @property {EstadoInformeConvivencia} estado - Estado del informe.
 * @property {string | null} fechaRadicacion - Fecha de radicación (ISO YYYY-MM-DD).
 * @property {string | null} entidadReceptora - Entidad a la que se radicó.
 * @property {string | null} numeroRadicado - Número de radicado del envío.
 * @property {string} archivoPDF - Nombre del PDF del informe.
 * 
 * --- Observaciones ---
 * @property {string | null} observaciones - Observaciones adicionales.
 * @property {string} elaboradoPor - Nombre de quien elabora.
 * @property {string} aprobadoPor - Nombre de quien aprueba.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha y hora de registro.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IInformeConvivencia {
    // --- Identificación ---
    id: string;
    empresaId: string;
    comiteId: string;
    tipo: TipoInformeConvivencia;
    periodo: PeriodoInformeConvivencia;
    año: number;

    // --- Contenido estadístico ---
    quejasRecibidas: number;
    quejasAcosoLaboral: number;
    quejasAcosoSexual: number;
    quejasConflictoConvivencia: number;
    casosCerradosConAcuerdo: number;
    casosCerradosSinAcuerdo: number;
    casosTrasladados: number;
    casosEnTramite: number;

    // --- Actividades preventivas ---
    capacitacionesRealizadas: number;
    temasCapacitacion: string[];
    actividadesPreventivas: string;

    // --- Indicadores ---
    indicadores: IIndicadoresConvivencia;

    // --- Estado y radicación ---
    estado: EstadoInformeConvivencia;
    fechaRadicacion: string | null;
    entidadReceptora: string | null;
    numeroRadicado: string | null;
    archivoPDF: string;

    // --- Observaciones ---
    observaciones: string | null;
    elaboradoPor: string;
    aprobadoPor: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}