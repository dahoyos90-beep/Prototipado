/**
 * src/interfaces/IIndicador.ts
 * 
 * Interfaz que define la estructura de los Indicadores del SG-SST en el
 * sistema. Corresponde al módulo M23 - Gestión de Indicadores
 * (CU38 al CU40).
 * 
 * Basado en:
 * - Decreto 1072 de 2015 (art. 2.2.4.6.19 — Ficha técnica obligatoria)
 * - Resolución 0312 de 2019 (indicadores mínimos obligatorios)
 * - NTC 3701 (índices de accidentalidad)
 * - NTC 3793 (ausentismo)
 * 
 * @version 2.0.1
 *  - Extendida con ficha técnica completa (7 campos obligatorios).
 *  - Agregados tipos: TipoIndicadorMinimo, NivelSemaforo, TipoMedida,
 *    TipoCalculoAutomatico, TipoTendencia, DestinatarioIndicador.
 *  - Corregido comentario "M11" → "M23".
 *  - Removidas IResultadoIndicador e ITendenciaIndicador (movidas a
 *    sus propios archivos IResultadoIndicador.ts e ITendenciaIndicador.ts).
 * 
 * @since 2026-08-31
 */

// ================================================================
// TIPOS EXISTENTES (se mantienen)
// ================================================================

/**
 * Clasificación de indicadores según el tipo de gestión.
 * - Estructura: Miden recursos, estructura organizacional y condiciones básicas.
 * - Proceso: Miden la ejecución de actividades y procedimientos.
 * - Resultado: Miden los resultados finales y el impacto en la gestión.
 */
export type ClasificacionIndicador = "Estructura" | "Proceso" | "Resultado";

/**
 * Tipo de dato esperado para el resultado del indicador.
 * - Porcentaje: Valor en porcentaje (ej. 85.5).
 * - Numero: Valor numérico absoluto (ej. 150).
 * - Tasa: Valor calculado como proporción (ej. 2.5 por cada 100 trabajadores).
 * - Indice: Valor calculado mediante índice estandarizado (IFAT, ISAT, etc.).
 * - Dias: Valor en días (ej. días perdidos por accidente).
 * - Booleano: Valor verdadero/falso (para indicadores de cumplimiento).
 */
export type TipoResultado =
    | "Porcentaje"
    | "Numero"
    | "Tasa"
    | "Indice"
    | "Dias"
    | "Booleano";

/**
 * Estado del indicador.
 * - Activo: Indicador en uso y habilitado para registro.
 * - Inactivo: Indicador deshabilitado (no se registran nuevos resultados).
 * - EnConfiguracion: Indicador en proceso de definición (no operativo).
 */
export type EstadoIndicador = "Activo" | "Inactivo" | "EnConfiguracion";

/**
 * Periodicidad de medición del indicador.
 * - Mensual: Se mide cada mes.
 * - Trimestral: Se mide cada 3 meses.
 * - Semestral: Se mide cada 6 meses.
 * - Anual: Se mide cada año.
 */
export type Periodicidad = "Mensual" | "Trimestral" | "Semestral" | "Anual";

// ================================================================
// TIPOS NUEVOS (M23)
// ================================================================

/**
 * Tipo de indicador mínimo obligatorio según Resolución 0312 de 2019.
 * - FrecuenciaAccidentalidad: Mide qué tan seguido ocurren los AT.
 * - SeveridadAccidentalidad: Mide el impacto/gravedad por días perdidos.
 * - ProporcionMortales: Porcentaje de accidentes mortales sobre el total.
 * - PrevalenciaEnfermedadLaboral: Casos totales (nuevos + antiguos) de EL.
 * - IncidenciaEnfermedadLaboral: Casos nuevos de EL en el periodo.
 * - AusentismoCausaMedica: Días perdidos por incapacidad médica.
 * - Personalizado: Indicador creado por el usuario.
 */
export type TipoIndicadorMinimo =
    | "FrecuenciaAccidentalidad"
    | "SeveridadAccidentalidad"
    | "ProporcionMortales"
    | "PrevalenciaEnfermedadLaboral"
    | "IncidenciaEnfermedadLaboral"
    | "AusentismoCausaMedica"
    | "Personalizado";

/**
 * Nivel de semáforo del indicador según su cumplimiento.
 * - Verde: Alcanza o supera la meta → mantener controles.
 * - Amarillo: Cerca del límite → monitoreo estrecho.
 * - Rojo: Fuera de meta → acción correctiva inmediata.
 */
export type NivelSemaforo = "Verde" | "Amarillo" | "Rojo";

/**
 * Tipo de medición del indicador.
 * - Formula: Se calcula con fórmula matemática.
 * - CumpleNoCumple: Se evalúa como binario (100% / 0%).
 * - Manual: Se ingresa el valor manualmente.
 */
export type TipoMedida = "Formula" | "CumpleNoCumple" | "Manual";

/**
 * Tipo de cálculo automático (si aplica).
 * - Manual: No se calcula automáticamente.
 * - IFAT: Índice de Frecuencia de Accidentes de Trabajo.
 * - ISAT: Índice de Severidad de Accidentes de Trabajo.
 * - ILIAT: Índice de Lesiones Incapacitantes.
 * - TasaLetalidad: Tasa de letalidad por accidente de trabajo.
 * - PrevalenciaEL: Prevalencia de Enfermedad Laboral.
 * - IncidenciaEL: Incidencia de Enfermedad Laboral.
 * - ALG: Ausentismo Laboral Global.
 * - CumplimientoPlan: Cumplimiento del plan de trabajo.
 * - CoberturaCapacitacion: Cobertura de capacitación.
 */
