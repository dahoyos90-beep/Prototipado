/**
 * src/interfaces/IIndicador.ts
 * 
 * Interfaz que define la estructura de Indicadores en el sistema.
 * Corresponde al módulo M11 - Gestión de Indicadores (CU38 al CU40).
 * 
 * Propósito:
 * - Establecer el contrato de datos para la entidad Indicador.
 * - Permitir la configuración de indicadores (CU38),
 *   el registro de resultados (CU39) y la visualización de tendencias (CU40).
 * 
 * @version 1.1.0 (agregado empresaId a IIndicador e IResultadoIndicador)
 * @since 2026-08-31
 */

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
 * - Booleano: Valor verdadero/falso.
 */
export type TipoResultado = "Porcentaje" | "Numero" | "Tasa" | "Booleano";

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

/**
 * Interfaz IIndicador
 * 
 * Define la estructura completa de un indicador configurado en el sistema.
 * Todas las propiedades son obligatorias para garantizar la integridad de los datos.
 * 
 * @property {string} id - Identificador único del indicador (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el indicador.
 * @property {string} nombre - Nombre descriptivo del indicador (ej. "Índice de Frecuencia de Accidentes").
 * @property {ClasificacionIndicador} clasificacion - Clasificación según tipo de gestión (Estructura, Proceso, Resultado).
 * @property {string} formula - Fórmula matemática del indicador (ej. "(N° Accidentes / Horas Trabajadas) * 1000000").
 * @property {string} descripcion - Descripción detallada del indicador y su propósito.
 * @property {TipoResultado} tipoResultado - Tipo de dato esperado para el resultado.
 * @property {string} unidadMedida - Unidad de medida del resultado (ej. "%", "días", "eventos").
 * @property {number} metaEsperada - Meta anual o mensual esperada para el indicador.
 * @property {string} periodicidad - Periodicidad de medición (Mensual, Trimestral, Semestral, Anual).
 * @property {EstadoIndicador} estado - Estado del indicador.
 * @property {Date} fechaCreacion - Fecha y hora de registro del indicador.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IIndicador {
    id: string;
    empresaId: string; // NIT de la empresa
    nombre: string;
    clasificacion: ClasificacionIndicador;
    formula: string;
    descripcion: string;
    tipoResultado: TipoResultado;
    unidadMedida: string;
    metaEsperada: number;
    periodicidad: Periodicidad;
    estado: EstadoIndicador;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz IResultadoIndicador
 * 
 * Define la estructura de un resultado registrado para un indicador en un periodo específico.
 * Corresponde al CU39 - Registro de Resultados.
 * 
 * @property {string} id - Identificador único del resultado (generado por el sistema).
 * @property {string} empresaId - NIT de la empresa a la que pertenece el resultado.
 * @property {string} indicadorId - ID del indicador al que pertenece el resultado.
 * @property {string} periodo - Periodo del registro (ej. "2026-08" para agosto 2026, "2026-Q3" para trimestre 3).
 * @property {number} valor - Valor numérico obtenido para el resultado.
 * @property {number} metaPeriodo - Meta específica para el periodo (puede diferir de la meta anual).
 * @property {number} porcentajeCumplimiento - Porcentaje de cumplimiento calculado automáticamente.
 * @property {string | null} observaciones - Observaciones sobre el resultado (puede ser null).
 * @property {boolean} validado - Indica si el resultado ha sido validado por un profesional.
 * @property {Date} fechaCreacion - Fecha y hora de registro del resultado.
 * @property {Date} fechaActualizacion - Fecha y hora de la última modificación.
 */
export interface IResultadoIndicador {
    id: string;
    empresaId: string; // NIT de la empresa
    indicadorId: string;
    periodo: string;               // "YYYY-MM" o "YYYY-QN"
    valor: number;
    metaPeriodo: number;
    porcentajeCumplimiento: number; // 0-100
    observaciones: string | null;
    validado: boolean;
    fechaCreacion: Date;
    fechaActualizacion: Date;
}

/**
 * Interfaz ITendenciaIndicador
 * 
 * Representa los datos procesados para la visualización de tendencias (CU40).
 * Se genera a partir de los resultados históricos registrados.
 * 
 * @property {string} indicadorId - ID del indicador.
 * @property {string} nombreIndicador - Nombre del indicador (para mostrar en gráficos).
 * @property {Array<{periodo: string, valor: number, meta: number}>} datosHistoricos - Datos históricos para la tendencia.
 * @property {number} valorActual - Último valor registrado.
 * @property {number} metaActual - Meta para el periodo actual.
 * @property {number} variacionPorcentual - Variación porcentual con respecto al periodo anterior.
 * @property {string} estadoTendencia - "Positiva" | "Negativa" | "Estable" (indicador de dirección).
 * @property {Date} fechaActualizacion - Fecha de la última actualización de la tendencia.
 */
export interface ITendenciaIndicador {
    indicadorId: string;
    nombreIndicador: string;
    datosHistoricos: Array<{
        periodo: string;
        valor: number;
        meta: number;
    }>;
    valorActual: number;
    metaActual: number;
    variacionPorcentual: number;
    estadoTendencia: "Positiva" | "Negativa" | "Estable";
    fechaActualizacion: Date;
}