/**
 * src/interfaces/IRiesgo.ts
 * 
 * Interfaz que define la estructura de un Riesgo en el sistema.
 * Corresponde al módulo M13 - Gestión de Matriz de Peligros y Riesgos (GTC 45).
 * Basado en la metodología GTC 45 para cálculo de niveles de riesgo.
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Riesgo.
 * - Permitir el registro de componentes de la matriz (CU22),
 *   el cálculo del nivel de riesgo (CU23), la definición de planes de intervención (CU24)
 *   y la priorización de riesgos críticos (CU25).
 * - Relacionar el riesgo con el reporte de encuesta de M12 (reporteId).
 * - Relacionar el riesgo con la matriz a la que pertenece (matrizId).
 * 
 * @version 1.4.0 (agregados 18 campos opcionales para el M13 - Matriz de Riesgos)
 * @since 2026-08-31
 */

/**
 * Niveles de Deficiencia (ND) según GTC 45 (Tabla 2).
 * - 10: Muy Alto (MA)
 * - 6: Alto (A)
 * - 2: Medio (M)
 * - Bajo (B): No se asigna valor (se clasifica directamente en nivel IV)
 */
export type NivelDeficiencia = 2 | 6 | 10;

/**
 * Niveles de Exposición (NE) según GTC 45 (Tabla 3).
 * - 4: Continua (EC)
 * - 3: Frecuente (EF)
 * - 2: Ocasional (EO)
 * - 1: Esporádica (EE)
 */
export type NivelExposicion = 1 | 2 | 3 | 4;

/**
 * Nivel de Probabilidad (NP = ND × NE) según GTC 45 (Tabla 4).
 * - 40, 30, 24: Muy Alto (MA)
 * - 20, 18, 12, 10: Alto (A)
 * - 8, 6: Medio (M)
 * - 4, 2: Bajo (B)
 */
export type NivelProbabilidad = 2 | 4 | 6 | 8 | 10 | 12 | 18 | 20 | 24 | 30 | 40;

/**
 * Nivel de Consecuencia (NC) según GTC 45 (Tabla 6).
 * - 100: Mortal o Catastrófico (M)
 * - 60: Muy Grave (MG)
 * - 25: Grave (G)
 * - 10: Leve (L)
 */
export type NivelConsecuencia = 10 | 25 | 60 | 100;

/**
 * Nivel de Riesgo (NR = NP × NC) según GTC 45 (Tabla 7).
 * Los valores van desde 20 (riesgo más bajo) hasta 4000 (riesgo más alto).
 * 
 * - I: 4000-600 (Situación crítica)
 * - II: 500-150 (Corregir)
 * - III: 120-40 (Mejorable)
 * - IV: 20 (Aceptable)
 */
export type NivelRiesgo =
    | 20
    | 40
    | 60
    | 80
    | 100
    | 120
    | 150
    | 200
    | 240
    | 250
    | 360
    | 400
    | 480
    | 500
    | 600
    | 800
    | 1000
    | 1200
    | 1440
    | 2000
    | 2400
    | 4000;

/**
 * Color asociado al Nivel de Riesgo según la interpretación GTC 45.
 * - Rojo: Riesgo extremadamente alto (I) - requiere acción inmediata.
 * - Naranja: Riesgo alto (II) - requiere acción prioritaria.
 * - Amarillo: Riesgo moderado (III) - requiere planificación de mejora.
 * - Verde: Riesgo bajo (IV) - aceptable, sin acción requerida.
 */
export type ColorRiesgo = "Rojo" | "Naranja" | "Amarillo" | "Verde";

/**
 * Jerarquía de control para la intervención de riesgos.
 * - Eliminación: Eliminar el peligro completamente.
 * - Sustitución: Reemplazar el peligro por uno menos riesgoso.
 * - Ingeniería: Diseñar controles técnicos (ej. guardas, ventilación).
 * - Administrativo: Implementar procedimientos, capacitación, señalización.
 * - EPP: Uso de Equipos de Protección Personal.
 */
export type JerarquiaControl = "Eliminación" | "Sustitución" | "Ingeniería" | "Administrativo" | "EPP";

/**
 * Estado de un riesgo en la matriz.
 * - Activo: Riesgo validado y vigente en la matriz.
 * - EnIntervencion: Riesgo con plan de acción en curso.
 * - Controlado: Riesgo mitigado y aceptable.
 */