export type TipoCalculoAutomatico =
    | "Manual"
    | "IFAT"
    | "ISAT"
    | "ILIAT"
    | "TasaLetalidad"
    | "PrevalenciaEL"
    | "IncidenciaEL"
    | "ALG"
    | "CumplimientoPlan"
    | "CoberturaCapacitacion";

/**
 * Tipo de tendencia del indicador.
 * - Positiva: El indicador mejora respecto al periodo anterior.
 * - Negativa: El indicador empeora respecto al periodo anterior.
 * - Estable: El indicador no cambia significativamente.
 * - SinDatos: Aún no hay datos suficientes para calcular tendencia.
 */
export type TipoTendencia = "Positiva" | "Negativa" | "Estable" | "SinDatos";

/**
 * Destinatarios del reporte del indicador.
 * - AltaDireccion: Reporte a la Gerencia/Alta Dirección.
 * - Copasst: Reporte al Comité Paritario o Vigía.
 * - ARL: Reporte a la Administradora de Riesgos Laborales.
 * - MinisterioTrabajo: Reporte al Ministerio del Trabajo.
 * - Trabajadores: Información divulgada a los trabajadores.
 */
export type DestinatarioIndicador =
    | "AltaDireccion"
    | "Copasst"
    | "ARL"
    | "MinisterioTrabajo"
    | "Trabajadores";

// ================================================================
// INTERFAZ PRINCIPAL: IIndicador
// ================================================================

/**
 * Interfaz IIndicador
 * 
 * Define la estructura completa de un indicador configurado en el sistema.
 * Incluye la ficha técnica obligatoria según el Decreto 1072 de 2015
 * (art. 2.2.4.6.19), con sus 7 campos esenciales:
 *   1. Nombre del indicador
 *   2. Definición
 *   3. Interpretación
 *   4. Límite o valor esperado
 *   5. Método de cálculo (fórmula y variables)
 *   6. Fuente de información
 *   7. Periodicidad del reporte y responsables
 * 
 * --- Identificación ---
 * @property {string} id - Identificador único del indicador.
 * @property {string} empresaId - NIT de la empresa a la que pertenece.
 * @property {string} nombre - Nombre descriptivo del indicador.
 * @property {ClasificacionIndicador} clasificacion - Estructura/Proceso/Resultado.
 * @property {TipoIndicadorMinimo} tipoMinimo - Clasificación respecto a Res. 0312.
 * @property {boolean} esPredefinido - Indica si es un indicador mínimo del sistema.
 * 
 * --- Ficha técnica (7 campos Decreto 1072) ---
 * @property {string} definicion - Campo 2: Definición del indicador.
 * @property {string} interpretacion - Campo 3: Interpretación textual.
 * @property {string} limiteEsperado - Campo 4: Límite o valor esperado.
 * @property {string} formula - Campo 5: Fórmula matemática.
 * @property {string} fuenteInformacion - Campo 6: Fuente de los datos.
 * @property {string} responsables - Campo 7: Responsable de medición.
 * @property {Periodicidad} periodicidad - Campo 7: Periodicidad del reporte.
 * 
 * --- Configuración de cálculo ---
 * @property {TipoMedida} tipoMedida - Cómo se mide (Fórmula/Cumple/Manual).
 * @property {TipoCalculoAutomatico} tipoCalculo - Fórmula automática aplicada.
 * @property {number | null} constanteK - Constante K (200000/1000/100000).
 * @property {string[]} variablesFormula - Lista de variables usadas.
 * @property {TipoResultado} tipoResultado - Tipo de dato del resultado.
 * @property {string} unidadMedida - Unidad de medida (%, días, etc.).
 * @property {number} metaEsperada - Meta numérica esperada.
 * 
 * --- Semáforo (rangos de control) ---
 * @property {string} rangoVerde - Expresión del rango verde (ej. ">= 90").
 * @property {string} rangoAmarillo - Expresión del rango amarillo (ej. "75-89").
 * @property {string} rangoRojo - Expresión del rango rojo (ej. "< 75").
 * 
 * --- Reportes y estado ---
 * @property {DestinatarioIndicador[]} destinatarios - A quién se reporta.
 * @property {EstadoIndicador} estado - Estado actual.
 * @property {string} descripcion - Descripción general del indicador.
 * 
 * --- Metadatos ---
 * @property {Date} fechaCreacion - Fecha de creación.
 * @property {Date} fechaActualizacion - Fecha de última modificación.
 */
export interface IIndicador {
    // --- Identificación ---
    id: string;
    empresaId: string; // NIT de la empresa
    nombre: string;
    clasificacion: ClasificacionIndicador;
    tipoMinimo: TipoIndicadorMinimo;
    esPredefinido: boolean;

    // --- Ficha técnica (7 campos Decreto 1072) ---
    definicion: string;
    interpretacion: string;
    limiteEsperado: string;
    formula: string;
    fuenteInformacion: string;
    responsables: string;
    periodicidad: Periodicidad;

    // --- Configuración de cálculo ---
    tipoMedida: TipoMedida;
    tipoCalculo: TipoCalculoAutomatico;
    constanteK: number | null;
    variablesFormula: string[];
    tipoResultado: TipoResultado;
    unidadMedida: string;
    metaEsperada: number;

    // --- Semáforo (rangos de control) ---
    rangoVerde: string;
    rangoAmarillo: string;
    rangoRojo: string;

    // --- Reportes y estado ---
    destinatarios: DestinatarioIndicador[];
    estado: EstadoIndicador;
    descripcion: string;

    // --- Metadatos ---
    fechaCreacion: Date;
    fechaActualizacion: Date;
}