export type EstadoRiesgo = "Activo" | "EnIntervencion" | "Controlado";

/**
 * Tipo de actividad de la tarea evaluada (GTC 45).
 * - Rutinaria: Se realiza siempre en la jornada laboral.
 * - No Rutinaria: Se realiza de forma esporádica o eventual.
 * 
 * @since 1.4.0 (M13 - Matriz de Riesgos)
 */
export type TipoActividadMatriz = "Rutinaria" | "No Rutinaria";

/**
 * Indicador de si existe un requisito legal aplicable a la tarea evaluada.
 * 
 * @since 1.4.0 (M13 - Matriz de Riesgos)
 */
export type AspectosLegalesMatriz = "SI" | "NO";

/**
 * Interfaz IRiesgo
 * 
 * Define la estructura completa de un riesgo en la matriz de peligros y riesgos.
 * 
 * Los campos del núcleo (id, empresaId, matrizId, peligroId, reporteId, proceso,
 * zona, actividad, tarea, niveles, color, jerarquía, plan de intervención,
 * estado, fechas) son OBLIGATORIOS y son usados por todos los módulos.
 * 
 * Los campos adicionales (tipoActividad, descripcionPeligro, clasifPrincipal,
 * clasifEspecifica, efectosPosibles, controles, numExpuestos, medidas,
 * aspectosLegales, relación de requisitos, observación, evaluacionCompleta)
 * son OPCIONALES y son específicos del módulo M13 - Matriz de Riesgos.
 * 
 * @property {string} id - Identificador único del riesgo (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el riesgo.
 * @property {string} matrizId - ID de la matriz a la que pertenece este riesgo (referencia a IMatriz.id).
 * @property {string} peligroId - Identificador del peligro asociado (referencia a IPeligro.id).
 * @property {string | null} reporteId - Identificador del reporte de encuesta (IReportePeligro.id) que originó este riesgo (null si no viene de un reporte).
 * @property {string} proceso - Proceso organizacional donde se identifica el riesgo.
 * @property {string} zona - Zona o área específica donde se presenta.
 * @property {string} actividad - Actividad o tarea realizada.
 * @property {string} tarea - Tarea específica dentro de la actividad.
 * @property {NivelDeficiencia} nivelDeficiencia - Nivel de deficiencia (ND) evaluado.
 * @property {NivelExposicion} nivelExposicion - Nivel de exposición (NE) evaluado.
 * @property {NivelProbabilidad} nivelProbabilidad - Nivel de probabilidad calculado (NP = ND × NE).
 * @property {NivelConsecuencia} nivelConsecuencia - Nivel de consecuencia (NC) evaluado.
 * @property {NivelRiesgo} nivelRiesgo - Nivel de riesgo calculado (NR = NP × NC).
 * @property {ColorRiesgo} color - Color interpretativo del nivel de riesgo.
 * @property {JerarquiaControl | null} jerarquiaControl - Jerarquía de control seleccionada para la intervención (puede ser null si no se ha definido).
 * @property {string | null} planIntervencion - Descripción del plan de intervención (puede ser null).
 * @property {string | null} responsableIntervencion - Persona responsable de ejecutar el plan (puede ser null).
 * @property {string | null} fechaLimiteIntervencion - Fecha límite para la intervención (formato ISO YYYY-MM-DD, puede ser null).
 * @property {EstadoRiesgo} estado - Estado del riesgo (Activo/EnIntervencion/Controlado).
 * @property {Date} fechaCreacion - Fecha y hora de registro del riesgo.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 * 
 * @property {TipoActividadMatriz} [tipoActividad] - Indica si la tarea es rutinaria o no rutinaria (M13).
 * @property {string} [descripcionPeligro] - Descripción textual del peligro identificado (M13).
 * @property {string} [clasifPrincipal] - Clasificación principal del peligro según Anexo A GTC 45 (ej. Biológico, Físico) (M13).
 * @property {string} [clasifEspecifica] - Clasificación específica del peligro según Anexo A GTC 45 (ej. Virus, Ruido) (M13).
 * @property {string} [efectosPosibles] - Descripción de los efectos posibles en la salud o seguridad del trabajador (M13).
 * @property {string} [controlFuente] - Control existente en la fuente del peligro (M13).
 * @property {string} [controlMedio] - Control existente en el medio de propagación del peligro (M13).
 * @property {string} [controlTrabajador] - Control existente en el trabajador (EPP, capacitación) (M13).
 * @property {number} [numExpuestos] - Número de trabajadores expuestos al riesgo (M13).
 * @property {string} [medEliminacion] - Medida de intervención: eliminación del peligro (M13).
 * @property {string} [medSustitucion] - Medida de intervención: sustitución del peligro (M13).
 * @property {string} [medIngenieria] - Medida de intervención: controles de ingeniería (M13).
 * @property {string} [medAdministrativos] - Medida de intervención: controles administrativos (M13).
 * @property {string} [medEpp] - Medida de intervención: elementos de protección personal (M13).
 * @property {AspectosLegalesMatriz} [aspectosLegales] - Indica si existen requisitos legales aplicables a la tarea (M13).
 * @property {string} [relacionRequisitos] - Descripción de los requisitos legales aplicables (M13).
 * @property {string} [observacion] - Observaciones adicionales sobre el riesgo (M13).
 * @property {boolean} [evaluacionCompleta] - Indica si el profesional ya completó ND, NE y NC (M13).
 */
export interface IRiesgo {
    // ============================================================
    // NÚCLEO (obligatorios — usados por todos los módulos)
    // ============================================================
    id: string;
    empresaId: string; // NIT de la empresa
    matrizId: string; // ID de la matriz a la que pertenece este riesgo
    peligroId: string;
    reporteId: string | null; // ID del reporte de encuesta (M12) que originó este riesgo
    proceso: string;
    zona: string;
    actividad: string;
    tarea: string;
    nivelDeficiencia: NivelDeficiencia;
    nivelExposicion: NivelExposicion;
    nivelProbabilidad: NivelProbabilidad;
    nivelConsecuencia: NivelConsecuencia;
    nivelRiesgo: NivelRiesgo;
    color: ColorRiesgo;
    jerarquiaControl: JerarquiaControl | null;
    planIntervencion: string | null;
    responsableIntervencion: string | null;
    fechaLimiteIntervencion: string | null; // ISO YYYY-MM-DD
    estado: EstadoRiesgo;
    fechaCreacion: Date;
    fechaActualizacion: Date;

    // ============================================================
    // CAMPOS ESPECÍFICOS DEL M13 - MATRIZ DE RIESGOS (opcionales)
    // Agregados en v1.4.0 sin romper la compatibilidad con M12 y otros.
    // ============================================================

    /** Indica si la tarea es rutinaria o no rutinaria (M13). */
    tipoActividad?: TipoActividadMatriz;

    /** Descripción textual del peligro identificado (M13). */
    descripcionPeligro?: string;

    /** Clasificación principal del peligro según Anexo A GTC 45 (M13). */
    clasifPrincipal?: string;

    /** Clasificación específica del peligro según Anexo A GTC 45 (M13). */
    clasifEspecifica?: string;

    /** Descripción de los efectos posibles en la salud o seguridad del trabajador (M13). */
    efectosPosibles?: string;

    /** Control existente en la fuente del peligro (M13). */
    controlFuente?: string;

    /** Control existente en el medio de propagación del peligro (M13). */
    controlMedio?: string;

    /** Control existente en el trabajador: EPP, capacitación, etc. (M13). */
    controlTrabajador?: string;

    /** Número de trabajadores expuestos al riesgo (M13). */
    numExpuestos?: number;

    /** Medida de intervención: eliminación del peligro (M13). */
    medEliminacion?: string;

    /** Medida de intervención: sustitución del peligro (M13). */
    medSustitucion?: string;

    /** Medida de intervención: controles de ingeniería (M13). */
    medIngenieria?: string;

    /** Medida de intervención: controles administrativos (M13). */
    medAdministrativos?: string;

    /** Medida de intervención: elementos de protección personal (M13). */
    medEpp?: string;

    /** Indica si existen requisitos legales aplicables a la tarea (M13). */
    aspectosLegales?: AspectosLegalesMatriz;

    /** Descripción de los requisitos legales aplicables (M13). */
    relacionRequisitos?: string;

    /** Observaciones adicionales sobre el riesgo (M13). */
    observacion?: string;

    /** Indica si el profesional ya completó ND, NE y NC (M13). */
    evaluacionCompleta?: boolean;
}